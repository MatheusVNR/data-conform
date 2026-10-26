export const ERP_SEO_PAGES = [
  {
    slug: 'layout-importacao-protheus-sa1-clientes',
    erpKey: 'TOTVS Protheus',
    shortKey: 'protheus-sa1',
    systemName: 'TOTVS Protheus',
    tableCode: 'SA1 (Clientes)',
    moduleReference: 'Tabela SA1 (Clientes — SIGAFAT / SIGAFIN) • Rotina MATA030',
    title: 'Layout de Importação TOTVS Protheus SA1 (Clientes) em CSV | DataConform',
    metaDescription:
      'Baixe e valide o layout CSV da tabela SA1 (Clientes) do TOTVS Protheus (MATA030). Verifique A1_COD, A1_LOJA, A1_CGC, A1_EMAIL, A1_EST e A1_CEP antes da carga.',
    h1: 'Layout de Importação TOTVS Protheus SA1 (Clientes): Validação de CSV para MATA030',
    lead:
      'Homologue sua planilha de clientes segundo o dicionário SX3 da tabela SA1 antes de executar a rotina automática MATA030 ou o MILE no TOTVS Protheus. Intercepte erros de CNPJ/CPF, CEP, UF, limite de crédito e codificação UTF-8 linha a linha.',
    purposeParagraphs: [
      'A tabela SA1 (Cadastro de Clientes) alimenta os módulos SIGAFAT, SIGAFIN e SIGACOM no TOTVS Protheus. Em cargas via ExecAuto (MATA030) ou MILE, a importação exige aderência estrita ao dicionário SX3 para evitar bloqueios de NF-e na SEFAZ.',
      'O preset do DataConform para TOTVS Protheus SA1 audita o arquivo CSV antes da carga: confere o cabeçalho, valida CPF e CNPJ em A1_CGC por Módulo 11, checa siglas estaduais em A1_EST, exige 8 dígitos em A1_CEP e bloqueia valores negativos em A1_LC.',
    ],
    sampleFileName: 'layout_totvs_protheus_sa1.csv',
    sampleCsvContent: [
      'A1_COD,A1_LOJA,A1_NOME,A1_CGC,A1_EMAIL,A1_LC,A1_EST,A1_CEP',
      '000101,01,Alpha Tecnologia e Sistemas LTDA,12.345.678/0001-95,fiscal@alphatech.com.br,50000.00,SP,01001-000',
      '000102,01,Beta Logistica Integrada SA,11.222.333/0001-81,financeiro@betalog.com.br,120000.50,PR,80020-100',
      '000103,01,Fornecedor com CNPJ Incorreto LTDA,12.345.678/0001-00,contato@empresa.com.br,25000.00,SC,88010-000',
      '000104,01,Cliente com Limite Negativo ME,06.990.590/0001-23,email-invalido-sem-arroba.com,-4500.00,XX,1234',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'A1_COD',
        description: 'Código identificador único do cliente no dicionário SX3.',
        example: '000101',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'A1_LOJA',
        description: 'Código da filial ou loja vinculada ao cliente na tabela SA1.',
        example: '01',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'A1_NOME',
        description: 'Razão social ou nome completo do cliente para faturamento.',
        example: 'Alpha Tecnologia e Sistemas LTDA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'A1_CGC',
        description: 'Documento fiscal (CNPJ 14 dígitos ou CPF 11 dígitos) com validação Módulo 11.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'A1_EMAIL',
        description: 'E-mail corporativo para envio de XML e DANFE de Nota Fiscal Eletrônica.',
        example: 'fiscal@alphatech.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'A1_LC',
        description: 'Limite de crédito aprovado no módulo SIGAFIN (decimal não negativo).',
        example: '50000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'A1_EST',
        description: 'Sigla da UF (27 estados brasileiros ou EX para clientes no exterior).',
        example: 'SP',
        ruleCode: 'INVALID_UF_CODE',
      },
      {
        name: 'A1_CEP',
        description: 'Código de Endereçamento Postal com exatamente 8 dígitos numéricos.',
        example: '01001-000',
        ruleCode: 'INVALID_CEP_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'A1_CGC',
        title: 'CNPJ/CPF com dígito verificador inválido ou zero à esquerda suprimido',
        detail:
          'O Excel costuma converter A1_CGC em número e apagar zeros iniciais. O DataConform recalcula os dois dígitos verificadores (Módulo 11) e rejeita sequências repetidas.',
      },
      {
        code: 'INVALID_CEP_FORMAT',
        field: 'A1_CEP',
        title: 'CEP com 7 dígitos para clientes de São Paulo e Nordeste',
        detail:
          'CEPs iniciados por zero (ex.: 01001-000) perdem o primeiro dígito ao serem salvos como inteiro. O validador exige 8 dígitos e bloqueia 00000000.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'A1_EST',
        title: 'Nome do estado por extenso no lugar da sigla da UF',
        detail:
          'O campo A1_EST aceita apenas 2 caracteres no SX3. O motor valida se o valor pertence às 27 siglas estaduais brasileiras ou EX.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'A1_LC',
        title: 'Limite de crédito negativo ou texto mal formatado',
        detail:
          'Valores negativos ou símbolos corrompidos em A1_LC travam a análise de crédito. O DataConform valida a conversão decimal e bloqueia saldos negativos.',
      },
    ],
    steps: [
      'Exporte sua base de clientes em CSV mantendo na primeira linha os campos exatos do SX3: A1_COD, A1_LOJA, A1_NOME, A1_CGC, A1_EMAIL, A1_LC, A1_EST e A1_CEP.',
      'No DataConform, selecione o preset "TOTVS Protheus" (Tabela SA1) e faça o upload do arquivo para inspeção estrutural e semântica.',
      'Filtre os desvios no laudo, baixe o CSV de inconsistências para correção e gere o laudo em PDF antes de liberar a carga no MATA030.',
    ],
    faqs: [
      {
        question: 'Posso enviar o campo A1_CGC com ou sem pontuação?',
        answer:
          'Sim. O motor extrai os dígitos numéricos de A1_CGC antes de validar a quantidade (11 ou 14 dígitos) e calcular o Módulo 11.',
      },
      {
        question: 'O DataConform aceita clientes estrangeiros na tabela SA1?',
        answer:
          'Sim. Na coluna A1_EST, além das 27 Unidades Federativas do Brasil, o validador aceita oficialmente a sigla EX.',
      },
      {
        question: 'Como evitar que acentos em A1_NOME fiquem corrompidos?',
        answer:
          'Salve a planilha como CSV UTF-8. Caso existam caracteres ANSI corrompidos, o DataConform aponta o erro ENCODING_CORRUPTION na linha exata.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-cep-em-lote-csv',
      'validar-uf-estado-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa2-fornecedores',
      'layout-importacao-protheus-sb1-produtos',
      'layout-importacao-senior-erp-e085cli-clientes',
    ],
  },
  {
    slug: 'layout-importacao-protheus-sa2-fornecedores',
    erpKey: 'TOTVS Protheus - Fornecedores',
    shortKey: 'protheus-sa2',
    systemName: 'TOTVS Protheus - Fornecedores',
    tableCode: 'SA2 (Fornecedores)',
    moduleReference: 'Tabela SA2 (Fornecedores — SIGACOM / SIGAFIN) • Rotina MATA020',
    title: 'Layout de Importação TOTVS Protheus SA2 (Fornecedores) CSV | DataConform',
    metaDescription:
      'Valide planilhas CSV de fornecedores para a tabela SA2 do TOTVS Protheus (MATA020). Homologue as colunas A2_COD, A2_LOJA, A2_NOME, A2_CGC, A2_EMAIL, A2_LC e A2_EST.',
    h1: 'Layout de Importação TOTVS Protheus SA2 (Fornecedores): Validação para MATA020',
    lead:
      'Audite sua carga de fornecedores da tabela SA2 (SIGACOM e SIGAFIN) antes de rodar a rotina automática MATA020 no TOTVS Protheus. Garanta integridade de CNPJ/CPF, UF, e-mail e limites com laudo em PDF.',
    purposeParagraphs: [
      'A tabela SA2 concentra o cadastro de fornecedores, prestadores e transportadoras no TOTVS Protheus, alimentando Compras (SIGACOM), Contas a Pagar (SIGAFIN) e Livros Fiscais (SIGAFIS). Quando uma migração via MATA020 ou MILE ocorre com dados inconsistentes, surgem bloqueios no lançamento de notas de entrada (MATA103), falhas na EFD-Reinf/SPED Fiscal e rejeições em remessas CNAB.',
      'Com o preset "TOTVS Protheus - Fornecedores" do DataConform, você valida o CSV completo em segundos. A ferramenta confere a estrutura RFC 4180, exige todas as colunas obrigatórias da SA2, audita o CNPJ/CPF em A2_CGC por Módulo 11, verifica o e-mail em A2_EMAIL e inspeciona a UF em A2_EST.',
    ],
    sampleFileName: 'layout_totvs_protheus_sa2.csv',
    sampleCsvContent: [
      'A2_COD,A2_LOJA,A2_NOME,A2_CGC,A2_EMAIL,A2_LC,A2_EST,A2_CEP',
      'F00101,01,Industria Metalurgica Vale SA,12.345.678/0001-95,suprimentos@valeind.com.br,200000.00,MG,30140-071',
      'F00102,01,Distribuidora Fornecedora LTDA,11.222.333/0001-81,vendas@distribuidora.com.br,75000.00,SP,04571-010',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'A2_COD',
        description: 'Código único do fornecedor no dicionário SX3 da tabela SA2.',
        example: 'F00101',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'A2_LOJA',
        description: 'Código da loja/unidade do fornecedor associada ao CNPJ.',
        example: '01',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'A2_NOME',
        description: 'Razão social oficial do fornecedor ou nome do prestador.',
        example: 'Industria Metalurgica Vale SA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'A2_CGC',
        description: 'CNPJ (14 dígitos) ou CPF (11 dígitos) com dígito verificador válido.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'A2_EMAIL',
        description: 'E-mail corporativo para pedidos de compra, cotações e avisos financeiros.',
        example: 'suprimentos@valeind.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'A2_LC',
        description: 'Limite operacional/crédito parametrizado para o fornecedor.',
        example: '200000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'A2_EST',
        description: 'Sigla da UF do fornecedor (27 estados brasileiros ou EX).',
        example: 'MG',
        ruleCode: 'INVALID_UF_CODE',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'A2_CGC',
        title: 'CNPJ de filial com erro de digitação no dígito verificador',
        detail:
          'Alterar o sufixo de filial (0001, 0002) sem recalcular os dois dígitos finais invalida o CNPJ em A2_CGC e trava o recebimento fiscal no SIGACOM.',
      },
      {
        code: 'DUPLICATE_ROW',
        field: 'Linha completa',
        title: 'Fornecedores duplicados na unificação de planilhas',
        detail:
          'Linhas repetidas geram falha de chave única (X2_UNICO) na SA2. O DataConform calcula o hash XxHash64 de cada linha e aponta duplicidades exatas.',
      },
      {
        code: 'COLUMN_COUNT_MISMATCH',
        field: 'A2_NOME',
        title: 'Vírgulas na razão social sem aspas quebrando o delimitador',
        detail:
          'Vírgulas não escapadas deslocam as colunas seguintes, jogando texto para dentro de A2_CGC. O motor detecta a divergência de colunas na linha.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'A2_EST',
        title: 'UF inválida impedindo cálculo de DIFAL e ICMS-ST',
        detail:
          'A coluna A2_EST define a alíquota interestadual de compras. Siglas inválidas bloqueiam o cálculo de impostos na entrada da nota.',
      },
    ],
    steps: [
      'Estruture o CSV com as colunas obrigatórias A2_COD, A2_LOJA, A2_NOME, A2_CGC, A2_EMAIL, A2_LC e A2_EST (e opcionalmente A2_CEP).',
      'No DataConform, selecione o preset "TOTVS Protheus - Fornecedores" e envie a planilha para auditoria.',
      'Baixe a lista de inconsistências em CSV para saneamento e emita o laudo em PDF antes de executar o MATA020.',
    ],
    faqs: [
      {
        question: 'Se eu incluir a coluna A2_CEP no arquivo, o DataConform também a valida?',
        answer:
          'Sim. O motor semântico reconhece automaticamente a coluna A2_CEP e verifica se todos os CEPs possuem 8 dígitos válidos.',
      },
      {
        question: 'Qual delimitador devo usar na planilha SA2?',
        answer:
          'O DataConform detecta automaticamente vírgula (,), ponto e vírgula (;) ou tabulação (Tab) no cabeçalho do arquivo.',
      },
      {
        question: 'Posso validar fornecedores pessoa física (autônomos) na mesma carga SA2?',
        answer:
          'Sim. A coluna A2_CGC aceita tanto CNPJ (14 dígitos) quanto CPF (11 dígitos), aplicando o cálculo de Módulo 11 correspondente.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'remover-identificar-linhas-duplicadas-csv',
      'erro-colunas-delimitador-quebrado-csv',
      'validar-uf-estado-planilha-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-protheus-sb1-produtos',
      'layout-importacao-sankhya-tgfpar-parceiros',
    ],
  },
  {
    slug: 'layout-importacao-protheus-sb1-produtos',
    erpKey: 'TOTVS Protheus - Produtos',
    shortKey: 'protheus-sb1',
    systemName: 'TOTVS Protheus - Produtos',
    tableCode: 'SB1 (Produtos)',
    moduleReference: 'Tabela SB1 (Catálogo de Itens / Estoque — SIGAEST) • Rotina MATA010',
    title: 'Layout de Importação TOTVS Protheus SB1 (Produtos e NCM) CSV | DataConform',
    metaDescription:
      'Homologue a planilha CSV de produtos para a tabela SB1 do TOTVS Protheus (MATA010). Valide B1_COD, B1_DESC, B1_TIPO, B1_UM, NCM (B1_POSIPI) e preço (B1_PRV1).',
    h1: 'Layout de Importação TOTVS Protheus SB1 (Produtos): Validação de NCM e Preços',
    lead:
      'Audite o catálogo de produtos e materiais antes da carga na tabela SB1 (rotina MATA010 / SIGAEST) do TOTVS Protheus. Bloqueie códigos NCM truncados em B1_POSIPI, preços negativos em B1_PRV1 e descrições corrompidas.',
    purposeParagraphs: [
      'A tabela SB1 (Descrição Genérica do Produto) sustenta os módulos de Estoque (SIGAEST), Compras (SIGACOM), Faturamento (SIGAFAT) e PCP no TOTVS Protheus. Na migração de SKUs via MATA010, erros na classificação fiscal NCM (B1_POSIPI) ou na formatação do preço base (B1_PRV1) causam rejeição de NF-e na SEFAZ e distorções no cálculo de IPI, ICMS-ST e PIS/COFINS.',
      'O preset "TOTVS Protheus - Produtos" do DataConform inspeciona cada item antes da importação no ERP. Ele garante que as 6 colunas obrigatórias do SX3 estejam preenchidas, verifica se o código NCM em B1_POSIPI contém exatamente 8 dígitos numéricos e valida a integridade decimal do preço de venda em B1_PRV1.',
    ],
    sampleFileName: 'layout_totvs_protheus_sb1.csv',
    sampleCsvContent: [
      'B1_COD,B1_DESC,B1_TIPO,B1_UM,B1_POSIPI,B1_PRV1',
      'PRD001,Servidor Rack Corporativo Xeon,PA,UN,8471.49.00,18500.00',
      'PRD002,Licenca de Software Operacional,SV,UN,8523.49.20,1200.00',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'B1_COD',
        description: 'Código único do item/produto no estoque (chave primária na SB1).',
        example: 'PRD001',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'B1_DESC',
        description: 'Descrição técnica e comercial do produto impressa na DANFE.',
        example: 'Servidor Rack Corporativo Xeon',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'B1_TIPO',
        description: 'Tipo do item no Protheus (ex.: PA Produto Acabado, MP Matéria-Prima, SV).',
        example: 'PA',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'B1_UM',
        description: 'Unidade de medida principal vinculada à tabela SAH (UN, KG, PC, CX).',
        example: 'UN',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'B1_POSIPI',
        description: 'Código NCM fiscal de 8 dígitos numéricos obrigatórios.',
        example: '8471.49.00',
        ruleCode: 'INVALID_NCM_FORMAT',
      },
      {
        name: 'B1_PRV1',
        description: 'Preço padrão de venda na tabela 1 (decimal maior ou igual a zero).',
        example: '18500.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_NCM_FORMAT',
        field: 'B1_POSIPI',
        title: 'NCM com 7 dígitos (zero à esquerda cortado pelo Excel)',
        detail:
          'Itens dos capítulos 01 a 09 possuem NCM iniciado por zero. Quando o Excel formata a coluna como número, o código fica com 7 dígitos e trava a emissão de NF-e. O DataConform exige 8 dígitos.',
      },
      {
        code: 'INVALID_NUMERIC_VALUE',
        field: 'B1_PRV1',
        title: 'Preço de venda com texto ou fórmula quebrada',
        detail:
          'Observações como "Sob consulta" ou traços no campo numérico B1_PRV1 provocam falha de conversão de tipo no ExecAuto MATA010.',
      },
      {
        code: 'ENCODING_CORRUPTION',
        field: 'B1_DESC',
        title: 'Símbolos técnicos e acentos corrompidos na descrição',
        detail:
          'Catálogos salvos fora do padrão UTF-8 geram o caractere de substituição Unicode na descrição do produto.',
      },
      {
        code: 'REQUIRED_FIELD_MISSING',
        field: 'B1_UM / B1_TIPO',
        title: 'SKUs sem unidade de medida ou tipo de material',
        detail:
          'A ausência de B1_UM ou B1_TIPO impede a gravação do registro na SB1. O DataConform lista exatamente quais linhas estão incompletas.',
      },
    ],
    steps: [
      'Gere o arquivo CSV do catálogo contendo o cabeçalho B1_COD, B1_DESC, B1_TIPO, B1_UM, B1_POSIPI e B1_PRV1.',
      'Carregue o arquivo no DataConform com o preset "TOTVS Protheus - Produtos" para validar NCMs e preços em lote.',
      'Exporte os itens com falha para saneamento fiscal e emita o laudo em PDF antes da carga na tabela SB1.',
    ],
    faqs: [
      {
        question: 'O campo B1_POSIPI pode ser validado com pontos (8471.49.00) ou somente números (84714900)?',
        answer:
          'Ambos os formatos são aceitos. O DataConform extrai os dígitos numéricos e verifica se o código NCM contém exatamente 8 dígitos.',
      },
      {
        question: 'Como o DataConform trata vírgula e ponto decimal em B1_PRV1?',
        answer:
          'O validador reconhece tanto o padrão internacional (18500.00) quanto o brasileiro (18.500,00 ou 18500,00), rejeitando textos e valores negativos.',
      },
      {
        question: 'Quantos produtos posso validar por arquivo CSV da SB1?',
        answer:
          'Até 1.000 linhas no plano Starter Gratuito, até 50.000 linhas no plano Professional e até 1.000.000 de linhas no plano Enterprise.',
      },
    ],
    relatedRules: [
      'validar-ncm-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'erro-colunas-delimitador-quebrado-csv',
      'remover-identificar-linhas-duplicadas-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-protheus-sa2-fornecedores',
      'layout-importacao-sap-business-one-oitm-itens',
    ],
  },
  {
    slug: 'layout-importacao-sap-business-one-ocrd-parceiros',
    erpKey: 'SAP Business One',
    shortKey: 'sap-b1-ocrd',
    systemName: 'SAP Business One',
    tableCode: 'OCRD (Business Partners)',
    moduleReference: 'Objeto OCRD (Business Partners — DTW / Data Transfer Workbench)',
    title: 'Layout de Importação SAP Business One OCRD (DTW Parceiros) CSV | DataConform',
    metaDescription:
      'Valide planilhas CSV para o objeto OCRD (Parceiros de Negócios) no DTW do SAP Business One. Audite CardCode, CardName, LicTradNum, E_Mail, CreditLine e ZipCode.',
    h1: 'Layout de Importação SAP Business One OCRD (DTW): Homologação de Parceiros de Negócios',
    lead:
      'Prepare e valide arquivos CSV para o Data Transfer Workbench (DTW) do SAP Business One (objeto OCRD). Detecte erros em LicTradNum (CNPJ/CPF), E_Mail, CreditLine e ZipCode antes da execução da DI API.',
    purposeParagraphs: [
      'No SAP Business One, a carga inicial e atualização em massa de clientes, fornecedores e leads ocorrem via Data Transfer Workbench (DTW) apontando para o objeto OCRD (Business Partners). Como o DTW processa registros via DI API, inconsistências em documentos fiscais brasileiros, limites de crédito negativos ou CEPs truncados geram logs de erro extensos e atrasam o go-live.',
      'O preset "SAP Business One" do DataConform audita planilhas do objeto OCRD antes de abri-las no DTW. O motor verifica a presença obrigatória das colunas CardCode, CardName, LicTradNum, E_Mail, CreditLine e ZipCode, aplicando validação de Módulo 11 sobre LicTradNum e validação postal de 8 dígitos sobre ZipCode.',
    ],
    sampleFileName: 'layout_sap_b1_ocrd.csv',
    sampleCsvContent: [
      'CardCode,CardName,CardType,LicTradNum,E_Mail,CreditLine,ZipCode',
      'C10001,Horizonte Suprimentos Industriais SA,C,12.345.678/0001-95,nfe@horizontesupri.com.br,85000.00,01001-000',
      'C10002,Vanguarda Metalurgica LTDA,C,11.222.333/0001-81,compras@vanguarda.ind.br,140000.00,80020-100',
      'C10003,Parceiro Documento Invalido SA,C,12.345.678/0001-00,contato@parceiro.com,30000.00,88010-000',
      'C10004,Parceiro Credito Negativo ME,C,06.990.590/0001-23,email-incompleto.com,-9200.00,0000',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'CardCode',
        description: 'Código alfanumérico único do Parceiro de Negócios no SAP Business One.',
        example: 'C10001',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'CardName',
        description: 'Razão social ou nome completo do parceiro no objeto OCRD.',
        example: 'Horizonte Suprimentos Industriais SA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'LicTradNum',
        description: 'Identificador fiscal principal (CNPJ 14 dígitos ou CPF 11 dígitos).',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'E_Mail',
        description: 'E-mail principal utilizado para comunicação e mensageria de NF-e.',
        example: 'nfe@horizontesupri.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'CreditLine',
        description: 'Limite de crédito concedido ao parceiro (decimal não negativo).',
        example: '85000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'ZipCode',
        description: 'CEP do endereço principal contendo exatamente 8 dígitos numéricos.',
        example: '01001-000',
        ruleCode: 'INVALID_CEP_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'LicTradNum',
        title: 'Documento fiscal LicTradNum rejeitado nos add-ons fiscais do SAP B1',
        detail:
          'Sequências fictícias (99.999.999/0001-99) ou CNPJs com dígito verificador incorreto falham nos add-ons fiscais e no B1iSN. O DataConform valida o Módulo 11 de cada LicTradNum.',
      },
      {
        code: 'INVALID_CEP_FORMAT',
        field: 'ZipCode',
        title: 'ZipCode com menos de 8 dígitos ou preenchido com zeros',
        detail:
          'Planilhas DTW editadas no Excel perdem o zero inicial em CEPs de SP. O motor sinaliza qualquer ZipCode diferente de 8 dígitos ou igual a 00000000.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'CreditLine',
        title: 'Saldo devedor mapeado acidentalmente na coluna CreditLine',
        detail:
          'Exportar saldo negativo no lugar do limite de crédito causa rejeição no DTW. O validador bloqueia valores menores que zero em CreditLine.',
      },
      {
        code: 'INVALID_EMAIL_FORMAT',
        field: 'E_Mail',
        title: 'E-mails sem domínio válido ou com espaços em branco',
        detail:
          'A coluna E_Mail exige endereço eletrônico íntegro. Cadastros malformados travam o envio automático de boletos e XMLs.',
      },
    ],
    steps: [
      'Exporte seu template DTW do objeto OCRD em CSV mantendo as colunas CardCode, CardName, LicTradNum, E_Mail, CreditLine e ZipCode.',
      'Envie o arquivo no DataConform com o preset "SAP Business One" selecionado para inspecionar todos os parceiros.',
      'Corrija os registros listados no CSV de inconsistências e emita o laudo PDF antes de rodar a carga no DTW.',
    ],
    faqs: [
      {
        question: 'Posso manter colunas extras do DTW como CardType ou Phone1 no CSV?',
        answer:
          'Sim. O DataConform exige as 6 colunas obrigatórias do preset e também aplica validações semânticas caso encontre colunas como Phone1 ou State.',
      },
      {
        question: 'O DataConform reconhece a coluna LicTradNum automaticamente como CPF/CNPJ?',
        answer:
          'Sim. O motor possui mapeamento nativo do dicionário SAP Business One e aplica o cálculo de Módulo 11 diretamente sobre LicTradNum.',
      },
      {
        question: 'É possível testar uma amostra do arquivo OCRD sem criar conta?',
        answer:
          'Sim. Na página inicial você pode usar o simulador interativo com o cenário SAP Business One (DTW / OCRD) ou criar conta grátis no plano Starter.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-cep-em-lote-csv',
      'validar-email-em-lote-planilha-csv',
      'erro-colunas-delimitador-quebrado-csv',
    ],
    relatedErps: [
      'layout-importacao-sap-business-one-oitm-itens',
      'layout-importacao-sap-s4hana-business-partner',
      'layout-importacao-protheus-sa1-clientes',
    ],
  },
  {
    slug: 'layout-importacao-sap-business-one-oitm-itens',
    erpKey: 'SAP Business One - Itens',
    shortKey: 'sap-b1-oitm',
    systemName: 'SAP Business One - Itens',
    tableCode: 'OITM (Item Master Data)',
    moduleReference: 'Objeto OITM (Item Master Data — DTW / Data Transfer Workbench)',
    title: 'Layout de Importação SAP Business One OITM (Itens DTW) CSV | DataConform',
    metaDescription:
      'Audite sua planilha CSV do objeto OITM (Cadastro de Itens) para o DTW do SAP Business One. Valide ItemCode, ItemName, SalUnitMsr, Price e NcmCode em lote.',
    h1: 'Layout de Importação SAP Business One OITM (DTW): Validação de Itens e NcmCode',
    lead:
      'Homologue a planilha de dados mestres de itens (objeto OITM) antes de importar via Data Transfer Workbench (DTW) no SAP Business One. Valide códigos NCM (NcmCode), preços (Price) e unidades (SalUnitMsr) sem retrabalho.',
    purposeParagraphs: [
      'O objeto OITM (Item Master Data) armazena todo o catálogo de mercadorias, matérias-primas e serviços no SAP Business One. Em cargas via Data Transfer Workbench (DTW), erros no código NCM (NcmCode) ou inconsistências numéricas em preços impedem a determinação de código de imposto (Tax Code Determination) e geram rejeições fiscais no faturamento.',
      'O preset "SAP Business One - Itens" do DataConform automatiza a revisão técnica da planilha OITM. A ferramenta confere se as colunas obrigatórias ItemCode, ItemName, SalUnitMsr, Price e NcmCode estão presentes no cabeçalho, valida se cada NcmCode possui 8 dígitos numéricos e garante que todos os preços em Price sejam números decimais não negativos.',
    ],
    sampleFileName: 'layout_sap_b1_oitm.csv',
    sampleCsvContent: [
      'ItemCode,ItemName,SalUnitMsr,Price,NcmCode',
      'ITM001,Monitor Led 27 Polegadas 4K,PC,1650.00,8528.52.20',
      'ITM002,Teclado Mecanico USB Brasil,PC,320.50,8471.60.52',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'ItemCode',
        description: 'Código identificador único do item no mestre de materiais do SAP B1.',
        example: 'ITM001',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'ItemName',
        description: 'Descrição comercial do item no objeto OITM (em UTF-8).',
        example: 'Monitor Led 27 Polegadas 4K',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'SalUnitMsr',
        description: 'Unidade de medida de vendas padrão do item (ex.: PC, UN, KG, CX).',
        example: 'PC',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'Price',
        description: 'Preço unitário base do item para validação financeira (decimal não negativo).',
        example: '1650.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'NcmCode',
        description: 'Código NCM fiscal vinculado à tabela ONCM do SAP B1 (8 dígitos numéricos).',
        example: '8528.52.20',
        ruleCode: 'INVALID_NCM_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_NCM_FORMAT',
        field: 'NcmCode',
        title: 'NcmCode ausente na tabela ONCM por perda de zero à esquerda',
        detail:
          'Se um NCM de 8 dígitos perder o zero inicial no Excel (ficando com 7 dígitos), o DTW não encontra a chave na tabela ONCM do SAP B1 e aborta a criação do item.',
      },
      {
        code: 'INVALID_NUMERIC_VALUE',
        field: 'Price',
        title: 'Formatação monetária inválida ou células de preço corrompidas',
        detail:
          'Fórmulas quebradas do Excel (#REF!, #VALOR!) exportadas na coluna Price disparam erro na DI API. O DataConform aponta a linha exata.',
      },
      {
        code: 'DUPLICATE_ROW',
        field: 'Linha completa',
        title: 'Itens repetidos na consolidação de catálogos',
        detail:
          'Planilhas unificadas de múltiplos fornecedores costumam conter linhas duplicadas. O validador sinaliza registros idênticos com DUPLICATE_ROW.',
      },
      {
        code: 'ENCODING_CORRUPTION',
        field: 'ItemName',
        title: 'Caracteres especiais corrompidos em descrições técnicas',
        detail:
          'Descrições de itens com acentuação salvas fora de UTF-8 geram caracteres inválidos no banco SQL Server ou SAP HANA.',
      },
    ],
    steps: [
      'Monte sua planilha CSV do objeto OITM com as colunas obrigatórias ItemCode, ItemName, SalUnitMsr, Price e NcmCode.',
      'Faça o upload no DataConform selecionando o preset "SAP Business One - Itens" para auditar NCMs e preços.',
      'Baixe o CSV de inconsistências para corrigir os SKUs afetados e gere o laudo em PDF antes de importar no DTW.',
    ],
    faqs: [
      {
        question: 'O DataConform valida o campo NcmCode com pontos (8528.52.20) ou sem pontos (85285220)?',
        answer:
          'Ambos os formatos são aceitos, pois o motor extrai os dígitos numéricos de NcmCode e verifica se totalizam exatamente 8 dígitos.',
      },
      {
        question: 'O que acontece se um item estiver com ItemCode ou SalUnitMsr em branco?',
        answer:
          'O DataConform registra o erro REQUIRED_FIELD_MISSING indicando o número da linha e a coluna obrigatória vazia.',
      },
      {
        question: 'Posso baixar um arquivo CSV de exemplo para o objeto OITM?',
        answer:
          'Sim. Ao selecionar o preset "SAP Business One - Itens" na plataforma, você pode baixar o arquivo modelo layout_sap_b1_oitm.csv.',
      },
    ],
    relatedRules: [
      'validar-ncm-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
      'remover-identificar-linhas-duplicadas-csv',
      'erro-colunas-delimitador-quebrado-csv',
    ],
    relatedErps: [
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-protheus-sb1-produtos',
      'layout-importacao-sap-s4hana-business-partner',
    ],
  },
  {
    slug: 'layout-importacao-sap-s4hana-business-partner',
    erpKey: 'SAP S/4HANA',
    shortKey: 'sap-s4hana-bp',
    systemName: 'SAP S/4HANA',
    tableCode: 'Business Partner (BP)',
    moduleReference: 'SAP S/4HANA Migration Cockpit — Business Partner (BP)',
    title: 'Layout de Importação SAP S/4HANA Business Partner (BP) CSV | DataConform',
    metaDescription:
      'Homologue arquivos CSV para o SAP S/4HANA Migration Cockpit (Business Partner). Valide BP_Number, Name1, TaxId0 (CNPJ/CPF), E_Mail, CreditLine, ValidFrom e State.',
    h1: 'Layout de Importação SAP S/4HANA Business Partner (Migration Cockpit): Validação CSV',
    lead:
      'Audite cargas de Business Partner (BP) antes de submetê-las ao SAP S/4HANA Migration Cockpit (LTMC / Fiori Migrate Your Data). Intercepte falhas em TaxId0, ValidFrom, CreditLine e State.',
    purposeParagraphs: [
      'No SAP S/4HANA, os cadastros de clientes e fornecedores foram unificados no modelo central de Business Partner (BP). Em projetos de migração utilizando o SAP S/4HANA Migration Cockpit (Staging Tables ou CSV), a simulação rejeita lotes quando há inconsistências em documentos fiscais brasileiros (Tax Number BR1/BR2), datas fora do padrão ISO ou siglas de estado inválidas.',
      'O preset "SAP S/4HANA" do DataConform funciona como pré-homologação para equipes de dados e consultores SD/MM/FI. Antes de subir os arquivos nas tabelas de staging, o DataConform verifica as colunas obrigatórias BP_Number, Name1, TaxId0, E_Mail, CreditLine e ValidFrom, validando o Módulo 11 em TaxId0 e o calendário em ValidFrom.',
    ],
    sampleFileName: 'layout_sap_s4hana_bp.csv',
    sampleCsvContent: [
      'BP_Number,Name1,TaxId0,E_Mail,CreditLine,ValidFrom,State',
      'BP0010,Atlas Engenharia Corporativa SA,12.345.678/0001-95,tesouraria@atlaseng.com.br,250000.00,2026-01-15,SP',
      'BP0011,Registro Fiscal Invalido LTDA,12.345.678/0001-00,erro-email,15000.00,data-invalida,XX',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'BP_Number',
        description: 'Identificador de agrupamento/numeração externa do Business Partner na migração.',
        example: 'BP0010',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'Name1',
        description: 'Razão social ou nome principal da organização/pessoa no registro BUT000.',
        example: 'Atlas Engenharia Corporativa SA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'TaxId0',
        description: 'Documento fiscal brasileiro (CNPJ 14 dígitos ou CPF 11 dígitos — BR1/BR2).',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'E_Mail',
        description: 'Endereço de e-mail corporativo vinculado aos dados de comunicação (ADR6).',
        example: 'tesouraria@atlaseng.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'CreditLine',
        description: 'Limite de crédito para o segmento SAP Credit Management (FSCM).',
        example: '250000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'ValidFrom',
        description: 'Data de início de validade do registro (AAAA-MM-DD ou DD/MM/AAAA).',
        example: '2026-01-15',
        ruleCode: 'INVALID_DATE_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'TaxId0',
        title: 'Falha de validação Tax Number BR1/BR2 no SAP S/4HANA',
        detail:
          'O SAP S/4HANA executa checagem algorítmica para categorias fiscais brasileiras (BR1 CNPJ e BR2 CPF). Qualquer TaxId0 com dígito verificador incorreto trava a criação do BP.',
      },
      {
        code: 'INVALID_DATE_FORMAT',
        field: 'ValidFrom',
        title: 'Datas inexistentes ou invertidas (MM/DD/AAAA) em ValidFrom',
        detail:
          'Datas americanas ou inexistentes como 2026-15-99 são bloqueadas pelo DataConform com o código INVALID_DATE_FORMAT.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'State',
        title: 'Região (State) fora da tabela T005S para o país BR',
        detail:
          'Quando a coluna State consta na planilha do BP, o DataConform verifica se o valor pertence às 27 UFs do Brasil ou EX.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'CreditLine',
        title: 'Limite de crédito negativo no segmento UKM000',
        detail:
          'Valores negativos em CreditLine são rejeitados na criação do perfil de crédito. O validador aponta cada ocorrência antes da carga.',
      },
    ],
    steps: [
      'Gere o CSV de Business Partner com as colunas BP_Number, Name1, TaxId0, E_Mail, CreditLine e ValidFrom (além de State quando aplicável).',
      'Submeta a planilha ao DataConform com o preset "SAP S/4HANA" selecionado para executar a auditoria.',
      'Saneie os registros reprovados usando o CSV de inconsistências e gere o laudo PDF para o sign-off de migração.',
    ],
    faqs: [
      {
        question: 'Quais formatos de data são aceitos na coluna ValidFrom?',
        answer:
          'Os formatos ISO 8601 (AAAA-MM-DD) recomendados pelo SAP S/4HANA e o padrão brasileiro DD/MM/AAAA, verificando se a data existe no calendário.',
      },
      {
        question: 'A coluna State (UF) também é inspecionada se estiver presente na planilha?',
        answer:
          'Sim. O motor valida automaticamente se todas as siglas da coluna State correspondem às 27 UFs brasileiras ou EX.',
      },
      {
        question: 'Qual a capacidade máxima de linhas para migrações SAP S/4HANA?',
        answer:
          'O plano Professional suporta até 50.000 linhas por arquivo (25 MB) e o plano Enterprise suporta até 1.000.000 de linhas por arquivo (50 MB).',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-uf-estado-planilha-csv',
      'validar-email-em-lote-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
    ],
    relatedErps: [
      'layout-importacao-sap-business-one-ocrd-parceiros',
      'layout-importacao-sap-business-one-oitm-itens',
      'layout-importacao-protheus-sa1-clientes',
    ],
  },
  {
    slug: 'layout-importacao-senior-erp-e085cli-clientes',
    erpKey: 'Senior ERP',
    shortKey: 'senior-e085cli',
    systemName: 'Senior ERP',
    tableCode: 'E085CLI (Clientes Sapiens)',
    moduleReference: 'Tabela E085CLI (Gestão Empresarial | ERP Senior / Sapiens)',
    title: 'Layout de Importação Senior ERP E085CLI (Clientes Sapiens) CSV | DataConform',
    metaDescription:
      'Valide planilhas CSV de clientes para a tabela E085CLI do Senior ERP (Gestão Empresarial / Sapiens). Confira CodCli, NomCli, CgcCpf, EmaCli, VlrLim, SitCli e CodEst.',
    h1: 'Layout de Importação Senior ERP E085CLI: Validação de Clientes no Gestão Empresarial',
    lead:
      'Homologue sua planilha CSV de clientes para a tabela E085CLI do Senior Sistemas (Gestão Empresarial / Sapiens). Valide CgcCpf, EmaCli, VlrLim, SitCli e CodEst antes da importação.',
    purposeParagraphs: [
      'No Gestão Empresarial | ERP da Senior (Sapiens), o cadastro de clientes reside na tabela E085CLI. Durante implantações ou integrações via arquivo CSV, inconsistências no documento fiscal (CgcCpf), e-mails inválidos (EmaCli) ou siglas estaduais incorretas (CodEst) travam as regras LSP e impedem o faturamento.',
      'O preset "Senior ERP" do DataConform mapeia nativamente a tabela E085CLI. Ao enviar seu arquivo CSV, o motor valida a presença das colunas obrigatórias CodCli, NomCli, CgcCpf, EmaCli, VlrLim e SitCli, além de inspecionar automaticamente a coluna CodEst (UF), garantindo que apenas registros íntegros sigam para carga.',
    ],
    sampleFileName: 'layout_senior_erp_e085cli.csv',
    sampleCsvContent: [
      'CodCli,NomCli,CgcCpf,EmaCli,VlrLim,SitCli,CodEst',
      '2001,SulBrasil Transportes e Logistica SA,12.345.678/0001-95,fiscal@sulbrasil.com.br,95000.00,A,RS',
      '2002,Cliente Senior Doc Invalido LTDA,12.345.678/0001-00,email-quebrado.com,-1200.00,A,ZZ',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'CodCli',
        description: 'Código identificador único do cliente na tabela E085CLI do Senior ERP.',
        example: '2001',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'NomCli',
        description: 'Razão social ou nome completo do cliente no cadastro E085CLI.',
        example: 'SulBrasil Transportes e Logistica SA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'CgcCpf',
        description: 'Número do CNPJ (14 dígitos) ou CPF (11 dígitos) validado por Módulo 11.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'EmaCli',
        description: 'E-mail do cliente na E085CLI para envio de NF-e e cobrança.',
        example: 'fiscal@sulbrasil.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'VlrLim',
        description: 'Valor do limite de crédito financeiro do cliente (decimal não negativo).',
        example: '95000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'SitCli',
        description: 'Situação cadastral do cliente na E085CLI (ex.: A Ativo, I Inativo).',
        example: 'A',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'CgcCpf',
        title: 'CgcCpf inválido rejeitado pelas rotinas fiscais do Senior Sapiens',
        detail:
          'O Senior ERP valida o dígito verificador do campo CgcCpf antes de gravar na E085CLI. O DataConform antecipa essa checagem em lote e aponta qualquer CPF ou CNPJ inválido.',
      },
      {
        code: 'INVALID_EMAIL_FORMAT',
        field: 'EmaCli',
        title: 'E-mail malformado na coluna EmaCli travando o envio de DANFE',
        detail:
          'O motor reconhece especificamente a coluna EmaCli do dicionário Senior e bloqueia endereços sem @, sem domínio ou com espaços.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'VlrLim',
        title: 'Valor negativo em VlrLim na migração financeira',
        detail:
          'A coluna VlrLim é mapeada pelo validador financeiro do DataConform, impedindo que saldos negativos sejam importados como limite de crédito.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'CodEst',
        title: 'Sigla estadual inválida na coluna CodEst',
        detail:
          'Códigos inexistentes (como ZZ ou XX) em CodEst comprometem a parametrização tributária estadual do cliente no Senior ERP.',
      },
    ],
    steps: [
      'Exporte a planilha de clientes com o cabeçalho da tabela E085CLI: CodCli, NomCli, CgcCpf, EmaCli, VlrLim, SitCli e CodEst.',
      'No DataConform, escolha o preset "Senior ERP" e envie o arquivo CSV para validação imediata.',
      'Filtre os erros encontrados, baixe o CSV de inconsistências e emita o laudo em PDF antes da importação no Gestão Empresarial.',
    ],
    faqs: [
      {
        question: 'O DataConform reconhece automaticamente os campos EmaCli, CgcCpf, VlrLim e CodEst?',
        answer:
          'Sim. O motor possui suporte nativo aos nomes de colunas da tabela E085CLI do Senior ERP sem necessidade de renomear cabeçalhos.',
      },
      {
        question: 'O que ocorre se a coluna SitCli estiver vazia em algumas linhas?',
        answer:
          'Qualquer linha com SitCli em branco recebe o apontamento REQUIRED_FIELD_MISSING indicando a linha afetada.',
      },
      {
        question: 'Posso usar ponto e vírgula (;) como separador no CSV para o Senior ERP?',
        answer:
          'Sim. O DataConform detecta automaticamente vírgula, ponto e vírgula ou tabulação como delimitador.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-email-em-lote-planilha-csv',
      'validar-uf-estado-planilha-csv',
      'erro-colunas-delimitador-quebrado-csv',
    ],
    relatedErps: [
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'layout-importacao-sankhya-tgfpar-parceiros',
    erpKey: 'Sankhya',
    shortKey: 'sankhya-tgfpar',
    systemName: 'Sankhya',
    tableCode: 'TGFPAR (Parceiros)',
    moduleReference: 'Tabela TGFPAR (Parceiros de Negócio — Sankhya Om / Sankhya-W)',
    title: 'Layout de Importação Sankhya TGFPAR (Parceiros de Negócio) CSV | DataConform',
    metaDescription:
      'Homologue sua planilha CSV para a tabela TGFPAR (Parceiros de Negócio) do ERP Sankhya. Valide CODPARC, NOMEPARC, CGC_CPF, EMAIL, LIMCRED, ATIVO e CEP.',
    h1: 'Layout de Importação Sankhya TGFPAR: Validação de Parceiros de Negócio em CSV',
    lead:
      'Audite sua planilha de clientes, fornecedores e parceiros antes de importar na tabela TGFPAR do Sankhya Om. Bloqueie erros em CGC_CPF, LIMCRED, EMAIL e CEP antes que a carga falhe no banco.',
    purposeParagraphs: [
      'No ERP Sankhya (Sankhya Om / Sankhya-W), a tabela TGFPAR centraliza todos os Parceiros de Negócio — clientes, fornecedores, transportadoras e vendedores. Durante cargas em lote, um único CGC_CPF com dígito verificador incorreto, um CEP com menos de 8 dígitos ou um limite negativo em LIMCRED aborta a transação ou bloqueia o faturamento no Portal de Vendas.',
      'O preset "Sankhya" do DataConform reflete o dicionário de dados da tabela TGFPAR. Ele exige e inspeciona as colunas CODPARC, NOMEPARC, CGC_CPF, EMAIL, LIMCRED, ATIVO e CEP, aplicando validação de Módulo 11 para CPF/CNPJ, validação postal de 8 dígitos para CEP e checagem numérica para LIMCRED.',
    ],
    sampleFileName: 'layout_sankhya_tgfpar.csv',
    sampleCsvContent: [
      'CODPARC,NOMEPARC,CGC_CPF,EMAIL,LIMCRED,ATIVO,CEP',
      '501,Cerrado Agroindustrial LTDA,12.345.678/0001-95,contabil@cerradoagro.com.br,180000.00,S,74000-000',
      '502,Parceiro Sankhya Com Erro SA,12.345.678/0001-00,sem-arroba.com.br,-3000.00,S,1234',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'CODPARC',
        description: 'Código chave do parceiro de negócio na tabela TGFPAR do Sankhya.',
        example: '501',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'NOMEPARC',
        description: 'Nome ou razão social do parceiro de negócio no cadastro TGFPAR.',
        example: 'Cerrado Agroindustrial LTDA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'CGC_CPF',
        description: 'CNPJ (14 dígitos) ou CPF (11 dígitos) validado por Módulo 11.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'EMAIL',
        description: 'E-mail para envio de NF-e, boletos e comunicações comerciais.',
        example: 'contabil@cerradoagro.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'LIMCRED',
        description: 'Limite de crédito financeiro na TGFPAR (decimal maior ou igual a zero).',
        example: '180000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'ATIVO',
        description: 'Flag de registro ativo na tabela TGFPAR (ex.: S para Sim, N para Não).',
        example: 'S',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'CEP',
        description: 'CEP de 8 dígitos numéricos vinculado ao endereço do parceiro.',
        example: '74000-000',
        ruleCode: 'INVALID_CEP_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'CGC_CPF',
        title: 'CGC_CPF com dígito verificador inválido ou formatação truncada',
        detail:
          'O Sankhya valida o CGC_CPF no cadastro e na emissão de notas (TGFCAB). O DataConform detecta qualquer CPF ou CNPJ inválido na coluna CGC_CPF antes da carga.',
      },
      {
        code: 'INVALID_CEP_FORMAT',
        field: 'CEP',
        title: 'CEP incompleto impedindo vínculo com a tabela TSICEP',
        detail:
          'Na TGFPAR, CEPs com 4 ou 7 dígitos geram falha de integridade com a tabela de logradouros e são bloqueados pelo código INVALID_CEP_FORMAT.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'LIMCRED',
        title: 'Valor negativo ou não numérico na coluna LIMCRED',
        detail:
          'O campo LIMCRED do dicionário Sankhya é inspecionado automaticamente para impedir a entrada de limites negativos.',
      },
      {
        code: 'ENCODING_CORRUPTION',
        field: 'NOMEPARC',
        title: 'Nomes de parceiros com acentuação corrompida (ANSI vs UTF-8)',
        detail:
          'Planilhas exportadas em ISO-8859-1 ou Windows-1252 apresentam caracteres inválidos em NOMEPARC se não forem convertidas para UTF-8.',
      },
    ],
    steps: [
      'Prepare a planilha CSV da tabela TGFPAR com as 7 colunas obrigatórias: CODPARC, NOMEPARC, CGC_CPF, EMAIL, LIMCRED, ATIVO e CEP.',
      'Selecione o preset "Sankhya" no DataConform e envie seu arquivo para validação.',
      'Exporte a listagem de inconsistências em CSV para correção e gere o laudo em PDF antes da carga no Sankhya Om.',
    ],
    faqs: [
      {
        question: 'Posso testar o cenário da tabela TGFPAR do Sankhya gratuitamente?',
        answer:
          'Sim. O simulador na página inicial já conta com aba dedicada ao Sankhya Om (TGFPAR), e o plano Starter Gratuito valida até 20 arquivos reais por mês.',
      },
      {
        question: 'A coluna CGC_CPF aceita documentos com máscara?',
        answer:
          'Sim. O validador higieniza pontos, barra e hífen para validar os 11 dígitos do CPF ou 14 dígitos do CNPJ pelo Módulo 11.',
      },
      {
        question: 'O DataConform verifica se alguma coluna obrigatória da TGFPAR foi esquecida?',
        answer:
          'Sim. Se qualquer uma das 7 colunas obrigatórias não constar no cabeçalho, o relatório aponta REQUIRED_HEADER_MISSING.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-cep-em-lote-csv',
      'validar-email-em-lote-planilha-csv',
      'erro-encoding-utf8-caracteres-estranhos-csv',
    ],
    relatedErps: [
      'layout-importacao-senior-erp-e085cli-clientes',
      'layout-importacao-protheus-sa1-clientes',
      'layout-importacao-omie-clientes',
    ],
  },
  {
    slug: 'layout-importacao-omie-clientes',
    erpKey: 'Omie',
    shortKey: 'omie-clientes',
    systemName: 'Omie',
    tableCode: 'Planilha de Clientes e Fornecedores',
    moduleReference: 'Planilha Oficial de Clientes e Fornecedores — ERP Omie',
    title: 'Layout de Importação Omie (Planilha de Clientes CSV) | DataConform',
    metaDescription:
      'Valide sua planilha CSV de clientes e fornecedores antes de importar no ERP Omie. Confira codigo_cliente, razao_social, cnpj_cpf, email, estado e cep grátis.',
    h1: 'Layout de Importação Omie (Clientes e Fornecedores): Validação Prévia de Planilha CSV',
    lead:
      'Evite erros na importação em lote de clientes e fornecedores no ERP Omie. Audite codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito, estado e cep com diagnóstico linha a linha.',
    purposeParagraphs: [
      'O ERP Omie é amplamente utilizado para gestão integrada de faturamento, finanças e emissão de NF-e/NFS-e. Ao migrar cadastros de clientes e fornecedores por planilha para o Omie, campos com CPF/CNPJ inválido, CEPs com zero à esquerda cortado pelo Excel ou siglas de estado incorretas fazem com que a importação falhe ou gere cadastros que travam na emissão da nota fiscal.',
      'Com o preset "Omie" do DataConform, você audita toda a sua planilha CSV antes de subir no ERP. O motor verifica automaticamente as 7 colunas obrigatórias do modelo (codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito, estado e cep), apontando exatamente a linha e o valor que precisam de correção.',
    ],
    sampleFileName: 'layout_omie_clientes.csv',
    sampleCsvContent: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,estado,cep,status',
      '1001,Alpha Tecnologia e Servicos LTDA,12.345.678/0001-95,contato@alphatech.com.br,50000.00,SP,01310-100,ATIVO',
      '1002,Beta Comercio de Alimentos SA,11.222.333/0001-81,financeiro@betaalimentos.com.br,120000.50,PR,80020-000,ATIVO',
      '1003,Invalido Erro CNPJ LTDA,12.345.678/0001-00,suporte@empresa.com,25000.00,SC,88000-000,ATIVO',
      '1004,Invalido Valor Negativo ME,06.990.590/0001-23,email-sem-arroba.com,-4500.00,XX,0000,ATIVO',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'codigo_cliente',
        description: 'Código de integração ou identificador único do cliente/fornecedor.',
        example: '1001',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'razao_social',
        description: 'Razão social da empresa ou nome completo do cliente pessoa física.',
        example: 'Alpha Tecnologia e Servicos LTDA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'cnpj_cpf',
        description: 'CNPJ (14 dígitos) ou CPF (11 dígitos) com validação Módulo 11.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'email',
        description: 'E-mail para envio automático de boletos, NF-e e NFS-e pelo Omie.',
        example: 'contato@alphatech.com.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'valor_limite_credito',
        description: 'Limite de crédito comercial atribuído ao cliente (decimal não negativo).',
        example: '50000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
      {
        name: 'estado',
        description: 'Sigla da Unidade Federativa do cliente (27 UFs do Brasil ou EX).',
        example: 'SP',
        ruleCode: 'INVALID_UF_CODE',
      },
      {
        name: 'cep',
        description: 'CEP do endereço contendo exatamente 8 dígitos numéricos válidos.',
        example: '01310-100',
        ruleCode: 'INVALID_CEP_FORMAT',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'cnpj_cpf',
        title: 'CPF ou CNPJ com dígito verificador incorreto em planilhas manuais',
        detail:
          'Dados vindos de controles manuais costumam conter CNPJs digitados incorretamente. O DataConform recalcula o Módulo 11 de cada linha em cnpj_cpf.',
      },
      {
        code: 'INVALID_CEP_FORMAT',
        field: 'cep',
        title: 'CEP zerado (00000-000) ou truncado com 7 dígitos',
        detail:
          'O Omie utiliza o CEP para validação de endereço fiscal. O DataConform rejeita CEPs com menos de 8 dígitos ou iguais a 00000000.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'estado',
        title: 'Estado por extenso ou sigla inexistente na coluna estado',
        detail:
          'A coluna estado deve conter a sigla de 2 letras da UF (ex.: SP, PR, SC) ou EX. Valores como "XX" são sinalizados com INVALID_UF_CODE.',
      },
      {
        code: 'INVALID_EMAIL_FORMAT',
        field: 'email',
        title: 'E-mails sem @ ou com observações na célula',
        detail:
          'Anotações junto ao endereço na coluna email invalidam o disparo de cobranças no Omie e são detectadas pelo DataConform.',
      },
    ],
    steps: [
      'Exporte sua planilha de clientes em CSV UTF-8 com as colunas codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito, estado e cep.',
      'No DataConform, selecione o preset "Omie" e faça o upload do arquivo para rodar as regras estruturais e fiscais.',
      'Baixe o CSV apenas com as linhas que apresentaram erro, corrija os cadastros e faça a importação limpa no Omie.',
    ],
    faqs: [
      {
        question: 'Posso baixar uma planilha modelo CSV pronta para o Omie?',
        answer:
          'Sim. Na vitrine de dicionários da página inicial ou dentro de projetos, clique em "Baixar Modelo CSV" para obter layout_omie_clientes.csv.',
      },
      {
        question: 'Se minha planilha tiver uma coluna chamada status, ela dará erro?',
        answer:
          'Não. Colunas adicionais como status são preservadas e o motor sabe diferenciá-las das colunas de estado/UF.',
      },
      {
        question: 'Quanto custa validar planilhas para o Omie no DataConform?',
        answer:
          'O plano Starter é gratuito (até 20 arquivos/mês de 1.000 linhas). O plano Professional custa R$ 79,90/mês (até 500 arquivos de 50.000 linhas).',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-cep-em-lote-csv',
      'validar-uf-estado-planilha-csv',
      'validar-email-em-lote-planilha-csv',
    ],
    relatedErps: [
      'layout-importacao-contaazul-clientes',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-protheus-sa1-clientes',
    ],
  },
  {
    slug: 'layout-importacao-contaazul-clientes',
    erpKey: 'ContaAzul',
    shortKey: 'contaazul-clientes',
    systemName: 'ContaAzul',
    tableCode: 'Importação Cadastral e Financeira',
    moduleReference: 'Layout de Carga Cadastral e Financeira — ERP ContaAzul',
    title: 'Layout de Importação ContaAzul (Planilha de Clientes CSV) | DataConform',
    metaDescription:
      'Valide sua planilha CSV de clientes e lançamentos para o ContaAzul. Verifique codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito, data_vencimento e uf.',
    h1: 'Layout de Importação ContaAzul: Como Validar Planilha CSV de Clientes e Financeiro',
    lead:
      'Saneie sua planilha de clientes e dados financeiros antes de importar no ContaAzul. Detecte erros de CPF/CNPJ, e-mail, datas de vencimento, UF e valores negativos em segundos.',
    purposeParagraphs: [
      'Na transição de controles em planilhas ou de outros sistemas para o ERP ContaAzul, a importação cadastral e financeira exige que documentos fiscais, e-mails de cobrança, limites e datas de vencimento estejam padronizados. Quando há células com datas em formato inválido, CNPJs com erro de digitação ou valores negativos inesperados, a planilha é recusada ou gera lançamentos incorretos no contas a receber.',
      'O preset "ContaAzul" do DataConform permite validar o arquivo CSV completo antes da importação. O motor confere a presença das colunas obrigatórias codigo_cliente, razao_social, cnpj_cpf, email e valor_limite_credito, além de validar automaticamente colunas complementares do layout como data_vencimento e uf.',
    ],
    sampleFileName: 'layout_contaazul_clientes.csv',
    sampleCsvContent: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,data_vencimento,uf',
      'CA01,Nova Era Consultoria Contabil LTDA,12.345.678/0001-95,contato@novaera.cnt.br,45000.00,2026-12-31,SP',
      'CA02,Registro Com Inconsistencias ME,12.345.678/0001-00,email-invalido,-1500.00,data-errada,XX',
    ].join('\n'),
    requiredColumns: [
      {
        name: 'codigo_cliente',
        description: 'Código identificador do cliente no controle interno ou sistema de origem.',
        example: 'CA01',
        ruleCode: 'REQUIRED_FIELD_MISSING',
      },
      {
        name: 'razao_social',
        description: 'Nome empresarial (razão social) ou nome completo do cliente.',
        example: 'Nova Era Consultoria Contabil LTDA',
        ruleCode: 'REQUIRED_FIELD_MISSING / ENCODING_CORRUPTION',
      },
      {
        name: 'cnpj_cpf',
        description: 'Documento fiscal CPF (11 dígitos) ou CNPJ (14 dígitos) com dígito verificador válido.',
        example: '12.345.678/0001-95',
        ruleCode: 'INVALID_DOCUMENT_FORMAT',
      },
      {
        name: 'email',
        description: 'Endereço de e-mail válido para envio de faturas, boletos e notas fiscais.',
        example: 'contato@novaera.cnt.br',
        ruleCode: 'INVALID_EMAIL_FORMAT',
      },
      {
        name: 'valor_limite_credito',
        description: 'Valor financeiro de limite ou referência (decimal maior ou igual a zero).',
        example: '45000.00',
        ruleCode: 'INVALID_NUMERIC_VALUE / NEGATIVE_AMOUNT_NOT_ALLOWED',
      },
    ],
    commonErrors: [
      {
        code: 'INVALID_DATE_FORMAT',
        field: 'data_vencimento',
        title: 'Datas de vencimento em texto livre ou dias inexistentes no calendário',
        detail:
          'Quando a planilha inclui a coluna data_vencimento, textos como "A vista" ou datas inexistentes (ex.: 31/02/2026) são bloqueados pelo DataConform, que exige formatos válidos como DD/MM/AAAA ou AAAA-MM-DD.',
      },
      {
        code: 'INVALID_DOCUMENT_FORMAT',
        field: 'cnpj_cpf',
        title: 'CPF ou CNPJ inválido impedindo emissão de NFS-e e NF-e no ContaAzul',
        detail:
          'O motor verifica os dígitos verificadores (Módulo 11) de cada documento na coluna cnpj_cpf e rejeita sequências repetidas como 000.000.000-00.',
      },
      {
        code: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
        field: 'valor_limite_credito',
        title: 'Valores negativos ou caracteres inválidos em colunas financeiras',
        detail:
          'Qualquer valor menor que zero na coluna valor_limite_credito gera o apontamento NEGATIVE_AMOUNT_NOT_ALLOWED com indicação exata da linha.',
      },
      {
        code: 'INVALID_UF_CODE',
        field: 'uf',
        title: 'Sigla de UF inválida no endereço do cliente',
        detail:
          'Se a coluna uf estiver presente na planilha, o DataConform garante que todos os valores pertençam às 27 siglas oficiais de estados brasileiros ou EX.',
      },
    ],
    steps: [
      'Salve sua planilha de clientes para o ContaAzul em formato CSV UTF-8 contendo as colunas codigo_cliente, razao_social, cnpj_cpf, email e valor_limite_credito (e opcionalmente data_vencimento e uf).',
      'Crie um projeto no DataConform selecionando o ERP de destino "ContaAzul" e anexe o arquivo.',
      'Confira o relatório linha a linha, exporte as inconsistências em CSV para ajuste e gere o laudo em PDF antes de concluir a carga.',
    ],
    faqs: [
      {
        question: 'As colunas data_vencimento e uf também são validadas no preset ContaAzul?',
        answer:
          'Sim. Embora as 5 colunas mínimas obrigatórias sejam codigo_cliente, razao_social, cnpj_cpf, email e valor_limite_credito, o arquivo modelo oficial inclui data_vencimento e uf, que são auditadas automaticamente pelo motor semântico.',
      },
      {
        question: 'Como exportar o relatório de erros para enviar ao cliente ou contador?',
        answer:
          'Dentro do laudo de validação do DataConform, basta clicar em exportar CSV de inconsistências ou clicar no botão de impressão para gerar o laudo executivo em PDF com campos de assinatura.',
      },
      {
        question: 'Preciso cadastrar cartão de crédito para usar o plano gratuito?',
        answer:
          'Não. O plano Starter Gratuito é ativado imediatamente ao criar sua conta corporativa, sem necessidade de informar cartão de crédito, oferecendo até 20 validações de arquivos por mês.',
      },
    ],
    relatedRules: [
      'validar-cpf-cnpj-em-massa-csv',
      'validar-email-em-lote-planilha-csv',
      'validar-uf-estado-planilha-csv',
      'erro-colunas-delimitador-quebrado-csv',
    ],
    relatedErps: [
      'layout-importacao-omie-clientes',
      'layout-importacao-sankhya-tgfpar-parceiros',
      'layout-importacao-protheus-sa1-clientes',
    ],
  },
];
