import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { BillingConfigDto, WorkspaceDto, WorkspaceQuotaDto } from '../types';
import { PENDING_CHECKOUT_STORAGE_KEY, PlanTierLabels } from '../types';
import {
  changeWorkspacePlan,
  confirmStripeCheckout,
  createBillingPortalSession,
  createCheckoutSession,
  createCustomerFeedback,
  getBillingConfig,
} from '../services/api';
import { trackEvent, getAttributionPayload } from '../utils/analytics';

export { PENDING_CHECKOUT_STORAGE_KEY };

interface ChangePlanModalProps {
  isOpen: boolean;
  workspace: WorkspaceDto | null;
  isAuthenticated: boolean;
  userEmail?: string | null;
  onClose: () => void;
  onPlanChanged: (updatedQuota: WorkspaceQuotaDto) => void;
  onRequireAuth: () => void;
  onOpenSupport?: () => void;
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
const CONFIGURED_STRIPE_PRO_URL: string = ((import.meta.env.VITE_STRIPE_PRO_URL as string | undefined) ?? '').trim();
const STRIPE_PRO_URL: string =
  CONFIGURED_STRIPE_PRO_URL || (import.meta.env.DEV ? DEFAULT_STRIPE_PRO_TEST_URL : '');
const STRIPE_ENTERPRISE_URL: string = ((import.meta.env.VITE_STRIPE_ENTERPRISE_URL as string | undefined) ?? '').trim();
const CONFIGURED_SUPPORT_EMAIL: string = ((import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? '').trim();

const PLANS: PlanOption[] = [
  {
    key: 'Starter',
    name: 'Starter',
    price: 'Gratuito',
    monthlyFiles: 5,
    maxFileSize: 'Até 5 MB / arquivo',
    maxConcurrent: 'Até 2 arquivos por lote',
    maxRows: '500 linhas / arquivo',
    description: 'Ideal para validação inicial de layouts, testes de homologação e pequenas cargas.',
    features: [
      '5 validações de arquivos por mês',
      'Até 500 linhas e 5 MB por planilha',
      'Perfis de referência de ERPs inclusos',
      'Laudo técnico preliminar em PDF e CSV',
    ],
  },
  {
    key: 'Professional',
    name: 'Professional',
    price: 'R$ 79,90 / mês',
    monthlyFiles: 500,
    maxFileSize: 'Até 25 MB / arquivo',
    maxConcurrent: 'Até 5 arquivos por lote',
    maxRows: '15.000 linhas / arquivo',
    description: 'Para operações comerciais, consultorias de implantação e escritórios contábeis ativos.',
    features: [
      '500 validações de arquivos por mês (100x mais)',
      'Até 15.000 linhas e 25 MB por planilha',
      "Laudo Executivo Oficial (sem marca d'água) c/ Termo de Aceite",
      'Upload em lote de até 5 arquivos e trilha de auditoria',
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
      'Laudo Executivo Oficial, até 10 workspaces e governança',
    ],
  },
];

export const ChangePlanModal: FC<ChangePlanModalProps> = ({
  isOpen,
  workspace,
  isAuthenticated,
  userEmail,
  onClose,
  onPlanChanged,
  onRequireAuth,
  onOpenSupport,
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
  const [billingConfig, setBillingConfig] = useState<BillingConfigDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const actionSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (planKey: 'Starter' | 'Professional' | 'Enterprise'): void => {
    setSelectedPlan(planKey);
    setConfirmCancel(false);
    setError(null);
    setSuccessMessage(null);
    setTimeout(() => {
      actionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled: boolean = false;
    Promise.resolve(typeof getBillingConfig === 'function' ? getBillingConfig() : null)
      .then((cfg: BillingConfigDto | null) => {
        if (!cancelled && cfg) {
          setBillingConfig(cfg);
        }
      })
      .catch(() => {
        // Mantém fallback seguro sem expor erro ao usuário
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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

  const activeSupportEmail: string = (billingConfig?.supportEmail ?? CONFIGURED_SUPPORT_EMAIL).trim();
  const formattedExpiryDate: string | null = workspace?.planExpiresAtUtc
    ? new Date(workspace.planExpiresAtUtc).toLocaleDateString('pt-BR')
    : null;

  const isSelectedCurrent: boolean =
    Boolean(isAuthenticated && workspace) &&
    selectedPlan.toLowerCase() === currentPlanLabel.toLowerCase();

  const isDowngradeToStarter: boolean =
    Boolean(isAuthenticated && workspace) &&
    selectedPlan === 'Starter' &&
    currentPlanLabel !== 'Starter';

  const handleOpenBillingPortal = async (): Promise<void> => {
    if (!workspace || loading) return;
    setLoading(true);
    setError(null);
    try {
      const originUrl: string = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://dataconform.com.br/';
      const portal = await createBillingPortalSession(workspace.id, { returnUrl: originUrl });
      window.location.assign(portal.portalUrl);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Não foi possível abrir o portal de faturas da Stripe.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToStripe = async (): Promise<void> => {
    if (!workspace) {
      onClose();
      onRequireAuth();
      return;
    }

    if (loading) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const planConfig: PlanOption | undefined = PLANS.find((p: PlanOption) => p.key === selectedPlan);
    const configuredPrice: string =
      planConfig?.price ?? (selectedPlan === 'Professional' ? 'R$ 79,90 / mês' : 'R$ 249,90 / mês');

    // 1. Fluxo oficial server-side (Stripe Checkout Sessions c/ coleta de CPF/CNPJ, endereço e cupom)
    if (billingConfig?.checkoutEnabled) {
      setLoading(true);
      trackEvent('checkout_started', {
        targetPlan: selectedPlan,
        price: configuredPrice,
        workspaceId: workspace.id,
        stage: 'stripe_checkout_session',
      });

      try {
        const originUrl: string = typeof window !== 'undefined' ? `${window.location.origin}/` : 'https://dataconform.com.br/';
        const session = await createCheckoutSession(workspace.id, {
          plan: selectedPlan,
          successUrl: originUrl,
          cancelUrl: originUrl,
        });

        localStorage.setItem(
          PENDING_CHECKOUT_STORAGE_KEY,
          JSON.stringify({
            workspaceId: workspace.id,
            plan: selectedPlan,
            sessionId: session.sessionId ?? undefined,
            timestamp: new Date().getTime(),
          })
        );

        window.location.assign(session.checkoutUrl);
      } catch (err: unknown) {
        const msg: string = err instanceof Error ? err.message : 'Erro ao iniciar sessão de pagamento segura via Stripe.';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    const targetUrl: string =
      selectedPlan === 'Professional'
        ? STRIPE_PRO_URL
        : STRIPE_ENTERPRISE_URL;

    // 2. Enquanto o checkout Stripe não estiver ativo no ambiente, registra interesse comercial auditável
    if (!targetUrl || targetUrl.includes('/test_')) {
      const attribution = getAttributionPayload();

      trackEvent('checkout_started', {
        targetPlan: selectedPlan,
        price: configuredPrice,
        workspaceId: workspace.id,
        stage: 'intent_initiated',
      });

      setLoading(true);

      try {
        await createCustomerFeedback({
          workspaceId: workspace.id,
          category: 'commercial_upgrade_interest',
          rating: 5,
          subject: `Interesse no Plano ${selectedPlan}`,
          message: JSON.stringify({
            plan: selectedPlan,
            price: configuredPrice,
            firstTouch: attribution.firstTouch,
            lastTouch: attribution.lastTouch,
            registeredAt: new Date().toISOString(),
          }),
          contactEmail: userEmail || undefined,
        });

        setSuccessMessage(
          `Os planos comerciais pagos estão em fase final de ativação. Registramos seu interesse prioritário no plano ${selectedPlan} (${configuredPrice})! Você receberá condições exclusivas de lançamento assim que as contratações forem abertas. Enquanto isso, seu plano gratuito Starter continua 100% ativo com todos os perfis de ERP inclusos.`
        );
      } catch (err: unknown) {
        const technicalDetail: string = err instanceof Error ? err.message : 'Falha na comunicação com o servidor';
        console.error('[DataConform Commercial Audit] Erro ao registrar interesse de plano:', technicalDetail);

        if (activeSupportEmail.length > 0) {
          setError(
            `Não foi possível registrar seu interesse automaticamente neste momento. Para garantir sua condição prioritária de lançamento no plano ${selectedPlan} (${configuredPrice}), entre em contato pelo e-mail ${activeSupportEmail}.`
          );
        } else {
          setError(
            `Não foi possível registrar seu interesse automaticamente neste momento. Tente novamente em instantes ou utilize o Canal de Suporte e Atendimento na plataforma para falar com nossa equipe sobre o plano ${selectedPlan} (${configuredPrice}).`
          );
        }
      } finally {
        setLoading(false);
      }

      return;
    }

    // 3. Fallback via Payment Link direto (somente quando URL Live explícita estiver configurada)
    let checkoutRedirectUrl: string = targetUrl;
    try {
      const parsedUrl: URL = new URL(targetUrl);
      parsedUrl.searchParams.set('client_reference_id', workspace.id);
      if (userEmail && userEmail.trim().length > 0) {
        parsedUrl.searchParams.set('prefilled_email', userEmail.trim());
      }
      checkoutRedirectUrl = parsedUrl.toString();
    } catch {
      // Mantém URL base caso não seja URL absoluta padrão
    }

    localStorage.setItem(
      PENDING_CHECKOUT_STORAGE_KEY,
      JSON.stringify({
        workspaceId: workspace.id,
        plan: selectedPlan,
        timestamp: new Date().getTime(),
      })
    );

    trackEvent('checkout_started', {
      targetPlan: selectedPlan,
      price: configuredPrice,
      workspaceId: workspace.id,
      stage: 'payment_link_redirect',
    });

    window.location.assign(checkoutRedirectUrl);
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
        orcamento: 'Restrição orçamentária temporária',
        outro: 'Outro motivo',
      };

      const readableReason: string = reasonLabel[cancelReason] ?? cancelReason;
      const auditNote: string = `Cancelamento solicitado. Motivo: ${readableReason}.${
        cancelFeedbackText.trim() ? ` Feedback: "${cancelFeedbackText.trim()}".` : ''
      }`;

      try {
        await createCustomerFeedback({
          workspaceId: workspace.id,
          category: 'churn-survey',
          rating: 0,
          subject: `Cancelamento de Assinatura (${currentPlanLabel} -> Starter)`,
          message: `Motivo: ${readableReason}.${cancelFeedbackText.trim() ? ` Detalhes: "${cancelFeedbackText.trim()}".` : ''}`,
          contactEmail: userEmail || undefined,
        });
      } catch {
        // Ignora erro de rede para não travar o cancelamento
      }

      try {
        const storedFeedbacks: unknown[] = JSON.parse(
          localStorage.getItem('dataconform_churn_surveys') ?? '[]'
        ) as unknown[];
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

          {isAuthenticated && workspace?.cancelAtPeriodEnd && (
            <div className="visitor-auth-callout" role="status">
              <div>
                <strong>⏳ Renovação automática cancelada</strong>
                <p>
                  Os recursos do plano <strong>{currentPlanLabel}</strong> permanecem liberados
                  {formattedExpiryDate ? ` até ${formattedExpiryDate}` : ' até o encerramento do período vigente'}, retornando automaticamente ao plano gratuito Starter após essa data sem novas cobranças.
                </p>
              </div>
              {workspace.hasActiveSubscription && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={loading}
                  onClick={handleOpenBillingPortal}
                >
                  🧾 Gerenciar Faturas / Cartão
                </button>
              )}
            </div>
          )}

          {isAuthenticated && workspace?.hasActiveSubscription && !workspace.cancelAtPeriodEnd && (
            <div className="visitor-auth-callout">
              <div>
                <strong>💳 Assinatura corporativa gerenciada via Stripe</strong>
                <p>
                  Consulte recibos fiscais, altere o cartão de crédito cadastrado ou gerencie sua assinatura diretamente no portal seguro da Stripe.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={loading}
                onClick={handleOpenBillingPortal}
              >
                🧾 Gerenciar Faturas / Cartão
              </button>
            </div>
          )}

          {error && (
            <div className="inline-alert-error">
              <div>{error}</div>
              {onOpenSupport && (
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => {
                      onClose();
                      onOpenSupport();
                    }}
                  >
                    💬 Abrir Canal de Suporte e Atendimento
                  </button>
                </div>
              )}
            </div>
          )}
          {successMessage && <div className="inline-alert-success">{successMessage}</div>}

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
                <h4>Cancelar renovação e retornar ao Plano Starter (Gratuito)?</h4>
                <p>
                  Ao confirmar, a renovação automática será desativada: você mantém acesso integral aos recursos pagos até o fim do período já faturado (ou pode solicitar reembolso integral em até 7 dias da contratação, conforme Art. 49 do CDC). Seus projetos e laudos históricos permanecem preservados.
                </p>
              </div>

              {!confirmCancel ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm text-danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  Solicitar Cancelamento / Retorno ao Gratuito
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
                      {loading ? 'Processando...' : 'Confirmar Cancelamento'}
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
                  🔒 <strong>Checkout 100% Seguro via Stripe:</strong> Pagamento criptografado PCI-DSS Nível 1, sem fidelidade e com garantia integral de reembolso em 7 dias (CDC Art. 49).
                </span>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    className="btn-link text-xs"
                    onClick={() => setShowManualSession((prev: boolean) => !prev)}
                  >
                    {showManualSession ? 'Ocultar validação manual' : 'Já concluiu o pagamento em outra aba?'}
                  </button>
                )}
              </div>

              {import.meta.env.DEV && showManualSession && (
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
