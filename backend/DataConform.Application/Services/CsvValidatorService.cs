using System.Globalization;
using System.IO.Hashing;
using System.Text;
using System.Text.RegularExpressions;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class CsvValidatorService : ICsvValidatorService
{
    public const int MaxInMemoryIssues = 1000;

    private static readonly Regex EmailRegex = new Regex(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly string[] AcceptedDateFormats = new string[]
    {
        "yyyy-MM-dd",
        "dd/MM/yyyy",
        "yyyy/MM/dd",
        "dd-MM-yyyy",
        "yyyy-MM-ddTHH:mm:ss",
        "dd/MM/yyyy HH:mm:ss"
    };

    private static readonly HashSet<string> ValidBrazilianUfs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO", "EX"
    };

    private static readonly HashSet<string> SapB1DtwHeaderMarkers = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "RecordKey",
        "CardCode",
        "ItemCode",
        "BP Code",
        "Customer/Vendor Code",
        "Item No.",
        "Código do PN",
        "Código do Parceiro",
        "Codigo do Parceiro",
        "Nº do item",
        "Código do Item"
    };

    public static bool IsSapB1DtwSecondHeaderLine(string headerLine, string secondLine)
    {
        char delimiter = DetectDelimiter(headerLine);
        string[] headers = ParseCsvLine(headerLine, delimiter);
        string[] cells = ParseCsvLine(secondLine, delimiter);
        return IsSapB1DtwMetadataRow(headers, cells);
    }

    public async Task<FileValidationResult> ValidateCsvStreamAsync(
        Stream csvStream,
        Guid fileId,
        IReadOnlyCollection<string>? requiredColumns = null,
        CancellationToken cancellationToken = default)
    {
        FileValidationResult result = new FileValidationResult();
        HashSet<ulong> seenRowHashes = new HashSet<ulong>();

        using StreamReader reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 4096, leaveOpen: true);

        string? headerLine = await reader.ReadLineAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            AddIssue(result, new ValidationIssue
            {
                FileId = fileId,
                RowNumber = 1,
                IssueCode = "EMPTY_FILE",
                Message = "O arquivo enviado está vazio ou não contém cabeçalho.",
                Severity = IssueSeverity.Error
            });
            result.TotalRows = 0;
            result.ValidRows = 0;
            result.ErrorRows = 0;
            return result;
        }

        if (headerLine.Contains('\uFFFD'))
        {
            AddIssue(result, new ValidationIssue
            {
                FileId = fileId,
                RowNumber = 1,
                IssueCode = "ENCODING_CORRUPTION",
                Message = "Foram detectados caracteres inválidos de codificação no cabeçalho (converta a planilha para UTF-8).",
                Severity = IssueSeverity.Error,
                RawValue = headerLine.Length > 120 ? headerLine.Substring(0, 120) + "..." : headerLine
            });
        }

        char delimiter = DetectDelimiter(headerLine);
        string[] headers = ParseCsvLine(headerLine, delimiter);

        Dictionary<string, int> headerIndexMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        List<int> ufColumnIndices = new List<int>();

        for (int i = 0; i < headers.Length; i++)
        {
            string headerName = headers[i];
            if (string.IsNullOrWhiteSpace(headerName))
            {
                AddIssue(result, new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = 1,
                    ColumnName = $"Coluna {i + 1}",
                    IssueCode = "EMPTY_HEADER_NAME",
                    Message = $"A coluna {i + 1} possui cabeçalho em branco.",
                    Severity = IssueSeverity.Warning
                });
                continue;
            }

            if (!headerIndexMap.ContainsKey(headerName))
            {
                headerIndexMap.Add(headerName, i);
            }
            else
            {
                AddIssue(result, new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = 1,
                    ColumnName = headerName,
                    IssueCode = "DUPLICATE_HEADER",
                    Message = $"Cabeçalho duplicado: '{headerName}'.",
                    Severity = IssueSeverity.Error
                });
            }

            if (IsUfColumnName(headerName.ToLowerInvariant()))
            {
                ufColumnIndices.Add(i);
            }
        }

        if (requiredColumns != null)
        {
            foreach (string requiredColumn in requiredColumns)
            {
                if (!headerIndexMap.ContainsKey(requiredColumn))
                {
                    AddIssue(result, new ValidationIssue
                    {
                        FileId = fileId,
                        RowNumber = 1,
                        ColumnName = requiredColumn,
                        IssueCode = "REQUIRED_HEADER_MISSING",
                        Message = $"Coluna obrigatória '{requiredColumn}' ausente no arquivo.",
                        Severity = IssueSeverity.Error
                    });
                }
            }
        }

        ErpPrimaryKeySpec? primaryKeySpec = ResolveErpPrimaryKeySpec(headerIndexMap, headers);
        Dictionary<ulong, int> seenPrimaryKeys = new Dictionary<ulong, int>();

        int currentRowIndex = 1;
        int nonEmptyDataOrSubheaderIndex = 0;
        string? line;

        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            cancellationToken.ThrowIfCancellationRequested();
            currentRowIndex++;

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            nonEmptyDataOrSubheaderIndex++;
            string[] cells = ParseCsvLine(line, delimiter);

            // Suporte nativo ao cabeçalho duplo do SAP Business One DTW (linha 1 técnica + linha 2 descritiva)
            if (nonEmptyDataOrSubheaderIndex == 1 && IsSapB1DtwMetadataRow(headers, cells))
            {
                continue;
            }

            result.TotalRows++;
            bool rowHasError = false;

            if (line.Contains('\uFFFD'))
            {
                AddIssue(result, new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = currentRowIndex,
                    IssueCode = "ENCODING_CORRUPTION",
                    Message = "Foram detectados caracteres inválidos de codificação (converta a planilha para UTF-8).",
                    Severity = IssueSeverity.Error,
                    RawValue = line.Length > 120 ? line.Substring(0, 120) + "..." : line
                });
                rowHasError = true;
            }

            string normalizedLine = line.Trim();
            ulong rowHash = XxHash64.HashToUInt64(Encoding.UTF8.GetBytes(normalizedLine.ToUpperInvariant()));
            bool isExactDuplicateRow = !seenRowHashes.Add(rowHash);
            if (isExactDuplicateRow)
            {
                AddIssue(result, new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = currentRowIndex,
                    IssueCode = "DUPLICATE_ROW",
                    Message = "Registro duplicado idêntico a uma linha anterior no arquivo.",
                    Severity = IssueSeverity.Warning,
                    RawValue = normalizedLine.Length > 200 ? normalizedLine.Substring(0, 200) + "..." : normalizedLine
                });
                rowHasError = true;
            }

            if (primaryKeySpec != null && primaryKeySpec.PrimaryColumnIndex < cells.Length)
            {
                string primaryKeyPart = cells[primaryKeySpec.PrimaryColumnIndex].Trim();
                if (!string.IsNullOrWhiteSpace(primaryKeyPart))
                {
                    string compositeKey = BuildCompositePrimaryKey(primaryKeySpec, cells);
                    ulong compositeKeyHash = XxHash64.HashToUInt64(Encoding.UTF8.GetBytes(compositeKey.ToUpperInvariant()));

                    if (seenPrimaryKeys.TryGetValue(compositeKeyHash, out int firstSeenRow))
                    {
                        if (!isExactDuplicateRow)
                        {
                            AddIssue(result, new ValidationIssue
                            {
                                FileId = fileId,
                                RowNumber = currentRowIndex,
                                ColumnName = primaryKeySpec.DisplayColumnName,
                                IssueCode = "DUPLICATE_PRIMARY_KEY",
                                Message = $"Chave primária de ERP duplicada ('{compositeKey}') em '{primaryKeySpec.DisplayColumnName}' — já utilizada na linha #{firstSeenRow}.",
                                Severity = IssueSeverity.Error,
                                RawValue = compositeKey
                            });
                            rowHasError = true;
                        }
                    }
                    else
                    {
                        seenPrimaryKeys.Add(compositeKeyHash, currentRowIndex);
                    }
                }
            }

            if (cells.Length != headers.Length)
            {
                AddIssue(result, new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = currentRowIndex,
                    IssueCode = "COLUMN_COUNT_MISMATCH",
                    Message = $"A linha contém {cells.Length} colunas, mas o cabeçalho possui {headers.Length}.",
                    Severity = IssueSeverity.Error
                });
                rowHasError = true;
            }

            bool isForeignEntityRow = IsForeignEntityRow(ufColumnIndices, cells);

            if (requiredColumns != null)
            {
                foreach (string requiredColumn in requiredColumns)
                {
                    if (headerIndexMap.TryGetValue(requiredColumn, out int colIndex) && colIndex < cells.Length)
                    {
                        string cellValue = cells[colIndex];
                        if (string.IsNullOrWhiteSpace(cellValue))
                        {
                            if (isForeignEntityRow && IsTaxIdColumn(requiredColumn.ToLowerInvariant()))
                            {
                                continue;
                            }

                            AddIssue(result, new ValidationIssue
                            {
                                FileId = fileId,
                                RowNumber = currentRowIndex,
                                ColumnName = requiredColumn,
                                IssueCode = "REQUIRED_FIELD_MISSING",
                                Message = $"Campo obrigatório '{requiredColumn}' não preenchido.",
                                Severity = IssueSeverity.Error,
                                RawValue = string.Empty
                            });
                            rowHasError = true;
                        }
                    }
                }
            }

            // Validações semânticas automáticas baseadas no padrão de colunas de ERP
            int maxCols = Math.Min(cells.Length, headers.Length);
            for (int colIdx = 0; colIdx < maxCols; colIdx++)
            {
                string colName = headers[colIdx];
                string cellVal = cells[colIdx];

                if (string.IsNullOrWhiteSpace(colName) || string.IsNullOrWhiteSpace(cellVal))
                {
                    continue;
                }

                string lowerCol = colName.ToLowerInvariant();

                // 1. E-mail corporativo (Padrão + Dicionários ERP: A1_EMAIL, A2_EMAIL, E_Mail, EmailAddress, EMACLI)
                if (lowerCol.Contains("email") || lowerCol.Contains("e-mail") || lowerCol.Contains("e_mail") ||
                    lowerCol == "emacli")
                {
                    if (!EmailRegex.IsMatch(cellVal))
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_EMAIL_FORMAT",
                            Message = $"O valor '{cellVal}' na coluna '{colName}' não é um endereço de e-mail válido.",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 2. CPF / CNPJ Fiscal (Padrão + Dicionários ERP: A1_CGC, A2_CGC, LicTradNum, FederalTaxID, TaxId0, CgcCpf, CGC_CPF)
                if (IsTaxIdColumn(lowerCol))
                {
                    if (!isForeignEntityRow && !IsValidDocument(cellVal))
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_DOCUMENT_FORMAT",
                            Message = $"Documento fiscal '{cellVal}' inválido na coluna '{colName}' (esperado CPF de 11 dígitos ou CNPJ de 14 dígitos matematicamente válidos).",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 3. Valores Financeiros, Limites de Crédito, Preços e Quantidades (Padrão + ERP: A1_LC, A2_LC, CreditLine, CreditLimit, VlrLim, LIMCRED, B1_PRV1, Price)
                if (lowerCol.Contains("valor") || lowerCol.Contains("preco") || lowerCol.Contains("preço") ||
                    lowerCol.Contains("limite") || lowerCol.Contains("custo") || lowerCol.Contains("quantidade") ||
                    lowerCol == "a1_lc" || lowerCol == "a2_lc" || lowerCol == "creditline" || lowerCol == "creditlimit" ||
                    lowerCol == "vlrlim" || lowerCol == "limcred" || lowerCol == "b1_prv1" || lowerCol == "price")
                {
                    string normalizedNumber = cellVal.Replace("R$", "", StringComparison.OrdinalIgnoreCase).Trim();
                    if (normalizedNumber.Contains(',') && normalizedNumber.Contains('.'))
                    {
                        normalizedNumber = normalizedNumber.Replace(".", "").Replace(",", ".");
                    }
                    else if (normalizedNumber.Contains(','))
                    {
                        normalizedNumber = normalizedNumber.Replace(",", ".");
                    }

                    if (!decimal.TryParse(normalizedNumber, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal parsedAmount))
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_NUMERIC_VALUE",
                            Message = $"O valor '{cellVal}' na coluna '{colName}' não é um número decimal válido.",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                    else if (parsedAmount < 0)
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "NEGATIVE_AMOUNT_NOT_ALLOWED",
                            Message = $"Valor negativo ({cellVal}) não permitido na coluna financeira/quantitativa '{colName}'.",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 4. Datas (Padrão + ERP: A1_DTNASC, DatNas, DTNASC, ValidFrom)
                if (lowerCol.StartsWith("data") || lowerCol.StartsWith("dt_") ||
                    lowerCol.Contains("nascimento") || lowerCol.Contains("vencimento") || lowerCol.Contains("emissao") ||
                    lowerCol == "a1_dtnasc" || lowerCol == "datnas" || lowerCol == "dtnasc" || lowerCol == "validfrom")
                {
                    if (!DateTime.TryParseExact(cellVal, AcceptedDateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out _) &&
                        !DateTime.TryParse(cellVal, CultureInfo.GetCultureInfo("pt-BR"), DateTimeStyles.None, out _))
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_DATE_FORMAT",
                            Message = $"A data '{cellVal}' na coluna '{colName}' é inválida (use AAAA-MM-DD ou DD/MM/AAAA).",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 5. UF / Estado Federativo (Padrão + ERP: A1_EST, A2_EST, UF, Estado, CodEst, State, SigUfs)
                if (IsUfColumnName(lowerCol))
                {
                    string trimmedUf = cellVal.Trim();
                    if (!ValidBrazilianUfs.Contains(trimmedUf))
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_UF_CODE",
                            Message = $"Sigla de UF '{cellVal}' inválida na coluna '{colName}'. Esperado uma das 27 Unidades Federativas do Brasil (ex: SP, RJ, MG) ou 'EX' (Exterior).",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 6. CEP (Padrão + ERP: A1_CEP, A2_CEP, CEP, ZipCode, Cod_Cep)
                if (lowerCol == "cep" || lowerCol == "zipcode" || lowerCol == "a1_cep" || lowerCol == "a2_cep" ||
                    lowerCol.StartsWith("cep_") || lowerCol.EndsWith("_cep"))
                {
                    if (!isForeignEntityRow)
                    {
                        string cepDigits = new string(cellVal.Where(char.IsDigit).ToArray());
                        if (cepDigits.Length != 8 || cepDigits == "00000000")
                        {
                            AddIssue(result, new ValidationIssue
                            {
                                FileId = fileId,
                                RowNumber = currentRowIndex,
                                ColumnName = colName,
                                IssueCode = "INVALID_CEP_FORMAT",
                                Message = $"CEP '{cellVal}' inválido na coluna '{colName}'. O CEP deve conter exatamente 8 dígitos numéricos válidos (ex: 01001-000 ou 01001000).",
                                Severity = IssueSeverity.Error,
                                RawValue = cellVal
                            });
                            rowHasError = true;
                        }
                    }
                }

                // 7. NCM Fiscal de Produtos (Padrão + ERP: B1_POSIPI, NCM, NcmCode)
                if (lowerCol == "ncm" || lowerCol == "ncmcode" || lowerCol == "b1_posipi" ||
                    lowerCol.StartsWith("ncm_") || lowerCol.EndsWith("_ncm") || lowerCol.Contains("posipi"))
                {
                    string trimmedNcm = cellVal.Trim();
                    string ncmDigits = new string(trimmedNcm.Where(char.IsDigit).ToArray());
                    bool isValidEightDigitNcm = ncmDigits.Length == 8;
                    bool isValidSapB1AbsEntry = lowerCol == "ncmcode" &&
                                                trimmedNcm.All(char.IsDigit) &&
                                                trimmedNcm.Length >= 1 &&
                                                trimmedNcm.Length <= 7 &&
                                                int.TryParse(trimmedNcm, out int absEntry) &&
                                                absEntry > 0;

                    if (!isValidEightDigitNcm && !isValidSapB1AbsEntry)
                    {
                        AddIssue(result, new ValidationIssue
                        {
                            FileId = fileId,
                            RowNumber = currentRowIndex,
                            ColumnName = colName,
                            IssueCode = "INVALID_NCM_FORMAT",
                            Message = lowerCol == "ncmcode"
                                ? $"Código '{cellVal}' inválido em '{colName}'. Informe o NCM de 8 dígitos (ex: 8471.30.12) ou o identificador numérico AbsEntry da tabela ONCM do SAP B1."
                                : $"Código NCM '{cellVal}' inválido na coluna '{colName}'. O NCM fiscal deve possuir exatamente 8 dígitos numéricos (ex: 8471.30.12).",
                            Severity = IssueSeverity.Error,
                            RawValue = cellVal
                        });
                        rowHasError = true;
                    }
                }

                // 8. Telefones e Celulares (Padrão + ERP: A1_TEL, A2_TEL, Telefone, Celular, Phone1, Fone)
                if (lowerCol.Contains("telefone") || lowerCol.Contains("celular") ||
                    lowerCol == "a1_tel" || lowerCol == "a2_tel" || lowerCol == "phone1" || lowerCol == "fone" ||
                    lowerCol.StartsWith("tel_") || lowerCol.EndsWith("_tel"))
                {
                    if (!isForeignEntityRow)
                    {
                        string phoneDigits = new string(cellVal.Where(char.IsDigit).ToArray());
                        bool isValidPhone = (phoneDigits.Length == 10 || phoneDigits.Length == 11) &&
                                            int.TryParse(phoneDigits.Substring(0, 2), out int ddd) && ddd >= 11 && ddd <= 99;

                        if (!isValidPhone)
                        {
                            AddIssue(result, new ValidationIssue
                            {
                                FileId = fileId,
                                RowNumber = currentRowIndex,
                                ColumnName = colName,
                                IssueCode = "INVALID_PHONE_FORMAT",
                                Message = $"Telefone '{cellVal}' inválido na coluna '{colName}'. O número deve conter 10 ou 11 dígitos com DDD válido (ex: 11987654321 ou 1133224455).",
                                Severity = IssueSeverity.Error,
                                RawValue = cellVal
                            });
                            rowHasError = true;
                        }
                    }
                }
            }

            if (rowHasError)
            {
                result.ErrorRows++;
            }
            else
            {
                result.ValidRows++;
            }
        }

        return result;
    }

    private static void AddIssue(FileValidationResult result, ValidationIssue issue)
    {
        result.TotalIssuesCount++;
        if (result.Issues.Count < MaxInMemoryIssues)
        {
            result.Issues.Add(issue);
        }
    }

    private static bool IsUfColumnName(string lowerCol)
    {
        return (lowerCol == "uf" ||
                lowerCol == "estado" ||
                lowerCol == "codest" ||
                lowerCol == "state" ||
                lowerCol == "sigufs" ||
                lowerCol == "a1_est" ||
                lowerCol == "a2_est" ||
                lowerCol.EndsWith("_est") ||
                lowerCol.StartsWith("uf_")) &&
               lowerCol != "status";
    }

    private static bool IsForeignEntityRow(List<int> ufColumnIndices, string[] cells)
    {
        foreach (int ufIdx in ufColumnIndices)
        {
            if (ufIdx < cells.Length &&
                string.Equals(cells[ufIdx].Trim(), "EX", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsSapB1DtwMetadataRow(string[] headers, string[] cells)
    {
        if (headers.Length < 2 || cells.Length < 2)
        {
            return false;
        }

        bool hasSapHeader = headers.Any(h =>
            string.Equals(h, "CardCode", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(h, "ItemCode", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(h, "RecordKey", StringComparison.OrdinalIgnoreCase));

        if (!hasSapHeader)
        {
            return false;
        }

        string firstCell = cells[0].Trim();
        if (SapB1DtwHeaderMarkers.Contains(firstCell))
        {
            return true;
        }

        int matchingHeaderCount = 0;
        int compareLen = Math.Min(headers.Length, cells.Length);
        for (int i = 0; i < compareLen; i++)
        {
            if (!string.IsNullOrWhiteSpace(headers[i]) &&
                string.Equals(headers[i].Trim(), cells[i].Trim(), StringComparison.OrdinalIgnoreCase))
            {
                matchingHeaderCount++;
            }
        }

        return matchingHeaderCount >= 2;
    }

    private static string BuildCompositePrimaryKey(ErpPrimaryKeySpec spec, string[] cells)
    {
        List<string> parts = new List<string>(3);
        if (spec.PrefixColumnIndex.HasValue && spec.PrefixColumnIndex.Value < cells.Length)
        {
            string prefixVal = cells[spec.PrefixColumnIndex.Value].Trim();
            if (!string.IsNullOrWhiteSpace(prefixVal))
            {
                parts.Add(prefixVal);
            }
        }

        parts.Add(cells[spec.PrimaryColumnIndex].Trim());

        if (spec.SecondaryColumnIndex.HasValue && spec.SecondaryColumnIndex.Value < cells.Length)
        {
            string secVal = cells[spec.SecondaryColumnIndex.Value].Trim();
            if (!string.IsNullOrWhiteSpace(secVal))
            {
                parts.Add(secVal);
            }
        }

        return string.Join("/", parts);
    }

    private static string[] ParseCsvLine(string line, char delimiter)
    {
        List<string> fields = new List<string>();
        StringBuilder currentField = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    currentField.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == delimiter && !inQuotes)
            {
                fields.Add(currentField.ToString().Trim(' ', '\r'));
                currentField.Clear();
            }
            else
            {
                currentField.Append(c);
            }
        }

        fields.Add(currentField.ToString().Trim(' ', '\r'));
        return fields.ToArray();
    }

    private static bool IsValidDocument(string rawDoc)
    {
        string digitsOnly = new string(rawDoc.Where(char.IsDigit).ToArray());

        if (digitsOnly.Length != 11 && digitsOnly.Length != 14)
        {
            return false;
        }

        // Rejeitar sequências de dígitos todos iguais (ex: 00000000000, 11111111111)
        if (digitsOnly.Distinct().Count() == 1)
        {
            return false;
        }

        if (digitsOnly.Length == 11)
        {
            return IsValidCpfChecksum(digitsOnly);
        }

        return IsValidCnpjChecksum(digitsOnly);
    }

    private static bool IsValidCpfChecksum(string cpf)
    {
        int sum1 = 0;
        for (int i = 0; i < 9; i++)
        {
            sum1 += (cpf[i] - '0') * (10 - i);
        }

        int remainder1 = sum1 % 11;
        int digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
        if (cpf[9] - '0' != digit1)
        {
            return false;
        }

        int sum2 = 0;
        for (int i = 0; i < 10; i++)
        {
            sum2 += (cpf[i] - '0') * (11 - i);
        }

        int remainder2 = sum2 % 11;
        int digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
        return cpf[10] - '0' == digit2;
    }

    private static bool IsValidCnpjChecksum(string cnpj)
    {
        int[] weights1 = new int[] { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        int[] weights2 = new int[] { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };

        int sum1 = 0;
        for (int i = 0; i < 12; i++)
        {
            sum1 += (cnpj[i] - '0') * weights1[i];
        }

        int remainder1 = sum1 % 11;
        int digit1 = remainder1 < 2 ? 0 : 11 - remainder1;
        if (cnpj[12] - '0' != digit1)
        {
            return false;
        }

        int sum2 = 0;
        for (int i = 0; i < 13; i++)
        {
            sum2 += (cnpj[i] - '0') * weights2[i];
        }

        int remainder2 = sum2 % 11;
        int digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
        return cnpj[13] - '0' == digit2;
    }

    private static char DetectDelimiter(string headerLine)
    {
        int commaCount = 0;
        int semicolonCount = 0;
        int tabCount = 0;
        bool inQuotes = false;

        foreach (char c in headerLine)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (!inQuotes)
            {
                if (c == ',') commaCount++;
                else if (c == ';') semicolonCount++;
                else if (c == '\t') tabCount++;
            }
        }

        if (semicolonCount > commaCount && semicolonCount > tabCount)
        {
            return ';';
        }

        if (tabCount > commaCount && tabCount > semicolonCount)
        {
            return '\t';
        }

        return ',';
    }

    private static ErpPrimaryKeySpec? ResolveErpPrimaryKeySpec(
        Dictionary<string, int> headerIndexMap,
        string[] headers)
    {
        if (headerIndexMap.TryGetValue("A1_COD", out int a1CodIdx))
        {
            int? filialIdx = headerIndexMap.TryGetValue("A1_FILIAL", out int fIdx) ? fIdx : null;
            if (headerIndexMap.TryGetValue("A1_LOJA", out int a1LojaIdx))
            {
                string label = filialIdx.HasValue
                    ? $"{headers[filialIdx.Value]} + {headers[a1CodIdx]} + {headers[a1LojaIdx]}"
                    : $"{headers[a1CodIdx]} + {headers[a1LojaIdx]}";
                return new ErpPrimaryKeySpec(a1CodIdx, a1LojaIdx, label, filialIdx);
            }

            return new ErpPrimaryKeySpec(a1CodIdx, null, headers[a1CodIdx], filialIdx);
        }

        if (headerIndexMap.TryGetValue("A2_COD", out int a2CodIdx))
        {
            int? filialIdx = headerIndexMap.TryGetValue("A2_FILIAL", out int fIdx) ? fIdx : null;
            if (headerIndexMap.TryGetValue("A2_LOJA", out int a2LojaIdx))
            {
                string label = filialIdx.HasValue
                    ? $"{headers[filialIdx.Value]} + {headers[a2CodIdx]} + {headers[a2LojaIdx]}"
                    : $"{headers[a2CodIdx]} + {headers[a2LojaIdx]}";
                return new ErpPrimaryKeySpec(a2CodIdx, a2LojaIdx, label, filialIdx);
            }

            return new ErpPrimaryKeySpec(a2CodIdx, null, headers[a2CodIdx], filialIdx);
        }

        if (headerIndexMap.TryGetValue("B1_COD", out int b1CodIdx))
        {
            int? filialIdx = headerIndexMap.TryGetValue("B1_FILIAL", out int fIdx) ? fIdx : null;
            string label = filialIdx.HasValue
                ? $"{headers[filialIdx.Value]} + {headers[b1CodIdx]}"
                : headers[b1CodIdx];
            return new ErpPrimaryKeySpec(b1CodIdx, null, label, filialIdx);
        }

        string[] singleKeyCandidates = new string[]
        {
            "CardCode",
            "ItemCode",
            "BP_Number",
            "CodCli",
            "CODPARC",
            "codigo_cliente"
        };

        foreach (string candidate in singleKeyCandidates)
        {
            if (headerIndexMap.TryGetValue(candidate, out int colIdx))
            {
                return new ErpPrimaryKeySpec(colIdx, null, headers[colIdx]);
            }
        }

        return null;
    }

    private static bool IsTaxIdColumn(string lowerCol)
    {
        return lowerCol.Contains("cpf") || lowerCol.Contains("cnpj") ||
               lowerCol == "a1_cgc" || lowerCol == "a2_cgc" ||
               lowerCol == "lictradnum" || lowerCol == "federaltaxid" || lowerCol == "taxid0" ||
               lowerCol == "cgccpf" || lowerCol == "cgc_cpf" ||
               lowerCol == "nu_cpf" || lowerCol == "nu_cnpj" ||
               lowerCol == "cpf_cnpj" || lowerCol == "cnpj_cpf";
    }

    private sealed class ErpPrimaryKeySpec
    {
        public ErpPrimaryKeySpec(
            int primaryColumnIndex,
            int? secondaryColumnIndex,
            string displayColumnName,
            int? prefixColumnIndex = null)
        {
            PrimaryColumnIndex = primaryColumnIndex;
            SecondaryColumnIndex = secondaryColumnIndex;
            DisplayColumnName = displayColumnName;
            PrefixColumnIndex = prefixColumnIndex;
        }

        public int? PrefixColumnIndex { get; }
        public int PrimaryColumnIndex { get; }
        public int? SecondaryColumnIndex { get; }
        public string DisplayColumnName { get; }
    }
}
