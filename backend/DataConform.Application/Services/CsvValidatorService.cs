using System.Text;
using DataConform.Application.Common.Interfaces;
using DataConform.Domain.Entities;
using DataConform.Domain.Enums;

namespace DataConform.Application.Services;

public class CsvValidatorService : ICsvValidatorService
{
    public async Task<FileValidationResult> ValidateCsvStreamAsync(
        Stream csvStream,
        Guid fileId,
        IReadOnlyCollection<string>? requiredColumns = null,
        CancellationToken cancellationToken = default)
    {
        FileValidationResult result = new FileValidationResult();
        HashSet<string> seenRows = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        using StreamReader reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 4096, leaveOpen: true);

        string? headerLine = await reader.ReadLineAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            result.Issues.Add(new ValidationIssue
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

        char delimiter = DetectDelimiter(headerLine);
        string[] headers = headerLine.Split(delimiter).Select(h => h.Trim('"', ' ', '\r')).ToArray();

        Dictionary<string, int> headerIndexMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < headers.Length; i++)
        {
            string headerName = headers[i];
            if (string.IsNullOrWhiteSpace(headerName))
            {
                result.Issues.Add(new ValidationIssue
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
                result.Issues.Add(new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = 1,
                    ColumnName = headerName,
                    IssueCode = "DUPLICATE_HEADER",
                    Message = $"Cabeçalho duplicado: '{headerName}'.",
                    Severity = IssueSeverity.Error
                });
            }
        }

        if (requiredColumns != null)
        {
            foreach (string requiredColumn in requiredColumns)
            {
                if (!headerIndexMap.ContainsKey(requiredColumn))
                {
                    result.Issues.Add(new ValidationIssue
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

        int currentRowIndex = 1;
        string? line;

        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            currentRowIndex++;

            if (string.IsNullOrWhiteSpace(line))
            {
                continue; // Linha em branco ignorada
            }

            result.TotalRows++;
            bool rowHasError = false;

            // Verificar duplicidade de linha inteira
            string normalizedLine = line.Trim();
            if (!seenRows.Add(normalizedLine))
            {
                result.Issues.Add(new ValidationIssue
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

            string[] cells = line.Split(delimiter).Select(c => c.Trim('"', ' ', '\r')).ToArray();

            if (cells.Length != headers.Length)
            {
                result.Issues.Add(new ValidationIssue
                {
                    FileId = fileId,
                    RowNumber = currentRowIndex,
                    IssueCode = "COLUMN_COUNT_MISMATCH",
                    Message = $"A linha contém {cells.Length} colunas, mas o cabeçalho possui {headers.Length}.",
                    Severity = IssueSeverity.Error
                });
                rowHasError = true;
            }

            if (requiredColumns != null)
            {
                foreach (string requiredColumn in requiredColumns)
                {
                    if (headerIndexMap.TryGetValue(requiredColumn, out int colIndex) && colIndex < cells.Length)
                    {
                        string cellValue = cells[colIndex];
                        if (string.IsNullOrWhiteSpace(cellValue))
                        {
                            result.Issues.Add(new ValidationIssue
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

    private static char DetectDelimiter(string headerLine)
    {
        int commaCount = headerLine.Count(c => c == ',');
        int semicolonCount = headerLine.Count(c => c == ';');
        int tabCount = headerLine.Count(c => c == '\t');

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
}
