import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { AuthResponseDto, WorkspaceDto } from '../types';
import { createCustomerFeedback } from '../services/api';

interface FeedbackModalProps {
  isOpen: boolean;
  currentUser: AuthResponseDto | null;
  activeWorkspace: WorkspaceDto | null;
  onClose: () => void;
}

export type FeedbackCategory =
  | 'support'
  | 'commercial'
  | 'improvement'
  | 'new-erp'
  | 'bug'
  | 'praise'
  | 'other';

export interface FeedbackSubmission {
  id: string;
  category: FeedbackCategory;
  rating: number;
  subject: string;
  message: string;
  contactEmail: string;
  workspaceName?: string;
  workspaceId?: string;
  createdAt: string;
}

export const FEEDBACK_STORAGE_KEY: string = 'dataconform_in_app_feedbacks';

export const FeedbackModal: FC<FeedbackModalProps> = ({
  isOpen,
  currentUser,
  activeWorkspace,
  onClose,
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('support');
  const [rating, setRating] = useState<number>(5);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const contactEmail: string = customEmail !== null ? customEmail : (currentUser?.email ?? '');
  const requiresEmail: boolean = category === 'support' || category === 'commercial';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Por favor, descreva sua solicitação, dúvida ou sugestão.');
      return;
    }
    if (requiresEmail && !contactEmail.trim()) {
      setError('Informe um e-mail para retorno para que nossa equipe possa responder seu chamado.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const defaultSubject: string =
      category === 'support'
        ? 'Chamado de Suporte Técnico / Assinatura'
        : category === 'commercial'
          ? 'Atendimento Comercial / Privacidade LGPD'
          : 'Feedback Geral';

    try {
      await createCustomerFeedback({
        workspaceId: activeWorkspace?.id,
        category,
        rating,
        subject: subject.trim() || defaultSubject,
        message: message.trim(),
        contactEmail: contactEmail.trim() || undefined,
      });

      const newFeedback: FeedbackSubmission = {
        id: `fbk-${Date.now()}`,
        category,
        rating,
        subject: subject.trim() || defaultSubject,
        message: message.trim(),
        contactEmail: contactEmail.trim(),
        workspaceName: activeWorkspace?.name,
        workspaceId: activeWorkspace?.id,
        createdAt: new Date().toISOString(),
      };

      const existingRaw: string | null = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const existing: FeedbackSubmission[] = existingRaw ? (JSON.parse(existingRaw) as FeedbackSubmission[]) : [];
      existing.unshift(newFeedback);
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));

      setSubmitted(true);
      setError(null);
    } catch {
      setError('Não foi possível registrar sua solicitação no servidor neste momento. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = (): void => {
    setSubmitted(false);
    setMessage('');
    setSubject('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          handleResetAndClose();
        }
      }}
    >
      <div className="modal-card feedback-modal-card">
        <div className="modal-header">
          <div>
            <h3>💬 Canal de Suporte, Atendimento Comercial & Feedback</h3>
            <span className="modal-subtitle-inline">
              Suporte técnico sobre cargas e assinaturas, dúvidas comerciais, solicitações LGPD e sugestões
            </span>
          </div>
          <button type="button" className="btn-close" onClick={handleResetAndClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="modal-body feedback-success-body">
            <div className="feedback-success-icon">✅</div>
            <h4>Solicitação registrada com sucesso!</h4>
            <p>
              Recebemos sua mensagem em nossa central de atendimento. Caso tenha informado seu e-mail para retorno, nossa equipe responderá em até 1 dia útil.
            </p>
            <div className="feedback-success-actions">
              <button type="button" className="btn btn-primary" onClick={handleResetAndClose}>
                Voltar à Plataforma
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-body">
              {error && <div className="inline-alert-error">{error}</div>}

              <div className="form-group">
                <label>Qual o assunto do seu contato?</label>
                <div className="feedback-category-chips">
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'support' ? 'active' : ''}`}
                    onClick={() => setCategory('support')}
                  >
                    🛠️ Suporte Técnico / Assinatura
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'commercial' ? 'active' : ''}`}
                    onClick={() => setCategory('commercial')}
                  >
                    💼 Dúvida Comercial / LGPD
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'new-erp' ? 'active' : ''}`}
                    onClick={() => setCategory('new-erp')}
                  >
                    🎯 Solicitar Layout / ERP
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'improvement' ? 'active' : ''}`}
                    onClick={() => setCategory('improvement')}
                  >
                    💡 Sugestão de Melhoria
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'bug' ? 'active' : ''}`}
                    onClick={() => setCategory('bug')}
                  >
                    ⚠️ Reportar Problema
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Avaliação da sua experiência (Opcional)</label>
                <div className="feedback-stars-row" role="radiogroup" aria-label="Nota de Satisfação">
                  {[1, 2, 3, 4, 5].map((star: number) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= rating ? 'star-active' : ''}`}
                      onClick={() => setRating(star)}
                      title={`${star} de 5 estrelas`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-desc">
                    {rating === 5 && 'Excelente 🚀'}
                    {rating === 4 && 'Muito boa 👍'}
                    {rating === 3 && 'Razoável, precisa de ajustes ⚖️'}
                    {rating === 2 && 'Com atritos / difícil ⚠️'}
                    {rating === 1 && 'Ruim / insatisfeito 🛑'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fbk-subject">Assunto Resumido (Opcional)</label>
                <input
                  id="fbk-subject"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Dúvida sobre assinatura Professional, reembolso ou layout Protheus"
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fbk-message">Detalhes da sua solicitação ou mensagem *</label>
                <textarea
                  id="fbk-message"
                  className="form-input"
                  rows={4}
                  placeholder="Descreva sua dúvida técnica, solicitação de faturamento/reembolso, requisição LGPD ou sugestão de evolução..."
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fbk-email">
                  E-mail para Retorno {requiresEmail ? '*' : '(Opcional)'}
                </label>
                <input
                  id="fbk-email"
                  type="email"
                  className="form-input"
                  placeholder="seu.email@empresa.com.br"
                  value={contactEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEmail(e.target.value)}
                  required={requiresEmail}
                />
                <span className="form-hint">
                  Utilizado exclusivamente para responder ao seu atendimento técnico, comercial ou solicitação LGPD.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleResetAndClose} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando...' : '📨 Registrar Solicitação'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
