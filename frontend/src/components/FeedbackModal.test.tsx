import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthResponseDto } from '../types';
import { FEEDBACK_STORAGE_KEY, FeedbackModal } from './FeedbackModal';
import { createCustomerFeedback } from '../services/api';

vi.mock('../services/api', () => ({
  createCustomerFeedback: vi.fn(),
}));

const createFeedbackMock = vi.mocked(createCustomerFeedback);

const user: AuthResponseDto = {
  token: 't',
  userId: 'u1',
  email: 'persona@empresa.com.br',
  fullName: 'Persona',
  role: 'Admin',
  workspaceId: 'w1',
  workspaceName: 'Org',
  workspaceSlug: 'org',
  plan: 'Starter',
} as AuthResponseDto;

describe('FeedbackModal', () => {
  beforeEach(() => {
    createFeedbackMock.mockReset();
    localStorage.clear();
  });

  it('não renderiza nada quando fechado', () => {
    const { container } = render(
      <FeedbackModal isOpen={false} currentUser={null} activeWorkspace={null} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('pré-preenche o e-mail de retorno com o usuário logado', () => {
    render(<FeedbackModal isOpen currentUser={user} activeWorkspace={null} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/E-mail para Retorno/i)).toHaveValue('persona@empresa.com.br');
  });

  it('envia chamado de suporte para a API e exibe confirmação', async () => {
    createFeedbackMock.mockResolvedValue({
      id: '1',
      category: 'support',
      rating: 5,
      subject: 'Chamado de Suporte Técnico / Assinatura',
      message: 'Preciso de ajuda com minha assinatura',
      createdAt: new Date().toISOString(),
    });

    render(<FeedbackModal isOpen currentUser={user} activeWorkspace={null} onClose={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText(/Detalhes da sua solicitação ou mensagem/i),
      'Preciso de ajuda com minha assinatura'
    );
    await userEvent.click(screen.getByRole('button', { name: /Registrar Solicitação/i }));

    expect(await screen.findByText(/Solicitação registrada com sucesso/i)).toBeInTheDocument();
    expect(createFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'support',
        message: 'Preciso de ajuda com minha assinatura',
        contactEmail: 'persona@empresa.com.br',
      })
    );

    const stored: unknown[] = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? '[]') as unknown[];
    expect(stored).toHaveLength(1);
  });

  it('exige e-mail de retorno para suporte/comercial quando visitante não está autenticado', async () => {
    render(<FeedbackModal isOpen currentUser={null} activeWorkspace={null} onClose={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText(/Detalhes da sua solicitação ou mensagem/i),
      'Dúvida sobre reembolso'
    );
    await userEvent.click(screen.getByRole('button', { name: /Registrar Solicitação/i }));

    expect(await screen.findByText(/Informe um e-mail para retorno/i)).toBeInTheDocument();
    expect(createFeedbackMock).not.toHaveBeenCalled();
  });

  it('exibe alerta honesto de erro e não simula entrega quando a API falha', async () => {
    createFeedbackMock.mockRejectedValue(new Error('offline'));

    render(<FeedbackModal isOpen currentUser={user} activeWorkspace={null} onClose={vi.fn()} />);

    await userEvent.type(
      screen.getByLabelText(/Detalhes da sua solicitação ou mensagem/i),
      'Sem internet'
    );
    await userEvent.click(screen.getByRole('button', { name: /Registrar Solicitação/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível registrar sua solicitação no servidor neste momento/i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/Solicitação registrada com sucesso/i)).not.toBeInTheDocument();
  });

  it('fecha ao pressionar Escape', async () => {
    const onClose = vi.fn();
    render(<FeedbackModal isOpen currentUser={null} activeWorkspace={null} onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
