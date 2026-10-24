import type {
  AuditLogDto,
  AuthResponseDto,
  ConfirmCheckoutRequest,
  CreateCustomerFeedbackRequest,
  CreateImportProjectRequest,
  CreateWorkspaceRequest,
  CustomerFeedbackDto,
  ImportFileDto,
  ImportProjectDto,
  LoginRequestDto,
  RegisterRequestDto,
  UpdateWorkspaceRequest,
  ValidationReportDto,
  WorkspaceDto,
  WorkspaceQuotaDto,
} from '../types';

const configuredApiUrl: string | undefined = import.meta.env.VITE_API_URL as string | undefined;
const API_BASE_URL: string = configuredApiUrl && configuredApiUrl.trim().length > 0
  ? (configuredApiUrl.trim().endsWith('/api')
      ? configuredApiUrl.trim().replace(/\/+$/, '')
      : `${configuredApiUrl.trim().replace(/\/+$/, '')}/api`)
  : '/api';
const TOKEN_KEY: string = 'dataconform_token';

export function getApiDocsUrl(): string {
  if (configuredApiUrl && configuredApiUrl.trim().length > 0) {
    const cleanRoot: string = configuredApiUrl.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${cleanRoot}/docs`;
  }
  return 'http://localhost:5039/docs';
}

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

const DEFAULT_REQUEST_TIMEOUT_MS: number = 30000;

function createTimeoutSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT_MS);
  }
  return undefined;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const signal: AbortSignal | undefined = init?.signal ?? createTimeoutSignal();
  return fetch(input, {
    ...init,
    ...(signal ? { signal } : {}),
  });
}

// Authentication
export async function login(request: LoginRequestDto): Promise<AuthResponseDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'E-mail ou senha incorretos.');
  }

  const data: AuthResponseDto = (await response.json()) as AuthResponseDto;
  setAuthToken(data.token);
  return data;
}

export async function register(request: RegisterRequestDto): Promise<AuthResponseDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar conta corporativa.');
  }

  const data: AuthResponseDto = (await response.json()) as AuthResponseDto;
  setAuthToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<AuthResponseDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/auth/me`, {
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
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar organizações / workspaces');
  }
  return (await response.json()) as WorkspaceDto[];
}

export async function createWorkspace(request: CreateWorkspaceRequest): Promise<WorkspaceDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao criar organização');
  }

  return (await response.json()) as WorkspaceDto;
}

export async function updateWorkspace(workspaceId: string, request: UpdateWorkspaceRequest): Promise<WorkspaceDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao renomear organização');
  }

  return (await response.json()) as WorkspaceDto;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao excluir organização');
  }
}

export async function getWorkspaceQuota(workspaceId: string): Promise<WorkspaceQuotaDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/quota`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao obter cota do workspace');
  }
  return (await response.json()) as WorkspaceQuotaDto;
}

export async function changeWorkspacePlan(
  workspaceId: string,
  plan: string | number,
  reason?: string
): Promise<WorkspaceQuotaDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/change-plan`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ plan, reason }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao alterar plano do workspace');
  }

  return (await response.json()) as WorkspaceQuotaDto;
}

export async function confirmStripeCheckout(
  workspaceId: string,
  request: ConfirmCheckoutRequest
): Promise<WorkspaceQuotaDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/checkout/confirm`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao confirmar pagamento do Stripe');
  }

  return (await response.json()) as WorkspaceQuotaDto;
}

export async function getWorkspaceAuditLogs(workspaceId: string): Promise<AuditLogDto[]> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/audit-logs`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar logs de auditoria');
  }
  return (await response.json()) as AuditLogDto[];
}

// Projects
export async function getProjects(workspaceId: string): Promise<ImportProjectDto[]> {
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/projects`, {
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
  const response: Response = await apiFetch(`${API_BASE_URL}/workspaces/${workspaceId}/projects`, {
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

export async function deleteProject(projectId: string): Promise<void> {
  const response: Response = await apiFetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao excluir projeto');
  }
}

// Files
export async function getFiles(projectId: string): Promise<ImportFileDto[]> {
  const response: Response = await apiFetch(`${API_BASE_URL}/projects/${projectId}/files`, {
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

  const response: Response = await apiFetch(`${API_BASE_URL}/projects/${projectId}/files/upload`, {
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

  const response: Response = await apiFetch(url, {
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
  const response: Response = await apiFetch(`${API_BASE_URL}/files/${fileId}/report`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('Falha ao carregar relatório do arquivo');
  }
  return (await response.json()) as ValidationReportDto;
}

export async function deleteFile(fileId: string): Promise<void> {
  const response: Response = await apiFetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao excluir arquivo');
  }
}

export async function createCustomerFeedback(
  data: CreateCustomerFeedbackRequest
): Promise<CustomerFeedbackDto> {
  const response: Response = await apiFetch(`${API_BASE_URL}/feedbacks`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao enviar feedback para o servidor.');
  }

  return (await response.json()) as CustomerFeedbackDto;
}

export async function getCustomerFeedbacks(): Promise<CustomerFeedbackDto[]> {
  const response: Response = await apiFetch(`${API_BASE_URL}/feedbacks`, {
    headers: getHeaders(false),
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar lista de feedbacks.');
  }

  return (await response.json()) as CustomerFeedbackDto[];
}
