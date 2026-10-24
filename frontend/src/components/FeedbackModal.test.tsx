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

  it('envia o feedback para a API e exibe a tela de agradecimento', async () => {
    createFeedbackMock.mockResolvedValue({
      id: '1',
      category: 'improvement',
      rating: 5,
      subject: 'Feedback Geral',
      message: 'Ótimo',
      createdAt: new Date().toISOString(),
    });

    render(<FeedbackModal isOpen currentUser={user} activeWorkspace={null} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/aprimorar sua rotina/i), 'Ótimo produto');
    await userEvent.click(screen.getByRole('button', { name: /Enviar Feedback/i }));

    expect(await screen.findByText(/Muito obrigado pelo seu feedback/i)).toBeInTheDocument();
    expect(createFeedbackMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Ótimo produto', contactEmail: 'persona@empresa.com.br' })
    );
  });

  it('mantém o feedback localmente quando a API falha (fallback offline)', async () => {
    createFeedbackMock.mockRejectedValue(new Error('offline'));

    render(<FeedbackModal isOpen currentUser={null} activeWorkspace={null} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/aprimorar sua rotina/i), 'Sem internet');
    await userEvent.click(screen.getByRole('button', { name: /Enviar Feedback/i }));

    await waitFor(() => {
      const stored: unknown[] = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? '[]') as unknown[];
      expect(stored).toHaveLength(1);
    });
    expect(screen.getByText(/Muito obrigado pelo seu feedback/i)).toBeInTheDocument();
  });

  it('fecha ao pressionar Escape', async () => {
    const onClose = vi.fn();
    render(<FeedbackModal isOpen currentUser={null} activeWorkspace={null} onClose={onClose} />);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
