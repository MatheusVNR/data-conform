import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthToken,
  createCustomerFeedback,
  getAuthToken,
  login,
  setAuthToken,
  validateFile,
} from './api';

function mockFetchResponse(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('token de autenticação', () => {
  it('grava, lê e limpa o token no localStorage', () => {
    setAuthToken('abc123');
    expect(getAuthToken()).toBe('abc123');
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });
});

describe('login', () => {
  it('persiste o token retornado em caso de sucesso', async () => {
    mockFetchResponse(200, { token: 'jwt-token', email: 'a@b.com' });

    await login({ email: 'a@b.com', password: '123456' });

    expect(getAuthToken()).toBe('jwt-token');
  });

  it('propaga mensagem padrão quando a API responde 401 sem corpo de erro', async () => {
    mockFetchResponse(401, {});

    await expect(login({ email: 'a@b.com', password: 'errada' })).rejects.toThrow('E-mail ou senha incorretos.');
    expect(getAuthToken()).toBeNull();
  });
});

describe('createCustomerFeedback', () => {
  it('envia POST /api/feedbacks com JSON e Authorization quando autenticado', async () => {
    setAuthToken('token-xyz');
    const fetchMock = mockFetchResponse(201, { id: '1', category: 'bug' });

    await createCustomerFeedback({ category: 'bug', rating: 3, subject: 'S', message: 'M' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe('/api/feedbacks');
    expect(init.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer token-xyz');
    expect(JSON.parse(init.body as string)).toMatchObject({ category: 'bug', message: 'M' });
  });

  it('lança o erro retornado pela API', async () => {
    mockFetchResponse(400, { error: 'A mensagem de feedback é obrigatória.' });

    await expect(
      createCustomerFeedback({ category: 'bug', rating: 3, subject: '', message: '' })
    ).rejects.toThrow('A mensagem de feedback é obrigatória.');
  });
});

describe('validateFile', () => {
  it('codifica as colunas obrigatórias na query string', async () => {
    const fetchMock = mockFetchResponse(200, { issues: [] });

    await validateFile('file-1', 'A1_COD, A1_CGC');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('/api/files/file-1/validate?requiredColumns=A1_COD%2C%20A1_CGC');
  });

  it('prioriza o campo detail do ProblemDetails na mensagem de erro', async () => {
    mockFetchResponse(403, { title: 'Limite', detail: 'Limite mensal atingido' });

    await expect(validateFile('file-1')).rejects.toThrow('Limite mensal atingido');
  });
});
