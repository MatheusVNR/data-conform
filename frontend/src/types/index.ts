export type FileStatus = 0 | 1 | 2 | 3;

export const FileStatusLabels: Record<FileStatus, string> = {
  0: 'Pendente',
  1: 'Processando',
  2: 'Concluído',
  3: 'Falha',
};

export type IssueSeverity = 0 | 1 | 'Warning' | 'Error' | 'warning' | 'error';

export const IssueSeverityLabels: Record<string, string> = {
  '0': 'Aviso',
  '1': 'Erro',
  Warning: 'Aviso',
  Error: 'Erro',
  warning: 'Aviso',
  error: 'Erro',
};

export type PlanTier = 'Starter' | 'Professional' | 'Enterprise' | 0 | 1 | 2;

export const PlanTierLabels: Record<string, string> = {
  '0': 'Starter',
  '1': 'Professional',
  '2': 'Enterprise',
  Starter: 'Starter',
  Professional: 'Professional',
  Enterprise: 'Enterprise',
};

export interface PlanLimitsConfig {
  maxFileSizeMb: number;
  maxConcurrentFiles: number;
  maxRowsPerFile: number;
  monthlyFilesQuota: number;
}

export const PLAN_LIMITS: Record<string, PlanLimitsConfig> = {
  Starter: {
    maxFileSizeMb: 5,
    maxConcurrentFiles: 2,
    maxRowsPerFile: 1000,
    monthlyFilesQuota: 20,
  },
  Professional: {
    maxFileSizeMb: 25,
    maxConcurrentFiles: 5,
    maxRowsPerFile: 50000,
    monthlyFilesQuota: 500,
  },
  Enterprise: {
    maxFileSizeMb: 50,
    maxConcurrentFiles: 10,
    maxRowsPerFile: 1000000,
    monthlyFilesQuota: 10000,
  },
};

export interface ErpPresetConfig {
  systemName: string;
  moduleReference: string;
  summary: string;
  requiredColumns: string[];
  sampleFileName: string;
  sampleCsvContent: string;
}

