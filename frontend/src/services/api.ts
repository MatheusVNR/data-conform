import type {
  CreateImportProjectRequest,
  CreateWorkspaceRequest,
  ImportFileDto,
  ImportProjectDto,
  ValidationReportDto,
  WorkspaceDto,
} from '../types';

const API_BASE_URL: string = '/api';

export async function getWorkspaces(): Promise<WorkspaceDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces`);
  if (!response.ok) {
    throw new Error('Falha ao carregar workspaces');
  }
  return (await response.json()) as WorkspaceDto[];
}

export async function createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar workspace');
  }

  return (await response.json()) as WorkspaceDto;
}

export async function getProjects(workspaceId: string): Promise<ImportProjectDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/projects`);
  if (!response.ok) {
    throw new Error('Falha ao carregar projetos do workspace');
  }
  return (await response.json()) as ImportProjectDto[];
}

export async function createProject(
  workspaceId: string,
  request: CreateImportProjectRequest
): Promise<ImportProjectDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar projeto');
  }

  return (await response.json()) as ImportProjectDto;
}

export async function getFiles(projectId: string): Promise<ImportFileDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`);
  if (!response.ok) {
    throw new Error('Falha ao carregar arquivos do projeto');
  }
  return (await response.json()) as ImportFileDto[];
}

export async function uploadFile(projectId: string, file: File): Promise<ImportFileDto> {
  const formData: FormData = new FormData();
  formData.append('file', file);

  const response: Response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao enviar arquivo');
  }

  return (await response.json()) as ImportFileDto;
}

export async function validateFile(
  fileId: string,
  requiredColumns?: string
): Promise<ValidationReportDto> {
  const url: string = requiredColumns
    ? `${API_BASE_URL}/files/${fileId}/validate?requiredColumns=${encodeURIComponent(requiredColumns)}`
    : `${API_BASE_URL}/files/${fileId}/validate`;

  const response: Response = await fetch(url, { method: 'POST' });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(errorData.detail || errorData.error || 'Erro ao validar arquivo');
  }

  return (await response.json()) as ValidationReportDto;
}

export async function getFileReport(fileId: string): Promise<ValidationReportDto> {
  const response: Response = await fetch(`${API_BASE_URL}/files/${fileId}/report`);
  if (!response.ok) {
    throw new Error('Falha ao carregar relatório do arquivo');
  }
  return (await response.json()) as ValidationReportDto;
}
