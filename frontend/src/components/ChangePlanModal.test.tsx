import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomerFeedbackDto, WorkspaceDto } from '../types';
import { ChangePlanModal } from './ChangePlanModal';
import {
  createBillingPortalSession,
  createCheckoutSession,
  createCustomerFeedback,
  getBillingConfig,
} from '../services/api';
import * as analyticsModule from '../utils/analytics';

vi.mock('../services/api', () => ({
  createCustomerFeedback: vi.fn(),
  changeWorkspacePlan: vi.fn(),
  confirmStripeCheckout: vi.fn(),
  getBillingConfig: vi.fn().mockResolvedValue({
    checkoutEnabled: false,
    customerPortalEnabled: false,
    isLiveMode: false,
    supportEmail: null,
  }),
  createCheckoutSession: vi.fn(),
  createBillingPortalSession: vi.fn(),
}));

vi.mock('../utils/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/analytics')>();
  return {
    ...actual,
    trackEvent: vi.fn(),
  };
});

const mockCreateFeedback = vi.mocked(createCustomerFeedback);
const mockGetBillingConfig = vi.mocked(getBillingConfig);
const mockCreateCheckoutSession = vi.mocked(createCheckoutSession);
const mockCreateBillingPortalSession = vi.mocked(createBillingPortalSession);
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

describe('ChangePlanModal — Validação de Captura Comercial e Ciclo Stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBillingConfig.mockResolvedValue({
      checkoutEnabled: false,
      customerPortalEnabled: false,
      isLiveMode: false,
      supportEmail: null,
    });
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

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'checkout_started',
      expect.objectContaining({
        targetPlan: 'Professional',
        price: 'R$ 79,90 / mês',
        workspaceId: mockWorkspace.id,
      })
    );

    expect(mockCreateFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: mockWorkspace.id,
        category: 'commercial_upgrade_interest',
        rating: 5,
        contactEmail: 'consultor@empresa.com.br',
        subject: 'Interesse no Plano Professional',
      })
    );

    expect(
      await screen.findByText(/Registramos seu interesse prioritário no plano Professional/i)
    ).toBeInTheDocument();

    expect(screen.queryByText(/Não foi possível registrar seu interesse/i)).not.toBeInTheDocument();
  });

  it('2. Falha de rede sem e-mail ativo: exibe aviso honesto e orienta Canal de Suporte integrado sem expor e-mail inexistente', async () => {
    mockCreateFeedback.mockRejectedValueOnce(new Error('NetworkError when attempting to fetch resource.'));
    const onOpenSupport = vi.fn();

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={mockWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
        onOpenSupport={onOpenSupport}
      />
    );

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    expect(
      await screen.findByText(/Não foi possível registrar seu interesse automaticamente neste momento.*Canal de Suporte e Atendimento/i)
    ).toBeInTheDocument();

    expect(screen.queryByText(/contato@dataconform\.com\.br/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Registramos seu interesse prioritário/i)).not.toBeInTheDocument();

    const supportBtn = screen.getByRole('button', { name: /Abrir Canal de Suporte e Atendimento/i });
    await userEvent.click(supportBtn);
    expect(onOpenSupport).toHaveBeenCalledTimes(1);
  });

  it('3. Falha de persistência no backend (500) com e-mail verificado configurado: exibe o e-mail oficial', async () => {
    mockGetBillingConfig.mockResolvedValueOnce({
      checkoutEnabled: false,
      customerPortalEnabled: false,
      isLiveMode: false,
      supportEmail: 'suporte@dataconform.com.br',
    });
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

    await waitFor(() => {
      expect(mockGetBillingConfig).toHaveBeenCalled();
    });

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    expect(
      await screen.findByText(/Não foi possível registrar seu interesse.*suporte@dataconform\.com\.br/i)
    ).toBeInTheDocument();
  });

  it('4. Resposta inválida ou inesperada da API: trata graceful e orienta canal de atendimento', async () => {
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
      await screen.findByText(/Canal de Suporte e Atendimento/i)
    ).toBeInTheDocument();
  });

  it('5. Repetição de solicitações: previne múltiplos envios concorrentes durante o loading', async () => {
    let resolveApiCall: (val: CustomerFeedbackDto) => void = () => {};
    const hangingPromise: Promise<CustomerFeedbackDto> = new Promise<CustomerFeedbackDto>((resolve) => {
      resolveApiCall = resolve;
    });
    mockCreateFeedback.mockReturnValueOnce(hangingPromise);

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
    expect(mockCreateFeedback).toHaveBeenCalledTimes(1);

    await userEvent.click(upgradeButton);
    expect(mockCreateFeedback).toHaveBeenCalledTimes(1);

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

  it('6. Checkout Stripe ativo (checkoutEnabled = true): cria sessão segura no backend em vez de apenas registrar lead', async () => {
    mockGetBillingConfig.mockResolvedValueOnce({
      checkoutEnabled: true,
      customerPortalEnabled: true,
      isLiveMode: true,
      supportEmail: null,
    });
    mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Redirecionamento simulado bloqueado no JSDOM'));

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

    await waitFor(() => {
      expect(mockGetBillingConfig).toHaveBeenCalled();
    });

    const upgradeButton = screen.getByRole('button', { name: /Ir para Checkout Seguro/i });
    await userEvent.click(upgradeButton);

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      mockWorkspace.id,
      expect.objectContaining({
        plan: 'Professional',
      })
    );
    expect(mockCreateFeedback).not.toHaveBeenCalled();
  });

  it('7. Assinatura com cancelamento agendado (cancelAtPeriodEnd): exibe banner de vigência e botão do Portal Stripe', async () => {
    mockCreateBillingPortalSession.mockRejectedValueOnce(new Error('Portal bloqueado no JSDOM'));

    const cancellingWorkspace: WorkspaceDto = {
      ...mockWorkspace,
      plan: 'Professional',
      monthlyFilesQuota: 500,
      maxRowsPerFile: 15000,
      cancelAtPeriodEnd: true,
      planExpiresAtUtc: '2026-12-15T12:00:00Z',
      hasActiveSubscription: true,
    };

    render(
      <ChangePlanModal
        isOpen={true}
        workspace={cancellingWorkspace}
        isAuthenticated={true}
        userEmail="consultor@empresa.com.br"
        onClose={vi.fn()}
        onPlanChanged={vi.fn()}
        onRequireAuth={vi.fn()}
      />
    );

    expect(screen.getByText(/Renovação automática cancelada/i)).toBeInTheDocument();
    const portalBtn = screen.getByRole('button', { name: /Gerenciar Faturas \/ Cartão/i });
    await userEvent.click(portalBtn);
    expect(mockCreateBillingPortalSession).toHaveBeenCalledWith(
      cancellingWorkspace.id,
      expect.any(Object)
    );
  });
});