export const ERP_PRESETS: Record<string, ErpPresetConfig> = {
  'TOTVS Protheus': {
    systemName: 'TOTVS Protheus',
    moduleReference: 'Tabela SA1 (Clientes — SIGAFAT / SIGAFIN)',
    summary:
      'Dicionário SX3 oficial para rotina automática MATA030: valida Código, Loja, Razão Social, CNPJ/CPF (A1_CGC), E-mail (A1_EMAIL) e Limite de Crédito (A1_LC).',
    requiredColumns: ['A1_COD', 'A1_LOJA', 'A1_NOME', 'A1_CGC', 'A1_EMAIL', 'A1_LC'],
    sampleFileName: 'layout_totvs_protheus_sa1.csv',
    sampleCsvContent: [
      'A1_COD,A1_LOJA,A1_NOME,A1_CGC,A1_EMAIL,A1_LC,A1_EST',
      '000101,01,Alpha Tecnologia e Sistemas LTDA,12.345.678/0001-95,fiscal@alphatech.com.br,50000.00,SP',
      '000102,01,Beta Logistica Integrada SA,11.222.333/0001-81,financeiro@betalog.com.br,120000.50,PR',
      '000103,01,Fornecedor com CNPJ Incorreto LTDA,12.345.678/0001-00,contato@empresa.com.br,25000.00,SC',
      '000104,01,Cliente com Limite Negativo ME,06.990.590/0001-23,email-invalido-sem-arroba.com,-4500.00,MG',
    ].join('\r\n'),
  },
  'SAP Business One': {
    systemName: 'SAP Business One',
    moduleReference: 'Objeto OCRD (Business Partners — DTW)',
    summary:
      'Layout Data Transfer Workbench (DTW) para Parceiros de Negócio: valida CardCode, CardName, Documento Fiscal (LicTradNum), E_Mail e CreditLine.',
    requiredColumns: ['CardCode', 'CardName', 'LicTradNum', 'E_Mail', 'CreditLine'],
    sampleFileName: 'layout_sap_b1_ocrd.csv',
    sampleCsvContent: [
      'CardCode,CardName,CardType,LicTradNum,E_Mail,CreditLine',
      'C10001,Horizonte Suprimentos Industriais SA,C,12.345.678/0001-95,nfe@horizontesupri.com.br,85000.00',
      'C10002,Vanguarda Metalurgica LTDA,C,11.222.333/0001-81,compras@vanguarda.ind.br,140000.00',
      'C10003,Parceiro Documento Invalido SA,C,12.345.678/0001-00,contato@parceiro.com,30000.00',
      'C10004,Parceiro Credito Negativo ME,C,06.990.590/0001-23,email-incompleto.com,-9200.00',
    ].join('\r\n'),
  },
  'SAP S/4HANA': {
    systemName: 'SAP S/4HANA',
    moduleReference: 'Migration Cockpit — Business Partner (BP)',
    summary:
      'Estrutura para S/4HANA Migration Cockpit: inspeciona BP_Number, Name1, TaxId0 (CNPJ/CPF), E_Mail, CreditLine e ValidFrom.',
    requiredColumns: ['BP_Number', 'Name1', 'TaxId0', 'E_Mail', 'CreditLine', 'ValidFrom'],
    sampleFileName: 'layout_sap_s4hana_bp.csv',
    sampleCsvContent: [
      'BP_Number,Name1,TaxId0,E_Mail,CreditLine,ValidFrom',
      'BP0010,Atlas Engenharia Corporativa SA,12.345.678/0001-95,tesouraria@atlaseng.com.br,250000.00,2026-01-15',
      'BP0011,Registro Fiscal Invalido LTDA,12.345.678/0001-00,erro-email,15000.00,data-invalida',
    ].join('\r\n'),
  },
  'Senior ERP': {
    systemName: 'Senior ERP',
    moduleReference: 'Tabela E085CLI (Gestão Empresarial / Sapiens)',
    summary:
      'Padrão de importação Senior Sapiens: valida CodCli, NomCli, CgcCpf (CNPJ/CPF), EmaCli (E-mail), VlrLim (Limite) e SitCli.',
    requiredColumns: ['CodCli', 'NomCli', 'CgcCpf', 'EmaCli', 'VlrLim', 'SitCli'],
    sampleFileName: 'layout_senior_erp_e085cli.csv',
    sampleCsvContent: [
      'CodCli,NomCli,CgcCpf,EmaCli,VlrLim,SitCli',
      '2001,SulBrasil Transportes e Logistica SA,12.345.678/0001-95,fiscal@sulbrasil.com.br,95000.00,A',
      '2002,Cliente Senior Doc Invalido LTDA,12.345.678/0001-00,email-quebrado.com,-1200.00,A',
    ].join('\r\n'),
  },
  Sankhya: {
    systemName: 'Sankhya',
    moduleReference: 'Tabela TGFPAR (Parceiros de Negócio)',
    summary:
      'Dicionário de dados Sankhya Om: valida CODPARC, NOMEPARC, CGC_CPF, EMAIL, LIMCRED e ATIVO.',
    requiredColumns: ['CODPARC', 'NOMEPARC', 'CGC_CPF', 'EMAIL', 'LIMCRED', 'ATIVO'],
    sampleFileName: 'layout_sankhya_tgfpar.csv',
    sampleCsvContent: [
      'CODPARC,NOMEPARC,CGC_CPF,EMAIL,LIMCRED,ATIVO',
      '501,Cerrado Agroindustrial LTDA,12.345.678/0001-95,contabil@cerradoagro.com.br,180000.00,S',
      '502,Parceiro Sankhya Com Erro SA,12.345.678/0001-00,sem-arroba.com.br,-3000.00,S',
    ].join('\r\n'),
  },
  Omie: {
    systemName: 'Omie',
    moduleReference: 'Planilha Oficial de Clientes e Fornecedores',
    summary:
      'Modelo padrão de importação Omie: valida codigo_cliente, razao_social, cnpj_cpf, email e valor_limite_credito.',
    requiredColumns: ['codigo_cliente', 'razao_social', 'cnpj_cpf', 'email', 'valor_limite_credito'],
    sampleFileName: 'layout_omie_clientes.csv',
    sampleCsvContent: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,status',
      '1001,Alpha Tecnologia e Servicos LTDA,12.345.678/0001-95,contato@alphatech.com.br,50000.00,ATIVO',
      '1002,Beta Comercio de Alimentos SA,11.222.333/0001-81,financeiro@betaalimentos.com.br,120000.50,ATIVO',
      '1003,Invalido Erro CNPJ LTDA,12.345.678/0001-00,suporte@empresa.com,25000.00,ATIVO',
      '1004,Invalido Valor Negativo ME,06.990.590/0001-23,email-sem-arroba.com,-4500.00,ATIVO',
    ].join('\r\n'),
  },
  ContaAzul: {
    systemName: 'ContaAzul',
    moduleReference: 'Importação Cadastral e Financeira',
    summary:
      'Layout de carga ContaAzul: valida codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito e data_vencimento.',
    requiredColumns: ['codigo_cliente', 'razao_social', 'cnpj_cpf', 'email', 'valor_limite_credito'],
    sampleFileName: 'layout_contaazul_clientes.csv',
    sampleCsvContent: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,data_vencimento',
      'CA01,Nova Era Consultoria Contabil LTDA,12.345.678/0001-95,contato@novaera.cnt.br,45000.00,2026-12-31',
      'CA02,Registro Com Inconsistencias ME,12.345.678/0001-00,email-invalido,-1500.00,data-errada',
    ].join('\r\n'),
  },
  'Genérico / CSV': {
    systemName: 'Genérico / CSV',
    moduleReference: 'Padrão Corporativo B2B (RFC 4180)',
    summary:
      'Validação flexível para qualquer ERP ou banco de dados: inspeciona integridade estrutural, documentos fiscais, e-mails, valores financeiros e datas.',
    requiredColumns: ['codigo_cliente', 'razao_social', 'cnpj_cpf', 'email', 'valor_limite_credito'],
    sampleFileName: 'modelo_carga_erp_dataconform.csv',
    sampleCsvContent: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,status',
      '1001,Alpha Tecnologia e Servicos LTDA,12.345.678/0001-95,contato@alphatech.com.br,50000.00,ATIVO',
      '1002,Beta Comercio de Alimentos SA,11.222.333/0001-81,financeiro@betaalimentos.com.br,120000.50,ATIVO',
      '1005,Invalido Erro CNPJ LTDA,12.345.678/0001-00,suporte@empresa.com,25000.00,ATIVO',
      '1006,Invalido Email Incompleto SA,11.222.333/0001-81,email-sem-arroba-dominio.com,30000.00,INATIVO',
      '1007,Invalido Valor Negativo ME,06.990.590/0001-23,contato@negativo.com.br,-4500.00,ATIVO',
    ].join('\r\n'),
  },
};

