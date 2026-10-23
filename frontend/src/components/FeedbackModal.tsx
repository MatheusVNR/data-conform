import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { AuthResponseDto, WorkspaceDto } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  currentUser: AuthResponseDto | null;
  activeWorkspace: WorkspaceDto | null;
  onClose: () => void;
}

export interface FeedbackSubmission {
  id: string;
  category: 'improvement' | 'new-erp' | 'bug' | 'praise' | 'other';
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
  const [category, setCategory] = useState<'improvement' | 'new-erp' | 'bug' | 'praise' | 'other'>('improvement');
  const [rating, setRating] = useState<number>(5);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>(currentUser?.email ?? '');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.email && !contactEmail) {
      setContactEmail(currentUser.email);
    }
  }, [currentUser, contactEmail]);

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

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Por favor, descreva seu feedback ou sugestão.');
      return;
    }

    try {
      const newFeedback: FeedbackSubmission = {
        id: `fbk-${Date.now()}`,
        category,
        rating,
        subject: subject.trim() || 'Feedback Geral',
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
      setError('Não foi possível gravar o feedback localmente.');
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
            <h3>💬 Canal Direto de Feedback & Melhorias</h3>
            <span className="modal-subtitle-inline">
              Sua opinião direciona o roadmap do DataConform antes de qualquer decisão técnica
            </span>
          </div>
          <button type="button" className="btn-close" onClick={handleResetAndClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="modal-body feedback-success-body">
            <div className="feedback-success-icon">🎉</div>
            <h4>Muito obrigado pelo seu feedback!</h4>
            <p>
              Registramos sua sugestão com sucesso. Nossa equipe analisa cada contribuição para evoluir os dicionários, as regras de negócio e a experiência do produto.
            </p>
            <div className="modal-footer" style={{ borderTop: 'none', padding: '1rem 0 0 0' }}>
              <button type="button" className="btn btn-primary" onClick={handleResetAndClose}>
                Voltar à Plataforma
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="inline-alert-error">{error}</div>}

              {/* Categoria do Feedback */}
              <div className="form-group">
                <label>Qual o objetivo do seu contato?</label>
                <div className="feedback-category-chips">
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'improvement' ? 'active' : ''}`}
                    onClick={() => setCategory('improvement')}
                  >
                    💡 Sugestão de Melhoria
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'new-erp' ? 'active' : ''}`}
                    onClick={() => setCategory('new-erp')}
                  >
                    🎯 Solicitar Novo ERP / Layout
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'bug' ? 'active' : ''}`}
                    onClick={() => setCategory('bug')}
                  >
                    ⚠️ Reportar Dificuldade
                  </button>
                  <button
                    type="button"
                    className={`feedback-chip ${category === 'praise' ? 'active' : ''}`}
                    onClick={() => setCategory('praise')}
                  >
                    ⭐ Elogio / Outro
                  </button>
                </div>
              </div>

              {/* Avaliação de Satisfação */}
              <div className="form-group">
                <label>Como você avalia sua experiência até agora?</label>
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

              {/* Título opcional */}
              <div className="form-group">
                <label htmlFor="fbk-subject">Assunto Resumido (Opcional)</label>
                <input
                  id="fbk-subject"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Validação de campo específico no TOTVS ou facilidade de upload"
                  value={subject}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                />
              </div>

              {/* Mensagem detalhada */}
              <div className="form-group">
                <label htmlFor="fbk-message">O que podemos fazer para aprimorar sua rotina? *</label>
                <textarea
                  id="fbk-message"
                  className="form-input"
                  rows={4}
                  placeholder="Conte-nos o que achou, que rotina foi difícil ou o que gostaria de ver na plataforma antes de pensar em cancelar ou buscar outra solução..."
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  required
                />
              </div>

              {/* E-mail para retorno */}
              <div className="form-group">
                <label htmlFor="fbk-email">E-mail para Retorno (Opcional)</label>
                <input
                  id="fbk-email"
                  type="email"
                  className="form-input"
                  placeholder="seu.email@empresa.com.br"
                  value={contactEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value)}
                />
                <span className="form-hint">
                  Preencha caso queira receber um retorno direto da nossa equipe técnica sobre a sugestão.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleResetAndClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                🚀 Enviar Feedback
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
