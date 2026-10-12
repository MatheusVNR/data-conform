export type FileStatus = 0 | 1 | 2 | 3;

export const FileStatusLabels: Record<FileStatus, string> = {
  0: 'Pendente',
  1: 'Processando',
  2: 'Concluído',
  3: 'Falha',
};

export type IssueSeverity = 0 | 1;

export const IssueSeverityLabels: Record<IssueSeverity, string> = {
  0: 'Aviso',
  1: 'Erro',
};

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt?: string | null;
  projectsCount: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
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