export function getErpPreset(targetSystem?: string | null): ErpPresetConfig {
  if (targetSystem && ERP_PRESETS[targetSystem]) {
    return ERP_PRESETS[targetSystem];
  }
  return ERP_PRESETS['Genérico / CSV'];
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt?: string | null;
  projectsCount: number;
  plan: PlanTier;
  monthlyFilesUploaded: number;
  monthlyFilesQuota: number;
  maxRowsPerFile: number;
}

export interface WorkspaceQuotaDto {
  workspaceId: string;
  plan: PlanTier;
  monthlyFilesUploaded: number;
  monthlyFilesQuota: number;
  maxRowsPerFile: number;
  usagePercentage: number;
}

export interface AuthResponseDto {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  plan: string;
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  fullName: string;
  workspaceName?: string;
}

export interface AuditLogDto {
  id: string;
  workspaceId: string;
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  details?: string | null;
  createdAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
}

export interface UpdateWorkspaceRequest {
  name: string;
}

export interface ConfirmCheckoutRequest {
  sessionId: string;
  plan: string;
}

export interface ImportProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  targetSystem?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  filesCount: number;
}

export interface CreateImportProjectRequest {
  name: string;
  description?: string;
  targetSystem?: string;
}

export interface ImportFileDto {
  id: string;
  projectId: string;
  originalFileName: string;
  contentType: string;
  byteSize: number;
  status: FileStatus;
  totalRows?: number | null;
  validRows?: number | null;
  errorRows?: number | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface ValidationIssueDto {
  id: string;
  rowNumber?: number | null;
  columnName?: string | null;
  issueCode: string;
  message: string;
  severity: IssueSeverity;
  rawValue?: string | null;
  createdAt: string;
}

export interface ValidationReportDto {
  fileId: string;
  originalFileName: string;
  status: FileStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  processedAt?: string | null;
  issues: ValidationIssueDto[];
}
