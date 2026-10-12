import type {
  AuditLogDto,
  AuthResponseDto,
  CreateImportProjectRequest,
  CreateWorkspaceRequest,
  ImportFileDto,
  ImportProjectDto,
  LoginRequestDto,
  RegisterRequestDto,
  ValidationReportDto,
  WorkspaceDto,
  WorkspaceQuotaDto,
} from '../types';

const API_BASE_URL: string = '/api';
const TOKEN_KEY: string = 'dataconform_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getHeaders(includeContentType: boolean = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token: string | null = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Authentication
export async function login(request: LoginRequestDto): Promise<AuthResponseDto> {
  const response: Response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Credenciais inválidas.');
  }

  const data: AuthResponseDto = (await response.json()) as AuthResponseDto;
  setAuthToken(data.token);
  return data;
}

export async function register(request: RegisterRequestDto): Promise<AuthResponseDto> {
  const response: Response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar conta.');
  }

  const data: AuthResponseDto = (await response.json()) as AuthResponseDto;
  setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthResponseDto> {
  const response: Response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: getHeaders(false),
  });

  if (!response.ok) {
    throw new Error('Sessão expirada ou não autenticada.');
  }

  return (await response.json()) as AuthResponseDto;
}

export function logout(): void {
  clearAuthToken();
}

// Workspaces
export async function getWorkspaces(): Promise<WorkspaceDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar workspaces');
  }
  return (await response.json()) as WorkspaceDto[];
}

export async function createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar workspace');
  }

  return (await response.json()) as WorkspaceDto;
}

export async function getWorkspaceQuota(workspaceId: string): Promise<WorkspaceQuotaDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/quota`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao obter cota do workspace');
  }
  return (await response.json()) as WorkspaceQuotaDto;
}

export async function changeWorkspacePlan(workspaceId: string, plan: string | number): Promise<WorkspaceQuotaDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/change-plan`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao alterar plano do workspace');
  }

  return (await response.json()) as WorkspaceQuotaDto;
}

export async function getWorkspaceAuditLogs(workspaceId: string): Promise<AuditLogDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/audit-logs`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar logs de auditoria');
  }
  return (await response.json()) as AuditLogDto[];
}

// Projects
export async function getProjects(workspaceId: string): Promise<ImportProjectDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/projects`, {
    headers: getHeaders(false),
  });
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
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar projeto');
  }

  return (await response.json()) as ImportProjectDto;
}

// Files
export async function getFiles(projectId: string): Promise<ImportFileDto[]> {
  const response: Response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar arquivos do projeto');
  }
  return (await response.json()) as ImportFileDto[];
}

export async function uploadFile(projectId: string, file: File): Promise<ImportFileDto> {
  const formData: FormData = new FormData();
  formData.append('file', file);

  const token: string | null = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response: Response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string; detail?: string; title?: string };
    throw new Error(errorData.detail || errorData.title || errorData.error || 'Erro ao enviar arquivo');
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

  const response: Response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(false),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string; detail?: string; title?: string };
    throw new Error(errorData.detail || errorData.title || errorData.error || 'Erro ao validar arquivo');
  }

  return (await response.json()) as ValidationReportDto;
}

export async function getFileReport(fileId: string): Promise<ValidationReportDto> {
  const response: Response = await fetch(`${API_BASE_URL}/files/${fileId}/report`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar relatório do arquivo');
  }
  return (await response.json()) as ValidationReportDto;
}
