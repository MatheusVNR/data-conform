import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { WorkspaceDto, WorkspaceQuotaDto } from '../types';
import { PlanTierLabels } from '../types';
import { changeWorkspacePlan, confirmStripeCheckout, createCustomerFeedback } from '../services/api';

interface ChangePlanModalProps {
  isOpen: boolean;
  workspace: WorkspaceDto | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onPlanChanged: (updatedQuota: WorkspaceQuotaDto) => void;
  onRequireAuth: () => void;
}

interface PlanOption {
  key: 'Starter' | 'Professional' | 'Enterprise';
  name: string;
  price: string;
  monthlyFiles: number;
  maxFileSize: string;
  maxConcurrent: string;
  maxRows: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

const DEFAULT_STRIPE_PRO_TEST_URL: string = 'https://buy.stripe.com/test_3cIeVdbxq6962QW36Ef7i00';
const STRIPE_PRO_URL: string =
  ((import.meta.env.VITE_STRIPE_PRO_URL as string | undefined) ?? '').trim() || DEFAULT_STRIPE_PRO_TEST_URL;
const STRIPE_ENTERPRISE_URL: string = ((import.meta.env.VITE_STRIPE_ENTERPRISE_URL as string | undefined) ?? '').trim();

import { PENDING_CHECKOUT_STORAGE_KEY } from '../types';
export { PENDING_CHECKOUT_STORAGE_KEY };

const PLANS: PlanOption[] = [
  {
    key: 'Starter',
    name: 'Starter',
    price: 'Gratuito',
    monthlyFiles: 20,
    maxFileSize: 'Até 5 MB / arquivo',
    maxConcurrent: 'Até 2 arquivos por lote',
    maxRows: '1.000 linhas / arquivo',
    description: 'Ideal para validação inicial de layouts, testes de homologação e pequenas cargas.',
    features: [
      '20 validações de arquivos por mês',
      'Até 1.000 linhas e 5 MB por planilha',
      'Dicionários nativos de ERPs inclusos',
      'Exportação de laudo de inconsistências CSV',
    ],
  },
  {
    key: 'Professional',
    name: 'Professional',
    price: 'R$ 79,90 / mês',
    monthlyFiles: 500,
    maxFileSize: 'Até 25 MB / arquivo',
    maxConcurrent: 'Até 5 arquivos por lote',
    maxRows: '50.000 linhas / arquivo',
    description: 'Para operações comerciais, consultorias de implantação e escritórios contábeis ativos.',
    features: [
      '500 validações de arquivos por mês (25x mais)',
      'Até 50.000 linhas e 25 MB por planilha',
      'Upload em lote de até 5 arquivos simultâneos',
      'Trilha completa de auditoria e governança',
    ],
    highlight: true,
  },
  {
    key: 'Enterprise',
    name: 'Enterprise',
    price: 'R$ 249,90 / mês',
    monthlyFiles: 10000,
    maxFileSize: 'Até 50 MB / arquivo',
    maxConcurrent: 'Até 10 arquivos por lote',
    maxRows: '1.000.000 linhas / arquivo',
    description: 'Para alto volume de processamento, migrações massivas de bases legadas e BPO.',
    features: [
      '10.000 validações de arquivos por mês',
      'Até 1.000.000 de linhas e 50 MB por planilha',
      'Upload em lote de até 10 arquivos simultâneos',
      'Governança corporativa e retenção estendida',
    ],
  },
];

export const ChangePlanModal: FC<ChangePlanModalProps> = ({
  isOpen,
  workspace,
  isAuthenticated,
  onClose,
  onPlanChanged,
  onRequireAuth,
}) => {
  const currentPlanLabel: string = workspace
    ? (PlanTierLabels[String(workspace.plan)] ?? 'Starter')
    : 'Starter';

  const defaultTargetPlan: 'Starter' | 'Professional' | 'Enterprise' =
    currentPlanLabel === 'Starter' ? 'Professional' : 'Enterprise';

  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Professional' | 'Enterprise'>(defaultTargetPlan);
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('outro');
  const [cancelFeedbackText, setCancelFeedbackText] = useState<string>('');
  const [manualSessionId, setManualSessionId] = useState<string>('');
  const [showManualSession, setShowManualSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const actionSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (planKey: 'Starter' | 'Professional' | 'Enterprise'): void => {
    setSelectedPlan(planKey);
    setConfirmCancel(false);
    setError(null);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

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

  const isSelectedCurrent: boolean =
    Boolean(isAuthenticated && workspace) &&
    selectedPlan.toLowerCase() === currentPlanLabel.toLowerCase();

  const isDowngradeToStarter: boolean =
    Boolean(isAuthenticated && workspace) &&
    selectedPlan === 'Starter' &&
    currentPlanLabel !== 'Starter';

  const handleProceedToStripe = (): void => {
    if (!workspace) {
      onClose();
      onRequireAuth();
      return;
    }

    setError(null);
    const targetUrl: string =
      selectedPlan === 'Professional'
        ? STRIPE_PRO_URL
        : STRIPE_ENTERPRISE_URL;

    if (!targetUrl) {
      setError('Link de checkout do Stripe não configurado para este plano.');
      return;
    }

    localStorage.setItem(
      PENDING_CHECKOUT_STORAGE_KEY,
      JSON.stringify({
        workspaceId: workspace.id,
        plan: selectedPlan,
        timestamp: new Date().getTime(),
      })
    );

    window.location.assign(targetUrl);
  };

  const handleManualSessionVerify = async (): Promise<void> => {
    if (!workspace) return;
    if (!manualSessionId.trim()) {
      setError('Informe o ID da sessão do Stripe (ex: cs_test_...).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated: WorkspaceQuotaDto = await confirmStripeCheckout(workspace.id, {
        sessionId: manualSessionId.trim(),
        plan: selectedPlan === 'Starter' ? 'Professional' : selectedPlan,
      });
      localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      onPlanChanged(updated);
      onClose();
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Falha ao validar sessão de pagamento';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (): Promise<void> => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const reasonLabel: Record<string, string> = {
        'erp-ausente': 'Faltou suporte a determinado ERP ou formato',
        'volume-baixo': 'Volume de arquivos foi baixo este mês',
        'duvida-tecnica': 'Dúvidas ou dificuldades na homologação',
        'orcamento': 'Restrição orçamentária temporária',
        'outro': 'Outro motivo',
      };

      const readableReason: string = reasonLabel[cancelReason] ?? cancelReason;
      const auditNote: string = `Cancelamento solicitado. Motivo: ${readableReason}.${
        cancelFeedbackText.trim() ? ` Feedback: "${cancelFeedbackText.trim()}".` : ''
      }`;

      // Persiste histórico de churn no banco de dados e localmente para auditoria e inteligência de produto
      try {
        await createCustomerFeedback({
          workspaceId: workspace.id,
          category: 'churn-survey',
          rating: 0,
          subject: `Cancelamento de Assinatura (${currentPlanLabel} -> Starter)`,
          message: `Motivo: ${readableReason}.${cancelFeedbackText.trim() ? ` Detalhes: "${cancelFeedbackText.trim()}".` : ''}`,
        });
      } catch {
        // Ignora erro de rede para não travar o cancelamento
      }

      try {
        const storedFeedbacks: unknown[] = JSON.parse(
          localStorage.getItem('dataconform_churn_surveys') ?? '[]'
        );
        storedFeedbacks.push({
          workspaceId: workspace.id,
          previousPlan: currentPlanLabel,
          reason: readableReason,
          feedbackText: cancelFeedbackText.trim(),
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('dataconform_churn_surveys', JSON.stringify(storedFeedbacks));
      } catch {
        // Ignora eventual restrição de storage
      }

      const updated: WorkspaceQuotaDto = await changeWorkspacePlan(
        workspace.id,
        'Starter',
        auditNote
      );
      onPlanChanged(updated);
      onClose();
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao cancelar assinatura';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog plan-modal-dialog">
        <div className="modal-header">
          <div>
            <h2>Planos Comerciais & Capacidade Operacional</h2>
            <span className="modal-subtitle-inline">
              {isAuthenticated && workspace ? (
                <>
                  Organização: <strong>{workspace.name}</strong> • Plano Atual:{' '}
                  <strong className="text-primary">{currentPlanLabel}</strong>
                </>
              ) : (
                <>Compare as faixas de capacidade para homologação de dados em ERPs</>
              )}
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {!isAuthenticated && (
            <div className="visitor-auth-callout">
              <div>
                <strong>Crie sua conta gratuita para começar no Plano Starter</strong>
                <p>
                  Ao registrar sua organização, você recebe imediatamente a cota gratuita do plano Starter e pode fazer upgrade a qualquer momento via Stripe.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onRequireAuth();
                }}
              >
                Criar Conta Gratuita
              </button>
            </div>
          )}

          {error && <div className="inline-alert-error">{error}</div>}

          <div className="plans-grid">
            {PLANS.map((plan: PlanOption) => {
              const isCurrent: boolean =
                Boolean(isAuthenticated && workspace) &&
                currentPlanLabel.toLowerCase() === plan.key.toLowerCase();
              const isSelected: boolean = selectedPlan.toLowerCase() === plan.key.toLowerCase();

              return (
                <div
                  key={plan.key}
                  className={`plan-card ${plan.highlight ? 'plan-card-highlight' : ''} ${
                    isSelected ? 'plan-card-selected' : ''
                  }`}
                  onClick={() => {
                    handleSelectPlan(plan.key);
                  }}
                >
                  {plan.highlight && <div className="plan-popular-ribbon">Mais Escolhido</div>}

                  <div className="plan-card-top">
                    <h3>{plan.name}</h3>
                    <div className="plan-price">{plan.price}</div>
                    <p className="plan-desc">{plan.description}</p>
                  </div>

                  <ul className="plan-features-list">
                    {plan.features.map((feat: string) => (
                      <li key={feat}>
                        <span className="feat-check">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="plan-card-action">
                    {isCurrent ? (
                      <span className="badge badge-completed plan-current-badge">✓ Plano Atual Ativo</span>
                    ) : isSelected ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-full btn-primary btn-plan-direct-action"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (plan.key !== 'Starter') {
                            handleProceedToStripe();
                          } else {
                            setConfirmCancel(true);
                            setTimeout(() => {
                              actionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                          }
                        }}
                      >
                        {plan.key !== 'Starter' ? '💳 Assinar via Stripe' : '⬇ Solicitar Downgrade'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-full btn-outline"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleSelectPlan(plan.key);
                        }}
                      >
                        Selecionar {plan.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Ação Dinâmica / Destaque do Plano Selecionado */}
          {isAuthenticated && workspace && !isSelectedCurrent && (
            <div ref={actionSectionRef} className="plan-selection-summary-bar">
              <div className="summary-bar-text">
                <span className="summary-bar-label">Plano selecionado para alteração:</span>
                <span className="summary-bar-target">
                  <strong>{selectedPlan}</strong> ({PLANS.find((p: PlanOption) => p.key === selectedPlan)?.price})
                </span>
              </div>
              {selectedPlan !== 'Starter' ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-pulse-checkout"
                  onClick={handleProceedToStripe}
                  disabled={loading}
                >
                  💳 Ir para Checkout Seguro ({selectedPlan})
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-danger"
                  onClick={() => setConfirmCancel(true)}
                  disabled={loading}
                >
                  Confirmar Retorno ao Gratuito
                </button>
              )}
            </div>
          )}

          {/* Seção de Cancelamento / Downgrade com Pesquisa Preventiva de Churn */}
          {isAuthenticated && isDowngradeToStarter && (
            <div className="cancel-subscription-box">
              <div>
                <h4>Retornar ao Plano Starter (Gratuito)?</h4>
                <p>
                  Ao retornar para o plano <strong>Starter</strong>, sua organização passará ao limite de 20 arquivos/mês (máx. 1.000 linhas e 5 MB por arquivo). Seus projetos e laudos históricos permanecem 100% seguros.
                </p>
              </div>

              {!confirmCancel ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  Solicitar Retorno ao Gratuito
                </button>
              ) : (
                <div className="churn-survey-box">
                  <div className="churn-survey-header">
                    <strong>💬 Sentiremos sua falta! Ajude-nos a melhorar:</strong>
                    <span className="churn-survey-sub">
                      Qual foi o principal motivo para optar pelo cancelamento?
                    </span>
                  </div>

                  <div className="churn-reasons-list">
                    <label className="churn-radio-label">
                      <input
                        type="radio"
                        name="churn-reason"
                        value="erp-ausente"
                        checked={cancelReason === 'erp-ausente'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                      />
                      <span>Faltou suporte a determinado layout ou ERP</span>
                    </label>

                    <label className="churn-radio-label">
                      <input
                        type="radio"
                        name="churn-reason"
                        value="volume-baixo"
                        checked={cancelReason === 'volume-baixo'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                      />
                      <span>Volume de arquivos foi baixo neste período</span>
                    </label>

                    <label className="churn-radio-label">
                      <input
                        type="radio"
                        name="churn-reason"
                        value="duvida-tecnica"
                        checked={cancelReason === 'duvida-tecnica'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                      />
                      <span>Dúvidas técnicas ou usabilidade</span>
                    </label>

                    <label className="churn-radio-label">
                      <input
                        type="radio"
                        name="churn-reason"
                        value="orcamento"
                        checked={cancelReason === 'orcamento'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                      />
                      <span>Restrição orçamentária temporária</span>
                    </label>

                    <label className="churn-radio-label">
                      <input
                        type="radio"
                        name="churn-reason"
                        value="outro"
                        checked={cancelReason === 'outro'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                      />
                      <span>Outro motivo</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    className="form-input form-input-sm"
                    placeholder="O que poderíamos ter feito melhor para manter você? (Opcional)"
                    value={cancelFeedbackText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelFeedbackText(e.target.value)}
                  />

                  <div className="cancel-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                      onClick={() => setConfirmCancel(false)}
                    >
                      ✓ Manter Meu Plano Ativo
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm text-danger"
                      disabled={loading}
                      onClick={handleCancelSubscription}
                    >
                      {loading ? 'Processando...' : 'Confirmar Retorno ao Starter'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checkout Seguro via Stripe */}
          {isAuthenticated && workspace && selectedPlan !== 'Starter' && !isSelectedCurrent && (
            <div className="stripe-checkout-notice">
              <div className="stripe-security-info">
                <span>
                  🔒 <strong>Checkout 100% Seguro via Stripe:</strong> A liberação do plano ocorre automaticamente após a conclusão do pagamento e retorno à plataforma.
                </span>
                <button
                  type="button"
                  className="btn-link text-xs"
                  onClick={() => setShowManualSession((prev: boolean) => !prev)}
                >
                  {showManualSession ? 'Ocultar validação manual' : 'Já concluiu o pagamento em outra aba?'}
                </button>
              </div>

              {showManualSession && (
                <div className="manual-session-box">
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    placeholder="Cole o ID da sessão do Stripe (ex: cs_test_...)"
                    value={manualSessionId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualSessionId(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={loading}
                    onClick={handleManualSessionVerify}
                  >
                    {loading ? 'Verificando...' : 'Validar Pagamento'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Fechar
          </button>

          {!isAuthenticated ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
            >
              🚀 Criar Conta Gratuita para Começar
            </button>
          ) : (
            selectedPlan !== 'Starter' &&
            !isSelectedCurrent && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleProceedToStripe}
                disabled={loading}
              >
                💳 Prosseguir para Pagamento Seguro via Stripe ({selectedPlan})
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
