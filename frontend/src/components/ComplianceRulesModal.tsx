import { useEffect } from 'react';
import type { FC } from 'react';

interface ComplianceRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BusinessPillar {
  badge: string;
  title: string;
  impact: string;
  description: string;
}

const BUSINESS_PILLARS: BusinessPillar[] = [
  {
    badge: 'Prevenção de Parada de Lote',
    title: 'Blindagem Estrutural antes da Importação',
    impact: 'Elimina travamentos de rotina no ERP',
    description:
      'Garante que nenhuma planilha chegue ao sistema de gestão com quebras de linha, deslocamento de colunas ou falhas de codificação que interrompam o processamento noturno ou gerem registros truncados.',
  },
  {
    badge: 'Compliance Fiscal & Cadastral',
    title: 'Saneamento de Documentos e Contatos B2B',
    impact: 'Evita rejeição de NF-e e cadastros duplicados',
    description:
      'Audita a autenticidade matemática de inscrições fiscais (CPF e CNPJ) e a integridade de endereços eletrônicos corporativos antes que clientes ou fornecedores sejam ativados na base.',
  },
  {
    badge: 'Segurança Financeira & Contábil',
    title: 'Consistência de Valores, Limites e Vencimentos',
    impact: 'Protege o contas a pagar/receber e crédito',
    description:
      'Bloqueia lançamentos com valores corrompidos, limites de crédito inconsistentes ou datas fora do calendário contábil, prevenindo distorções em fechamentos e conciliações.',
  },
  {
    badge: 'Aderência a Dicionários de ERP',
    title: 'Templates Homologados por Sistema Destino',
    impact: 'Pronto para TOTVS, SAP, Senior, Sankhya e Omie',
    description:
      'Adapta a exigência de campos obrigatórios de acordo com o módulo e o ERP da sua operação, permitindo que equipes de negócio validem cargas sem depender de scripts técnicos da TI.',
  },
];

export const ComplianceRulesModal: FC<ComplianceRulesModalProps> = ({ isOpen, onClose }) => {
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

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog rules-modal-dialog">
        <div className="modal-header">
          <div>
            <h2 id="rules-modal-title">Garantias de Conformidade & Governança</h2>
            <p className="modal-subtitle-inline">
              Como o DataConform protege sua operação antes da carga no ERP
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="rules-intro-banner">
            <strong>Por que auditar antes de importar?</strong>
            <p>
              Uma única planilha com dados inconsistentes pode travar rotinas de fechamento, gerar rejeições fiscais em lote ou exigir dias de limpeza manual no banco de dados do ERP. O DataConform atua como uma barreira preventiva de qualidade para equipes de TI, Controladoria e Implantação.
            </p>
          </div>

          <div className="rules-section">
            <h4 className="rules-section-title">
              Pilares de Proteção Operacional
            </h4>
            <p className="rules-section-desc">
              Cada arquivo enviado passa por uma bateria automatizada de verificações de negócio e aderência ao sistema de destino:
            </p>

            <div className="rules-cards-grid">
              {BUSINESS_PILLARS.map((pillar: BusinessPillar) => (
                <div key={pillar.title} className="rule-card">
                  <div className="rule-card-top">
                    <span className="badge badge-action">{pillar.badge}</span>
                  </div>
                  <strong className="rule-card-title">{pillar.title}</strong>
                  <span className="rule-card-trigger">{pillar.impact}</span>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rules-faq-box">
            <h5>Fluxo de Saneamento para Equipes de Negócio</h5>
            <p>
              Ao identificar qualquer divergência, a plataforma gera um <strong>Laudo Executivo de Conformidade</strong> indicando exatamente a linha e o campo que precisam de ajuste, permitindo exportar as pendências em um clique para correção imediata antes da carga definitiva.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
