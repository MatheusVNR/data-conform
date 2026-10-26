export const RULE_SEO_PAGES = [
  {
    slug: 'validar-cpf-cnpj-em-massa-csv',
    issueCode: 'INVALID_DOCUMENT_FORMAT',
    severity: 'Erro (Error)',
    shortTitle: 'Validar CPF e CNPJ em Massa no CSV',
    title: 'Validar CPF e CNPJ em Massa na Planilha CSV (Módulo 11) | DataConform',
    metaDescription:
      'Valide milhares de CPFs e CNPJs em massa na sua planilha CSV antes de importar no ERP. Cálculo automático do dígito verificador (Módulo 11) e laudo em PDF.',
    h1: 'Como Validar CPF e CNPJ em Massa na Planilha CSV (Dígito Verificador Módulo 11)',
    lead:
      'Audite milhares de documentos fiscais em segundos antes de importar clientes e fornecedores no seu ERP. O DataConform valida matematicamente os dois dígitos verificadores de CPF (11 dígitos) e CNPJ (14 dígitos) linha a linha.',
    detectedColumns: [
      'A1_CGC (TOTVS Protheus SA1)',
      'A2_CGC (TOTVS Protheus SA2)',
      'LicTradNum (SAP Business One OCRD)',
      'TaxId0 (SAP S/4HANA BP)',
      'CgcCpf (Senior ERP E085CLI)',
      'CGC_CPF (Sankhya TGFPAR)',
      'cnpj_cpf / cpf_cnpj (Omie, ContaAzul, Genérico)',
      'nu_cpf / nu_cnpj / qualquer coluna contendo "cpf" ou "cnpj"',
    ],
    problemParagraphs: [
      'Em migrações de sistemas ERP e cargas cadastrais recorrentes, a validação apenas da quantidade de caracteres de um CPF ou CNPJ não é suficiente. Planilhas editadas no Microsoft Excel frequentemente perdem o zero à esquerda quando a coluna é tratada como número (transformando um CNPJ de 14 dígitos iniciado por 0 em uma sequência inválida de 13 dígitos). Além disso, cadastros legados costumam conter CNPJs fictícios (como 11.111.111/1111-11 ou 00.000.000/0000-00) ou erros de digitação nos últimos dois números que travam a emissão de NF-e na SEFAZ.',
      'O motor de conformidade do DataConform executa a regra INVALID_DOCUMENT_FORMAT sobre todas as linhas do arquivo CSV. Ele higieniza máscaras de pontuação (pontos, barras e hífens), verifica se o documento possui exatamente 11 dígitos (CPF) ou 14 dígitos (CNPJ), rejeita sequências de dígitos todos iguais e executa o cálculo algorítmico oficial de Módulo 11 da Receita Federal sobre o primeiro e o segundo dígito verificador.',
    ],
    howItWorksParagraphs: [
      'Para o CPF (11 dígitos), o validador multiplica os 9 primeiros dígitos pelos pesos decrescentes de 10 a 2, calcula o resto da divisão por 11 para aferir o 1º dígito verificador e repete o processo com os 10 primeiros dígitos (pesos de 11 a 2) para aferir o 2º dígito verificador. Para o CNPJ (14 dígitos), são aplicados os vetores de pesos oficiais [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] para o 13º dígito e [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] para o 14º dígito.',
      'Qualquer linha cujo documento não passe no teste matemático recebe imediatamente o apontamento INVALID_DOCUMENT_FORMAT no laudo, exibindo o número exato da linha, o nome da coluna (ex.: A1_CGC ou LicTradNum) e o valor bruto rejeitado para facilitar o saneamento.',
    ],
    examples: [
      {
        rawValue: '12.345.678/0001-95',
        status: 'Válido (Aprovado)',
        explanation: 'CNPJ de 14 dígitos com ambos os dígitos verificadores (95) matematicamente corretos pelo Módulo 11.',
      },
      {
        rawValue: '06990590000123',
        status: 'Válido (Aprovado)',
        explanation: 'CNPJ enviado sem pontuação contendo 14 dígitos e Módulo 11 íntegro (zeros à esquerda preservados).',
      },
      {
        rawValue: '12.345.678/0001-00',
        status: 'Rejeitado (INVALID_DOCUMENT_FORMAT)',
        explanation: 'Possui 14 dígitos, mas o sufixo verificador 00 diverge do cálculo Módulo 11 (que exigiria 95).',
      },
      {
        rawValue: '6990590000123',
        status: 'Rejeitado (INVALID_DOCUMENT_FORMAT)',
        explanation: 'Possui apenas 13 dígitos porque o zero inicial foi removido pela formatação numérica do Excel.',
      },
      {
        rawValue: '111.111.111-11',
        status: 'Rejeitado (INVALID_DOCUMENT_FORMAT)',
        explanation: 'Sequência de dígitos idênticos bloqueada explicitamente pela validação de documentos fiscais.',
      },
    ],
    steps: [
      'Exporte sua planilha de clientes, fornecedores ou parceiros em formato CSV mantendo a coluna de documento fiscal (como A1_CGC, LicTradNum, CGC_CPF ou cnpj_cpf).',
      'Faça o upload do arquivo no DataConform selecionando o preset do seu ERP ou o layout Genérico / CSV.',
      'No laudo gerado, filtre pelo código INVALID_DOCUMENT_FORMAT, baixe o CSV apenas com as linhas inválidas para correção e emita o laudo em PDF.',
    ],
    faqs: [
      {
        question: 'Posso misturar CPFs (11 dígitos) e CNPJs (14 dígitos) na mesma coluna da planilha?',
        answer:
          'Sim. O DataConform avalia cada célula individualmente: se após remover a pontuação restarem 11 dígitos, aplica a regra de Módulo 11 de CPF; se restarem 14 dígitos, aplica a regra de Módulo 11 de CNPJ.',
      },
      {
        question: 'Preciso remover pontos, traços e barras antes de validar o CSV?',
        answer:
          'Não. O validador aceita documentos formatados (12.345.678/0001-95) ou apenas números (12345678000195) de forma transparente.',
      },
      {
        question: 'Como corrigir zeros à esquerda perdidos no CPF ou CNPJ no Excel?',
        answer:
          'Formate a coluna como Texto antes de exportar ou utilize a função =TEXTO(A2;"00000000000000") para CNPJ (14 posições) e =TEXTO(A2;"00000000000") para CPF (11 posições), salvando em seguida como CSV UTF-8.',
      },
    ],
    relatedRules: [
      'validar-cep-em-lote-csv',
      'validar-uf-estado-planilha-csv',
      'validar-email-em-lote-planilha-csv',
      'remover-identificar-linhas-duplicadas-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'validar-ncm-planilha-csv',
    issueCode: 'INVALID_NCM_FORMAT',
    severity: 'Erro (Error)',
    shortTitle: 'Validar NCM em Planilha CSV',
    title: 'Validar NCM em Planilha CSV (8 Dígitos para ERP e NF-e) | DataConform',
    metaDescription:
      'Audite códigos NCM em lote na sua planilha CSV de produtos antes de importar no Protheus (B1_POSIPI) ou SAP B1 (NcmCode). Identifique NCMs com 7 dígitos ou inválidos.',
    h1: 'Como Validar Códigos NCM em Planilha CSV Antes da Importação no ERP',
    lead:
      'Impeça que produtos com NCM incompleto ou truncado pelo Excel entrem no cadastro de itens do seu ERP e causem rejeição de NF-e na SEFAZ. O DataConform inspeciona os 8 dígitos numéricos de cada NCM em lote.',
    detectedColumns: [
      'B1_POSIPI (TOTVS Protheus SB1)',
      'NcmCode (SAP Business One OITM)',
      'NCM / ncm',
      'Colunas iniciadas por ncm_, terminadas em _ncm ou contendo posipi',
    ],
    problemParagraphs: [
      'A Nomenclatura Comum do Mercosul (NCM) é composta obrigatoriamente por 8 dígitos numéricos (capítulo, posição, subposição, item e subitem) e determina as alíquotas de IPI, II, PIS/COFINS e a incidência de Substituição Tributária (ICMS-ST). Na preparação de catálogos de produtos em planilhas para carga no TOTVS Protheus (tabela SB1) ou SAP Business One (objeto OITM), dois erros são recorrentes: o preenchimento apenas do capítulo/posição (4 ou 6 dígitos) e o corte automático do zero à esquerda pelo Excel nos capítulos 01 a 09 (deixando o código com 7 dígitos).',
      'Quando um item é importado com NCM de 7 dígitos ou contendo letras, o ERP ou recusa a linha na carga (como ocorre quando o DTW do SAP B1 não encontra correspondência na tabela ONCM) ou permite o cadastro e trava o faturamento no momento da autorização da NF-e na SEFAZ.',
    ],
    howItWorksParagraphs: [
      'O motor do DataConform identifica automaticamente colunas fiscais de mercadorias como B1_POSIPI, NcmCode e NCM. Para cada linha preenchida, o validador extrai todos os dígitos numéricos (ignorando pontos separadores como em 8471.30.12) e verifica se o comprimento exato é igual a 8 dígitos.',
      'Caso o valor contenha menos ou mais de 8 dígitos numéricos — ou seja composto apenas por letras/símbolos — o DataConform emite o erro INVALID_NCM_FORMAT, destacando o número da linha, a coluna avaliada e o valor original para saneamento imediato pela equipe fiscal.',
    ],
    examples: [
      {
        rawValue: '8471.49.00',
        status: 'Válido (Aprovado)',
        explanation: 'Código NCM formatado com pontos contendo exatamente 8 dígitos numéricos válidos.',
      },
      {
        rawValue: '85285220',
        status: 'Válido (Aprovado)',
        explanation: 'Código NCM sem máscara contendo os 8 dígitos exigidos pela tabela TIPI/SEFAZ.',
      },
      {
        rawValue: '9011100',
        status: 'Rejeitado (INVALID_NCM_FORMAT)',
        explanation: 'Possui apenas 7 dígitos (o zero inicial do capítulo 09 — café/mate/especiarias foi cortado pelo Excel).',
      },
      {
        rawValue: '8471.30',
        status: 'Rejeitado (INVALID_NCM_FORMAT)',
        explanation: 'Incompleto com apenas 6 dígitos (subposição sem item e subitem de 8 dígitos).',
      },
      {
        rawValue: 'ISENTO',
        status: 'Rejeitado (INVALID_NCM_FORMAT)',
        explanation: 'Texto não numérico (zero dígitos encontrados). Para serviços ou itens específicos no NCM, exige-se código numérico de 8 dígitos (ex.: 00000000 quando aplicável no ERP).',
      },
    ],
    steps: [
      'Exporte sua planilha de catálogo de produtos em CSV contendo a coluna fiscal (B1_POSIPI, NcmCode ou NCM).',
      'Submeta o arquivo no DataConform escolhendo o preset "TOTVS Protheus - Produtos", "SAP Business One - Itens" ou "Genérico / CSV".',
      'Filtre o laudo pelo código INVALID_NCM_FORMAT, exporte os SKUs reprovados em CSV para revisão contábil e gere o certificado de validação em PDF.',
    ],
    faqs: [
      {
        question: 'O DataConform exige pontos no NCM (ex.: 8471.49.00) ou aceita somente números (84714900)?',
        answer:
          'Ambos os formatos são aceitos. O algoritmo extrai os caracteres numéricos da célula e valida se existem exatamente 8 dígitos.',
      },
      {
        question: 'Como recuperar o zero à esquerda de NCMs dos capítulos 01 a 09 no Excel?',
        answer:
          'Utilize a fórmula =TEXTO(A2;"00000000") em uma coluna auxiliar do Excel e cole como valores em uma coluna formatada como Texto antes de exportar o CSV.',
      },
      {
        question: 'Quais presets nativos do DataConform já exigem a coluna de NCM como obrigatória?',
        answer:
          'Os presets "TOTVS Protheus - Produtos" (coluna B1_POSIPI da tabela SB1) e "SAP Business One - Itens" (coluna NcmCode do objeto OITM) exigem a coluna de NCM obrigatoriamente.',
      },
    ],
    relatedRules: [
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'erro-colunas-delimitador-quebrado-csv',
      'remover-identificar-linhas-duplicadas-csv',
      'validar-cpf-cnpj-em-massa-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sb1-produtos',
      'layout-importacao-sap-business-one-oitm-itens',
      'layout-importacao-protheus-sa1-clientes',
    ],
  },
  {
    slug: 'validar-cep-em-lote-csv',
    issueCode: 'INVALID_CEP_FORMAT',
    severity: 'Erro (Error)',
    shortTitle: 'Validar CEP em Lote na Planilha CSV',
    title: 'Validar CEP em Lote na Planilha CSV (8 Dígitos para ERP) | DataConform',
    metaDescription:
      'Valide milhares de CEPs em lote na sua planilha CSV antes da importação no ERP. Detecte CEPs de SP/Nordeste com 7 dígitos (sem zero à esquerda) ou 00000-000.',
    h1: 'Como Validar CEP em Lote na Planilha CSV e Corrigir Zeros Cortados pelo Excel',
    lead:
      'Audite todos os CEPs da sua base de clientes e fornecedores antes de importar no ERP. O DataConform identifica CEPs com 7 dígitos (zero inicial suprimido), códigos incompletos e preenchimentos zerados (00000-000).',
    detectedColumns: [
      'A1_CEP (TOTVS Protheus SA1)',
      'A2_CEP (TOTVS Protheus SA2)',
      'ZipCode (SAP Business One OCRD)',
      'CEP / cep (Sankhya TGFPAR, Omie, Genérico)',
      'Colunas iniciadas por cep_ ou terminadas em _cep',
    ],
    problemParagraphs: [
      'No sistema postal brasileiro, todos os CEPs da Grande São Paulo e interior paulista (faixas 01000-000 a 09999-999) começam com o algarismo zero. Quando uma planilha de clientes ou fornecedores é aberta diretamente no Excel sem assistente de texto, o aplicativo interpreta a coluna de CEP como número inteiro e remove o zero inicial — transformando 01310-100 em 1310100 (7 dígitos). Além disso, operadores frequentemente preenchem 00000-000 ou 1234 quando desconhecem o endereço.',
      'Ao importar esses registros no TOTVS Protheus, SAP Business One, Sankhya ou Omie, o gatilho de consulta de endereço falha, o código de município IBGE não é vinculado corretamente e a emissão de NF-e ou CT-e é rejeitada pela SEFAZ.',
    ],
    howItWorksParagraphs: [
      'O motor do DataConform detecta automaticamente qualquer coluna denominada CEP, ZipCode, A1_CEP, A2_CEP ou variações com prefixo/sufixo cep. Para cada célula preenchida, o validador filtra os dígitos numéricos (aceitando formatos com ou sem hífen, como 01001-000 ou 01001000) e aplica duas verificações obrigatórias: o total de dígitos numéricos deve ser exatamente igual a 8 e a sequência não pode ser "00000000".',
      'Se qualquer linha violar essas regras, o relatório registra o código INVALID_CEP_FORMAT com severidade de Erro, informando a linha exata, a coluna e o valor rejeitado.',
    ],
    examples: [
      {
        rawValue: '01001-000',
        status: 'Válido (Aprovado)',
        explanation: 'CEP com hífen contendo exatamente 8 dígitos numéricos válidos.',
      },
      {
        rawValue: '80020100',
        status: 'Válido (Aprovado)',
        explanation: 'CEP sem hífen contendo 8 dígitos numéricos válidos.',
      },
      {
        rawValue: '1001000',
        status: 'Rejeitado (INVALID_CEP_FORMAT)',
        explanation: 'Possui apenas 7 dígitos (zero inicial de São Paulo perdido na conversão numérica do Excel).',
      },
      {
        rawValue: '00000-000',
        status: 'Rejeitado (INVALID_CEP_FORMAT)',
        explanation: 'Sequência zerada (00000000) bloqueada explicitamente pela regra fiscal de endereço.',
      },
      {
        rawValue: '1234',
        status: 'Rejeitado (INVALID_CEP_FORMAT)',
        explanation: 'Código postal incompleto com menos de 8 dígitos numéricos.',
      },
    ],
    steps: [
      'Gere seu arquivo CSV de clientes ou fornecedores mantendo a coluna de CEP (A1_CEP, ZipCode, CEP).',
      'Carregue a planilha no DataConform selecionando o ERP de destino para inspecionar todos os endereços em lote.',
      'Filtre por INVALID_CEP_FORMAT no relatório, baixe os registros afetados em CSV, padronize os 8 dígitos e emita o laudo em PDF.',
    ],
    faqs: [
      {
        question: 'O CEP precisa ter o traço (01001-000) ou pode conter apenas números (01001000)?',
        answer:
          'Ambos são válidos. O DataConform avalia os dígitos numéricos da célula, aprovando tanto 01001-000 quanto 01001000.',
      },
      {
        question: 'Por que o DataConform bloqueia o CEP 00000-000 mesmo tendo 8 dígitos?',
        answer:
          'Porque 00000000 é um preenchimento artificial utilizado para burlar campos obrigatórios e causa rejeição na validação de endereço da NF-e e nos ERPs.',
      },
      {
        question: 'Quais presets do DataConform exigem a coluna de CEP obrigatoriamente?',
        answer:
          'Os presets TOTVS Protheus SA1 (A1_CEP), SAP Business One OCRD (ZipCode), Sankhya TGFPAR (CEP), Omie (cep) e Genérico / CSV exigem a presença da coluna de CEP no cabeçalho.',
      },
    ],
    relatedRules: [
      'validar-uf-estado-planilha-csv',
      'validar-cpf-cnpj-em-massa-csv',
      'erro-colunas-delimitador-quebrado-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'erro-encoding-utf8-caracteres-estranhos-csv',
    issueCode: 'ENCODING_CORRUPTION',
    severity: 'Erro (Error)',
    shortTitle: 'Corrigir Erro de Encoding UTF-8 no CSV',
    title: 'Caracteres Estranhos no CSV: Como Detectar e Corrigir Encoding UTF-8 | DataConform',
    metaDescription:
      'Resolva o problema de caracteres estranhos (acentos e cedilha corrompidos) na importação CSV para o ERP. Valide a codificação UTF-8 linha a linha grátis.',
    h1: 'Caracteres Estranhos na Importação CSV (Erro de Encoding UTF-8): Como Detectar e Resolver',
    lead:
      'Evite gravar razões sociais, endereços e descrições de produtos com símbolos corrompidos () no banco de dados do seu ERP. O DataConform inspeciona o cabeçalho e todas as linhas em busca de falhas de codificação UTF-8.',
    detectedColumns: [
      'Cabeçalho completo do arquivo (Linha #1)',
      'Todas as linhas de dados (A1_NOME, B1_DESC, CardName, Name1, NOMEPARC, razao_social, etc.)',
    ],
    problemParagraphs: [
      'Um dos problemas mais destrutivos e silenciosos em cargas de dados no Brasil é o conflito entre codificações de caracteres: Windows-1252 (ANSI / ISO-8859-1) versus UTF-8. Quando o Microsoft Excel ou um sistema legado exporta um arquivo CSV no padrão ANSI brasileiro e o importador do ERP (ou banco PostgreSQL, SQL Server, Oracle, SAP HANA) lê o fluxo esperando UTF-8, todas as letras acentuadas (Á, É, Í, Ó, Ú, Ã, Õ, Â, Ê) e o cedilha (Ç) são substituídos pelo caractere de erro Unicode U+FFFD () ou por sequências ilegíveis.',
      'Uma vez importados no ERP, esses caracteres corrompidos contaminam a impressão de DANFEs, quebram a assinatura digital de XMLs de NF-e (erro de schema XML por caractere inválido) e exigem scripts complexos de UPDATE diretamente no banco de dados para limpeza.',
    ],
    howItWorksParagraphs: [
      'O motor de leitura do DataConform processa o arquivo em fluxo UTF-8 com detecção automática de BOM (Byte Order Mark) e verifica, tanto na linha de cabeçalho quanto em cada uma das linhas de dados, a presença do caractere de substituição Unicode (\\uFFFD).',
      'Sempre que um byte inválido de codificação ANSI/ISO-8859-1 é detectado na leitura UTF-8, o DataConform dispara imediatamente o erro ENCODING_CORRUPTION, exibindo o número exato da linha afetada e um trecho de até 120 caracteres do conteúdo bruto para que você identifique e converta a planilha antes da carga no ERP.',
    ],
    examples: [
      {
        rawValue: 'Metalúrgica São José Comércio e Indústria LTDA',
        status: 'Válido (Aprovado em UTF-8)',
        explanation: 'Texto acentuado codificado corretamente em UTF-8 (com ou sem BOM).',
      },
      {
        rawValue: 'Metal\uFFFDgica S\uFFFDo Jos\uFFFD Com\uFFFDrcio LTDA',
        status: 'Rejeitado (ENCODING_CORRUPTION)',
        explanation: 'Arquivo salvo em ANSI/Windows-1252 contendo bytes inválidos que geram \\uFFFD ao serem lidos em UTF-8.',
      },
      {
        rawValue: 'C\uFFFDdigo_Cliente;Raz\uFFFDo_Social;Endere\uFFFDo',
        status: 'Rejeitado na Linha #1 (ENCODING_CORRUPTION)',
        explanation: 'Cabeçalho da planilha com acentuação corrompida, impedindo até mesmo o reconhecimento dos nomes das colunas.',
      },
    ],
    steps: [
      'No Excel, clique em "Salvar Como" e escolha explicitamente a opção "CSV UTF-8 (Delimitado por vírgulas) (*.csv)" — ou no Bloco de Notas/VS Code salve com codificação UTF-8.',
      'Envie o arquivo no DataConform para verificar se restou algum caractere corrompido herdado de sistemas anteriores.',
      'Confirme que o laudo apresenta zero ocorrências de ENCODING_CORRUPTION e gere o PDF de homologação para liberar a importação.',
    ],
    faqs: [
      {
        question: 'Qual a diferença entre "CSV ( separado por vírgulas )" e "CSV UTF-8" no Excel?',
        answer:
          'No Windows em português, a opção antiga "CSV (separado por vírgulas)" costuma salvar em codificação Windows-1252 (ANSI), enquanto "CSV UTF-8 (Delimitado por vírgulas)" salva no padrão universal UTF-8 exigido pela maioria das APIs e ERPs modernos.',
      },
      {
        question: 'O DataConform aceita arquivos CSV UTF-8 com BOM (Byte Order Mark)?',
        answer:
          'Sim. O leitor do DataConform possui detectEncodingFromByteOrderMarks ativado, tratando arquivos UTF-8 com ou sem BOM sem corromper o nome da primeira coluna do cabeçalho.',
      },
      {
        question: 'E se alguém tentar enviar um arquivo Excel (.xlsx) renomeado para .csv?',
        answer:
          'O DataConform possui proteção contra arquivos binários disfarçados (assinatura ZIP/PK de arquivos XLSX ou PDF), bloqueando o arquivo antes mesmo do processamento.',
      },
    ],
    relatedRules: [
      'erro-colunas-delimitador-quebrado-csv',
      'validar-cpf-cnpj-em-massa-csv',
      'validar-ncm-planilha-csv',
      'remover-identificar-linhas-duplicadas-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-protheus-sb1-produtos',
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-sankhya-tgfpar-parceiros',
    ],
  },
  {
    slug: 'erro-colunas-delimitador-quebrado-csv',
    issueCode: 'COLUMN_COUNT_MISMATCH',
    severity: 'Erro (Error)',
    shortTitle: 'Erro de Colunas e Delimitador Quebrado no CSV',
    title: 'Erro de Colunas a Mais ou Delimitador Quebrado no CSV (RFC 4180) | DataConform',
    metaDescription:
      'Descubra qual linha da sua planilha CSV tem colunas a mais ou a menos por causa de vírgula ou ponto e vírgula fora de aspas. Validação RFC 4180 para ERPs.',
    h1: 'Colunas a Mais ou Delimitador Quebrado no CSV: Como Localizar a Linha Exata do Erro',
    lead:
      'Quando uma única linha tem uma vírgula ou ponto e vírgula fora de aspas, todas as colunas seguintes deslocam para a direita e quebram a importação no ERP. O DataConform audita a estrutura RFC 4180 linha a linha.',
    detectedColumns: [
      'Comparação estrutural entre o total de colunas do cabeçalho (Linha #1) e cada linha de dados',
      'Detecção automática de delimitador: vírgula (,), ponto e vírgula (;) ou tabulação (\\t)',
    ],
    problemParagraphs: [
      'Em arquivos CSV de grande porte (com dezenas de milhares de linhas), o erro mais difícil de achar visualmente é o deslocamento de colunas (Column Shift). Isso acontece quando um endereço contém vírgula (ex.: Rua Paulista, 1000) em um CSV separado por vírgulas sem estar envolto por aspas duplas, ou quando uma observação contém ponto e vírgula em um CSV exportado pelo Excel brasileiro.',
      'Nessa linha específica, o importador do ERP passa a enxergar uma coluna extra: o complemento do endereço cai na coluna de CNPJ, o CNPJ cai na coluna de e-mail e o e-mail cai na coluna de limite de crédito. O ERP rejeita a linha com mensagens genéricas de erro de tipo de dado, fazendo o analista perder horas procurando o problema.',
    ],
    howItWorksParagraphs: [
      'O parser do DataConform segue o padrão RFC 4180. Primeiro, ele inspeciona a linha de cabeçalho ignorando trechos entre aspas duplas para detectar automaticamente qual é o delimitador predominante do arquivo: vírgula (,), ponto e vírgula (;) ou tabulação (Tab). Ele também verifica cabeçalhos em branco (EMPTY_HEADER_NAME), colunas repetidas (DUPLICATE_HEADER) e colunas obrigatórias ausentes (REQUIRED_HEADER_MISSING).',
      'Em seguida, ao processar cada linha de dados (respeitando campos entre aspas e escape de aspas duplas ""), o validador compara a quantidade de células encontradas com o número de colunas do cabeçalho. Qualquer divergência gera o erro COLUMN_COUNT_MISMATCH informando exatamente quantas colunas a linha possui versus quantas o cabeçalho exige.',
    ],
    examples: [
      {
        rawValue: '000101,"Alpha Tecnologia, Sistemas LTDA",12.345.678/0001-95',
        status: 'Válido (3 colunas = 3 cabeçalhos)',
        explanation: 'A vírgula interna na razão social está protegida entre aspas duplas segundo a norma RFC 4180.',
      },
      {
        rawValue: '000101,Alpha Tecnologia, Sistemas LTDA,12.345.678/0001-95',
        status: 'Rejeitado (COLUMN_COUNT_MISMATCH)',
        explanation: 'Vírgula sem aspas divide a razão social em duas células: a linha passa a ter 4 colunas enquanto o cabeçalho tem 3.',
      },
      {
        rawValue: '000101,Alpha Tecnologia LTDA',
        status: 'Rejeitado (COLUMN_COUNT_MISMATCH)',
        explanation: 'Delimitador final ausente: a linha possui apenas 2 colunas quando o cabeçalho exige 3.',
      },
    ],
    steps: [
      'Faça o upload do seu arquivo CSV no DataConform (não importa se separado por vírgula, ponto e vírgula ou Tab).',
      'Verifique no laudo se existem apontamentos de COLUMN_COUNT_MISMATCH, EMPTY_HEADER_NAME ou DUPLICATE_HEADER.',
      'Abra as linhas indicadas pelo número de linha do relatório, envolva textos com delimitadores internos entre aspas duplas e revalide o arquivo.',
    ],
    faqs: [
      {
        question: 'Preciso configurar se meu CSV usa vírgula (,) ou ponto e vírgula (;)?',
        answer:
          'Não. O algoritmo DetectDelimiter do DataConform analisa o cabeçalho do arquivo ignorando textos entre aspas e seleciona automaticamente vírgula, ponto e vírgula ou tabulação.',
      },
      {
        question: 'O DataConform suporta células que contêm vírgulas ou ponto e vírgula dentro de aspas duplas?',
        answer:
          'Sim. O parser RFC 4180 do DataConform respeita campos delimitados por aspas duplas ("...") e aspas escapadas (""), contando corretamente as colunas.',
      },
      {
        question: 'O que significa o aviso EMPTY_HEADER_NAME na Linha #1?',
        answer:
          'Significa que sua planilha possui um delimitador sobrando no final do cabeçalho ou uma coluna sem título no Excel, gerando uma coluna em branco na posição indicada.',
      },
    ],
    relatedRules: [
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'remover-identificar-linhas-duplicadas-csv',
      'validar-cpf-cnpj-em-massa-csv',
      'validar-ncm-planilha-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa2-fornecedores',
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-senior-erp-e085cli-clientes',
      'layout-importacao-contaazul-clientes',
    ],
  },
  {
    slug: 'remover-identificar-linhas-duplicadas-csv',
    issueCode: 'DUPLICATE_ROW',
    severity: 'Aviso (Warning — contabiliza linha com inconsistência)',
    shortTitle: 'Identificar Linhas Duplicadas no CSV',
    title: 'Como Identificar Linhas Duplicadas em Planilha CSV Antes de Importar | DataConform',
    metaDescription:
      'Localize registros duplicados na sua planilha CSV antes de importar no ERP. Auditoria ultrarrápida com hash 64 bits (XxHash64) e exportação das linhas repetidas.',
    h1: 'Como Identificar Linhas Duplicadas em Planilha CSV Antes da Carga no ERP',
    lead:
      'Evite erros de chave primária duplicada (Primary Key / Unique Constraint) ou cadastros clonados na migração do seu ERP. O DataConform rastreia linhas repetidas com algoritmo XxHash64 de alta performance.',
    detectedColumns: [
      'Linha inteira normalizada (independentemente de diferenças entre letras maiúsculas e minúsculas ou espaços nas extremidades)',
    ],
    problemParagraphs: [
      'Durante projetos de migração de dados ou consolidação de planilhas vindas de diversas filiais e representantes comerciais, é extremamente comum que o mesmo cliente, fornecedor ou produto apareça repetido em linhas diferentes do arquivo CSV. Quando o lote é submetido ao ERP (como na tabela SA1/SA2 do Protheus, OCRD do SAP Business One ou TGFPAR do Sankhya), a segunda ocorrência dispara erro de violação de índice único no banco de dados ou, pior, cria registros duplicados caso a numeração seja sequencial automática.',
      'Em planilhas com 50.000 ou 500.000 linhas, procurar duplicidades manualmente no Excel trava a máquina. O DataConform resolve esse gargalo durante a leitura em streaming do arquivo.',
    ],
    howItWorksParagraphs: [
      'Para cada linha não vazia do arquivo CSV, o motor do DataConform remove espaços em branco excedentes no início e no fim (Trim), normaliza o conteúdo para letras maiúsculas (ToUpperInvariant) e calcula uma assinatura criptográfica rápida de 64 bits utilizando o algoritmo XxHash64.',
      'Se o hash calculado já tiver sido visto em qualquer linha anterior do mesmo arquivo, o validador emite o código DUPLICATE_ROW, apontando o número exato da linha repetida e exibindo o conteúdo do registro para que você possa higienizar a base antes da carga.',
    ],
    examples: [
      {
        rawValue: 'Linha #12: 000101,01,Alpha Tecnologia LTDA,12.345.678/0001-95',
        status: 'Válido (1ª ocorrência)',
        explanation: 'Primeira vez que o registro aparece no arquivo: hash XxHash64 armazenado na tabela de controle.',
      },
      {
        rawValue: 'Linha #845: 000101,01,ALPHA TECNOLOGIA LTDA,12.345.678/0001-95',
        status: 'Sinalizado (DUPLICATE_ROW)',
        explanation: 'Registro idêntico à Linha #12 (mesmo com diferença de maiúsculas/minúsculas), detectado pelo XxHash64.',
      },
    ],
    steps: [
      'Envie sua planilha CSV consolidada no DataConform escolhendo o preset do seu ERP ou Genérico / CSV.',
      'No relatório de validação, utilize o filtro de busca ou de avisos para listar todas as ocorrências de DUPLICATE_ROW.',
      'Exporte o CSV de inconsistências para identificar exatamente quais linhas remover na planilha original e gere o laudo PDF.',
    ],
    faqs: [
      {
        question: 'O DataConform detecta linhas duplicadas mesmo se uma estiver em maiúsculas e outra em minúsculas?',
        answer:
          'Sim. Antes de calcular o hash XxHash64 de 64 bits, o motor normaliza a linha para maiúsculas (ToUpperInvariant) e remove espaços nas extremidades, capturando duplicidades independentemente de caixa alta ou baixa.',
      },
      {
        question: 'E se houver duas colunas com o mesmo nome no cabeçalho da planilha?',
        answer:
          'Para colunas repetidas na linha #1, o DataConform emite um erro específico chamado DUPLICATE_HEADER, impedindo ambiguidade no mapeamento de campos do ERP.',
      },
      {
        question: 'Qual o limite de linhas para verificar duplicidades no DataConform?',
        answer:
          'Graças ao uso de hashes de 64 bits (XxHash64) em memória durante a leitura em stream, o DataConform processa até 1.000 linhas no plano Starter, 50.000 linhas no Professional e 1.000.000 de linhas no Enterprise.',
      },
    ],
    relatedRules: [
      'erro-colunas-delimitador-quebrado-csv',
      'validar-cpf-cnpj-em-massa-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'validar-ncm-planilha-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa2-fornecedores',
      'layout-importacao-sap-business-one-oitm-itens',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'validar-email-em-lote-planilha-csv',
    issueCode: 'INVALID_EMAIL_FORMAT',
    severity: 'Erro (Error)',
    shortTitle: 'Validar E-mails em Lote no CSV',
    title: 'Validar E-mails em Lote na Planilha CSV (NF-e e Cobrança ERP) | DataConform',
    metaDescription:
      'Valide endereços de e-mail em lote na sua planilha CSV antes de importar no ERP. Bloqueie e-mails sem @, sem domínio ou com espaços que travam o envio de NF-e.',
    h1: 'Como Validar E-mails em Lote na Planilha CSV para Faturamento e NF-e no ERP',
    lead:
      'Garanta que 100% dos e-mails de clientes e fornecedores na sua planilha CSV tenham formato válido antes da carga no ERP. Evite falhas no disparo automático de XML/DANFE e boletos bancários.',
    detectedColumns: [
      'A1_EMAIL (TOTVS Protheus SA1)',
      'A2_EMAIL (TOTVS Protheus SA2)',
      'E_Mail (SAP Business One OCRD / SAP S/4HANA BP)',
      'EmaCli (Senior ERP E085CLI)',
      'EMAIL / email / e-mail (Sankhya TGFPAR, Omie, ContaAzul, Genérico)',
    ],
    problemParagraphs: [
      'Nos ERPs corporativos modernos, a coluna de e-mail do cadastro de clientes e fornecedores não é apenas informativa: ela aciona os jobs automáticos de mensageria fiscal (envio do arquivo XML e PDF da DANFE após autorização da NF-e) e as réguas de cobrança bancária. Quando planilhas legadas trazem textos como "nao tem", nomes de contato junto ao endereço, espaços em branco internos ou domínios sem ponto (ex.: financeiro@empresa), a rotina de importação falha ou a fila de envio de e-mails do ERP entra em estado de erro.',
      'O DataConform audita automaticamente todas as colunas de e-mail da sua planilha CSV, aplicando a regra INVALID_EMAIL_FORMAT linha a linha.',
    ],
    howItWorksParagraphs: [
      'O motor de validação identifica qualquer coluna cujo nome contenha "email", "e-mail", "e_mail" ou seja igual a "emacli" (padrão Senior ERP). Em cada linha preenchida, o valor é testado contra a expressão regular compilada ^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$.',
      'Essa verificação garante que o endereço contenha exatamente uma estrutura de usuário local, o símbolo @, um domínio válido com ponto e extensão, e zero espaços em branco em qualquer posição. Registros que violam esse padrão são destacados no relatório com o número da linha e o texto exato rejeitado.',
    ],
    examples: [
      {
        rawValue: 'fiscal@alphatech.com.br',
        status: 'Válido (Aprovado)',
        explanation: 'Endereço eletrônico corporativo íntegro com usuário, @ e domínio completo.',
      },
      {
        rawValue: 'nfe-sem-dominio',
        status: 'Rejeitado (INVALID_EMAIL_FORMAT)',
        explanation: 'Ausência do caractere @ e do domínio de destino.',
      },
      {
        rawValue: 'contato@empresa',
        status: 'Rejeitado (INVALID_EMAIL_FORMAT)',
        explanation: 'Domínio incompleto sem extensão (falta o ponto e o TLD como .com ou .com.br).',
      },
      {
        rawValue: 'financeiro@empresa.com.br (João)',
        status: 'Rejeitado (INVALID_EMAIL_FORMAT)',
        explanation: 'Contém espaços em branco e anotações de texto que quebram o envio SMTP do ERP.',
      },
    ],
    steps: [
      'Exporte sua planilha cadastral em CSV mantendo a coluna de e-mail (A1_EMAIL, E_Mail, EmaCli, EMAIL).',
      'Submeta o arquivo ao DataConform usando o preset do seu ERP para auditar todos os endereços em segundos.',
      'Baixe o CSV de inconsistências filtrado por INVALID_EMAIL_FORMAT, limpe os endereços inválidos e gere o laudo em PDF.',
    ],
    faqs: [
      {
        question: 'Quais nomes de coluna acionam a validação de e-mail automaticamente?',
        answer:
          'Qualquer coluna que contenha os termos email, e-mail ou e_mail (como A1_EMAIL, A2_EMAIL, E_Mail, email_nfe), além do campo EmaCli da tabela E085CLI do Senior ERP.',
      },
      {
        question: 'Se a coluna de e-mail for obrigatória no preset do ERP e estiver vazia, qual erro aparece?',
        answer:
          'Quando o campo faz parte das colunas obrigatórias do preset e está em branco, o DataConform aponta REQUIRED_FIELD_MISSING. Quando está preenchido com um texto inválido, aponta INVALID_EMAIL_FORMAT.',
      },
      {
        question: 'Posso testar essa validação agora mesmo sem cadastro?',
        answer:
          'Sim. No simulador interativo da página inicial do DataConform você pode ver o código INVALID_EMAIL_FORMAT em ação nos cenários TOTVS Protheus, SAP Business One e Sankhya.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'erro-colunas-delimitador-quebrado-csv',
      'validar-uf-estado-planilha-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-senior-erp-e085cli-clientes',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'validar-uf-estado-planilha-csv',
    issueCode: 'INVALID_UF_CODE',
    severity: 'Erro (Error)',
    shortTitle: 'Validar Sigla de UF e Estado no CSV',
    title: 'Validar UF e Sigla de Estado em Planilha CSV (IBGE / SEFAZ) | DataConform',
    metaDescription:
      'Valide a coluna de UF/Estado na sua planilha CSV antes de importar no ERP. Garanta que todos os registros usem as 27 siglas oficiais do Brasil ou EX (Exterior).',
    h1: 'Como Validar Sigla de UF (Estado) em Planilha CSV para Importação em ERPs',
    lead:
      'Impeça que nomes de estados por extenso ("São Paulo") ou siglas inexistentes ("XX", "ZZ") entrem no cadastro do seu ERP e travem o cálculo de ICMS e DIFAL. O DataConform valida as 27 UFs brasileiras e EX em lote.',
    detectedColumns: [
      'A1_EST (TOTVS Protheus SA1)',
      'A2_EST (TOTVS Protheus SA2)',
      'CodEst (Senior ERP E085CLI)',
      'State (SAP S/4HANA BP)',
      'estado (Omie)',
      'uf / UF (ContaAzul, Genérico)',
      'Colunas terminadas em _est ou iniciadas por uf_ (exceto status)',
    ],
    problemParagraphs: [
      'A Unidade Federativa (UF) do cliente ou fornecedor é o parâmetro determinante para o motor tributário de qualquer ERP no Brasil: ela define se a operação é interna ou interestadual, qual alíquota de ICMS aplicar (7%, 12%, 18%, 4%) e se há cobrança de DIFAL ou Substituição Tributária. Em planilhas vindas de formulários web ou CRMs, é muito comum encontrar o nome do estado escrito por extenso ("Minas Gerais", "Paraná"), siglas inventadas para testes ("XX", "ZZ") ou erros de digitação ("SP ", "RJ1").',
      'Nos dicionários de dados de ERPs como TOTVS Protheus (A1_EST / A2_EST), Senior (CodEst) e SAP S/4HANA (State), o campo aceita apenas 2 caracteres vinculados à tabela oficial de estados. Valores fora da lista oficial travam a importação ou impedem o faturamento.',
    ],
    howItWorksParagraphs: [
      'O validador do DataConform possui um conjunto indexado (HashSet case-insensitive) com as 27 siglas oficiais das Unidades Federativas brasileiras (AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO) mais a sigla especial EX utilizada em ERPs para clientes e fornecedores no exterior.',
      'Ao inspecionar colunas de UF/Estado, o motor remove espaços laterais e verifica se a sigla consta na tabela oficial. Qualquer valor divergente recebe o apontamento INVALID_UF_CODE com indicação da linha, coluna e valor rejeitado.',
    ],
    examples: [
      {
        rawValue: 'SP, RJ, MG, PR, RS, SC, BA...',
        status: 'Válido (Aprovado)',
        explanation: 'Sigla oficial pertencente às 27 Unidades Federativas do Brasil.',
      },
      {
        rawValue: 'EX',
        status: 'Válido (Aprovado)',
        explanation: 'Sigla oficial para operações de importação/exportação com parceiros no exterior.',
      },
      {
        rawValue: 'São Paulo',
        status: 'Rejeitado (INVALID_UF_CODE)',
        explanation: 'Nome do estado por extenso no lugar da sigla de 2 letras (SP).',
      },
      {
        rawValue: 'XX / ZZ / BR',
        status: 'Rejeitado (INVALID_UF_CODE)',
        explanation: 'Sigla inexistente na tabela oficial IBGE/SEFAZ de Unidades Federativas.',
      },
    ],
    steps: [
      'Certifique-se de que sua planilha CSV utiliza siglas de 2 letras na coluna de estado (A1_EST, A2_EST, CodEst, State, estado ou uf).',
      'Envie o arquivo no DataConform selecionando o preset do seu ERP para auditar todas as linhas.',
      'Caso existam erros INVALID_UF_CODE, exporte o CSV de inconsistências, substitua pelas siglas oficiais e gere o laudo PDF.',
    ],
    faqs: [
      {
        question: 'Quais são todas as 28 siglas aceitas pela regra de UF do DataConform?',
        answer:
          'São as 27 siglas estaduais e distrital do Brasil (AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO) mais a sigla EX para Exterior.',
      },
      {
        question: 'A validação diferencia letras maiúsculas de minúsculas (ex.: sp vs SP)?',
        answer:
          'O comparador do DataConform é case-insensitive (aceita sp ou SP), mas recomendamos padronizar em letras maiúsculas para total compatibilidade com o dicionário do seu ERP.',
      },
      {
        question: 'O DataConform confunde a coluna "status" com coluna de estado?',
        answer:
          'Não. O motor possui uma trava explícita para nunca aplicar a regra de UF sobre colunas chamadas "status", evitando falsos positivos.',
      },
    ],
    relatedRules: [
      'validar-cep-em-lote-csv',
      'validar-cpf-cnpj-em-massa-csv',
      'validar-email-em-lote-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-protheus-sa2-fornecedores',
      'layout-importacao-senior-erp-e085cli-clientes',
      'layout-importacao-sap-s4hana-business-partner',
    ],
  },
];
