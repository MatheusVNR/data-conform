import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceDto } from '../types';
import { ChangePlanModal } from './ChangePlanModal';
import { createCustomerFeedback } from '../services/api';
import * as analyticsModule from '../utils/analytics';

vi.mock('../services/api', () => ({
  createCustomerFeedback: vi.fn(),
  changeWorkspacePlan: vi.fn(),
  confirmStripeCheckout: vi.fn(),
}));

vi.mock('../utils/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/analytics')>();
  return {
    ...actual,
    trackEvent: vi.fn(),
  };
});

const mockCreateFeedback = vi.mocked(createCustomerFeedback);
const mockTrackEvent = vi.mocked(analyticsModule.trackEvent);

const mockWorkspace: WorkspaceDto = {
  id: 'ws-1234-abcd',
  name: 'Empresa Teste',
  slug: 'empresa-teste',
  createdAt: new Date().toISOString(),
  plan: 'Starter',
  projectsCount: 1,
  monthlyFilesUploaded: 5,
  monthlyFilesQuota: 5,
  maxRowsPerFile: 500,
};

describe('ChangePlanModal — Validação de Captura de Interesse Comercial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Persistência realizada com sucesso: exibe confirmação apenas após retorno 200/201 da API', async () => {
    mockCreateFeedback.mockResolvedValueOnce({
      id: 'fb-001',
      workspaceId: mockWorkspace.id,
      category: 'commercial_upgrade_interest',
      rating: 5,
      subject: 'Interesse no Plano Professional',
      message: '{"plan":"Professional"}',
      contactEmail: 'consultor@empresa.com.br',
      createdAt: new Date().toISOString(),
    });

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    // Confirma que trackEvent foi disparado com o evento checkout_started inicial
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'checkout_started',
      expect.objectContaining({
        targetPlan: 'Professional',
        price: 'R$ 79,90 / mês',
        workspaceId: mockWorkspace.id,
      })
    );

    // Confirma que createCustomerFeedback foi invocado com os metadados estruturados
    expect(mockCreateFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspace.id,
        category: 'commercial_upgrade_interest',
        rating: 5,
        contactEmail: 'consultor@empresa.com.br',
        subject: 'Interesse no Plano Professional',
      })
    );

    // Confirma que a mensagem de sucesso é renderizada após a resolução
    expect(
      await screen.findByText(/Registramos seu interesse prioritário no plano Professional/i)
    ).toBeInTheDocument();

    // Confirma que nenhuma mensagem de erro existe na tela
    expect(screen.queryByText(/Não foi possível registrar seu interesse/i)).not.toBeInTheDocument();
  });

  it('2. Falha de rede: exibe aviso honesto de erro e canal direto sem confirmação falsa', async () => {
    mockCreateFeedback.mockRejectedValueOnce(new Error('NetworkError when attempting to fetch resource.'));

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    // Confirma que exibe aviso honesto indicando e-mail de suporte
    expect(
      await screen.findByText(/Não foi possível registrar seu interesse automaticamente neste momento.*contato@dataconform\.com\.br/i)
    ).toBeInTheDocument();

    // Garante que a confirmação de sucesso NÃO foi exibida
    expect(screen.queryByText(/Registramos seu interesse prioritário/i)).not.toBeInTheDocument();
  });

  it('3. Falha de persistência no backend (500): não oculta a falha e orienta canal alternativo', async () => {
    mockCreateFeedback.mockRejectedValueOnce(new Error('Erro interno 500 no PostgreSQL'));

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    expect(
      await screen.findByText(/Não foi possível registrar seu interesse.*contato@dataconform\.com\.br/i)
    ).toBeInTheDocument();
  });

  it('4. Resposta inválida ou inesperada da API: trata graceful e orienta suporte', async () => {
    mockCreateFeedback.mockRejectedValueOnce('Unexpected response format');

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    expect(
      await screen.findByText(/contato@dataconform\.com\.br/i)
    ).toBeInTheDocument();
  });

  it('5. Repetição de solicitações: previne múltiplos envios concorrentes durante o loading', async () => {
    let resolveApiCall: (val: any) => void = () => {};
    const hangingPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });
    mockCreateFeedback.mockReturnValueOnce(hangingPromise as any);

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    
    // Primeiro clique dispara a chamada
    await userEvent.click(upgradeButton);
    expect(mockCreateFeedback).toHaveBeenCalledTimes(1);

    // Segundo clique enquanto pending é ignorado pelo guard
    await userEvent.click(upgradeButton);
    expect(mockCreateFeedback).toHaveBeenCalledTimes(1);

    // Resolve a promise
    resolveApiCall({
      id: 'fb-002',
      workspaceId: mockWorkspace.id,
      category: 'commercial_upgrade_interest',
      rating: 5,
      subject: 'Interesse',
      message: '{}',
      createdAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText(/Registramos seu interesse prioritário/i)).toBeInTheDocument();
    });
  });
});
