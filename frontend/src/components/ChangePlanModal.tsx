import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { WorkspaceDto, WorkspaceQuotaDto } from '../types';
import { changeWorkspacePlan } from '../services/api';

interface ChangePlanModalProps {
  isOpen: boolean;
  workspace: WorkspaceDto | null;
  onClose: () => void;
  onPlanChanged: (updatedQuota: WorkspaceQuotaDto) => void;
}

interface PlanOption {
  key: string;
  name: string;
  price: string;
  monthlyFiles: number;
  maxRows: string;
  description: string;
  capacityGain?: string;
  highlight?: boolean;
}

const PLANS: PlanOption[] = [
  {
    key: 'Starter',
    name: 'Starter',
    price: 'Gratuito',
    monthlyFiles: 20,
    maxRows: '1.000 linhas/arquivo',
    description: 'Ideal para testes, validações esporádicas e pequenas planilhas.',
    capacityGain: 'Entrada: 20 uploads/mês',
  },
  {
    key: 'Professional',
    name: 'Professional',
    price: 'R$ 299 / mês',
    monthlyFiles: 500,
    maxRows: '50.000 linhas/arquivo',
    description: 'Para operações comerciais ativas com integrações ERP contínuas.',
    capacityGain: '+480 uploads/mês (25x mais)',
    highlight: true,
  },
  {
    key: 'Enterprise',
    name: 'Enterprise',
    price: 'R$ 990 / mês',
    monthlyFiles: 10000,
    maxRows: '1.000.000 linhas/arquivo',
    description: 'Volume massivo, alta prioridade de processamento e auditoria avançada.',
    capacityGain: '+9.500 uploads/mês (Massivo)',
  },
];

export const ChangePlanModal: FC<ChangePlanModalProps> = ({
  isOpen,
  workspace,
  onClose,
  onPlanChanged,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('Professional');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen || !workspace) return null;

  const currentPlanStr: string = String(workspace.plan);

  const handleConfirmPlan = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const updated: WorkspaceQuotaDto = await changeWorkspacePlan(workspace.id, selectedPlan);
      onPlanChanged(updated);
      onClose();
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao alterar plano';
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
          <h2>Gerenciar Plano Comercial & Cotas</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert-toast alert-error">{error}</div>}

          <p className="plan-modal-intro">
            Selecione o plano ideal para a capacidade operacional do workspace <strong>{workspace.name}</strong>:
          </p>

          <div className="plans-grid">
            {PLANS.map((plan: PlanOption) => {
              const isCurrent: boolean = currentPlanStr.toLowerCase() === plan.key.toLowerCase();
              const isSelected: boolean = selectedPlan.toLowerCase() === plan.key.toLowerCase();

              return (
                <div
                  key={plan.key}
                  className={`plan-card ${plan.highlight ? 'plan-card-highlight' : ''} ${
                    isSelected ? 'plan-card-selected' : ''
                  }`}
                  onClick={() => setSelectedPlan(plan.key)}
                >
                  <div className="plan-card-top-badges">
                    {plan.highlight && <span className="plan-badge-popular">Mais Popular</span>}
                    {plan.capacityGain && (
                      <span className="plan-badge-gain">{plan.capacityGain}</span>
                    )}
                  </div>
                  <div className="plan-card-header">
                    <h3>{plan.name}</h3>
                    <div className="plan-price">{plan.price}</div>
                  </div>

                  <p className="plan-desc">{plan.description}</p>

                  <ul className="plan-features">
                    <li>✓ <strong>{plan.monthlyFiles.toLocaleString()}</strong> uploads / mês</li>
                    <li>✓ Até <strong>{plan.maxRows}</strong></li>
                    <li>✓ Validação de delimitador e colunas</li>
                    <li>✓ Relatórios de inconsistências</li>
                  </ul>

                  <div className="plan-status-footer">
                    {isCurrent ? (
                      <span className="badge badge-active-plan">Plano Atual</span>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.key);
                        }}
                      >
                        {isSelected ? 'Selecionado' : 'Selecionar'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmPlan}
            disabled={loading || selectedPlan.toLowerCase() === currentPlanStr.toLowerCase()}
          >
            {loading ? 'Atualizando...' : `Ativar Plano ${selectedPlan}`}
          </button>
        </div>
      </div>
    </div>
  );
};
