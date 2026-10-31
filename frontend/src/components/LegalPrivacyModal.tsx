import { useEffect } from 'react';
import type { FC } from 'react';

interface LegalPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalPrivacyModal: FC<LegalPrivacyModalProps> = ({ isOpen, onClose }) => {
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
      aria-labelledby="legal-modal-title"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-dialog rules-modal-dialog">
        <div className="modal-header">
          <div>
            <h2 id="legal-modal-title">Termos de Uso, Privacidade & Governança LGPD</h2>
            <p className="modal-subtitle-inline">
              Compromisso de confidencialidade, processamento efêmero e proteção de dados corporativos
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="rules-intro-banner">
            <strong>🔒 Selo de Processamento Efêmero (Expurgo Automático em 24h)</strong>
            <p>
              O DataConform foi projetado sob o princípio de <strong>minimização de dados</strong> da LGPD (Lei nº 13.709/2018): os arquivos brutos <code>.csv</code> e <code>.txt</code> enviados para homologação são utilizados exclusivamente para gerar o laudo técnico e <strong>expurgados fisicamente do armazenamento em até 24 horas</strong> — ou imediatamente quando você clica em <em>Excluir</em> no projeto.
            </p>
          </div>

          <div className="rules-section">
            <h4 className="rules-section-title">Diretrizes Contratuais e de Segurança da Informação</h4>
            <div className="rules-cards-grid">
              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Papel na LGPD</span>
                </div>
                <strong className="rule-card-title">Operador de Dados Restrito</strong>
                <span className="rule-card-trigger">Art. 5º, VII e Art. 39 da Lei 13.709/2018</span>
                <p>
                  Você (ou sua empresa/consultoria) permanece como único <strong>Controlador</strong> e titular intelectual das bases auditadas. O DataConform atua estritamente como Operador técnico automatizado para validação cadastral e fiscal pré-carga.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Confidencialidade B2B</span>
                </div>
                <strong className="rule-card-title">Zero Compartilhamento ou Uso em IA</strong>
                <span className="rule-card-trigger">Motor 100% Determinístico Privado</span>
                <p>
                  Seus arquivos, CNPJs, CPFs, e-mails e valores financeiros <strong>jamais</strong> são vendidos, compartilhados com terceiros ou enviados para APIs externas de Inteligência Artificial / LLMs.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Arquitetura Segura</span>
                </div>
                <strong className="rule-card-title">Isolamento Multi-Tenant Estrito</strong>
                <span className="rule-card-trigger">Tráfego TLS + Segregação por Organização</span>
                <p>
                  Cada Workspace opera sob isolamento lógico verificado a cada requisição autenticada (JWT), com proteção contra injeção de fórmulas em planilhas e registro em trilha de auditoria.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Assinaturas & Limites</span>
                </div>
                <strong className="rule-card-title">Contratação Transparente sem Fidelidade</strong>
                <span className="rule-card-trigger">Pagamentos via Stripe • Self-Service</span>
                <p>
                  Os planos pagos são processados com criptografia bancária pela Stripe (PCI-DSS Nível 1), sem retenção de dados de cartão no DataConform e com cancelamento imediato em 1 clique pelo painel.
                </p>
              </div>
            </div>
          </div>

          <div className="rules-faq-box">
            <h5>Escopo Técnico do Laudo e Responsabilidade de Carga</h5>
            <p>
              O laudo emitido pelo DataConform atesta a conformidade sintática, estrutural (RFC 4180) e matemática (Módulo 11, CEP, UF, NCM e colunas obrigatórias parametrizadas) do arquivo analisado, cabendo ao responsável pela implantação a conferência final das regras tributárias e parametrizações específicas do ambiente ERP de destino. Dúvidas ou solicitações LGPD: <strong>contato@dataconform.com.br</strong>.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Compreendido
          </button>
        </div>
      </div>
    </div>
  );
};
