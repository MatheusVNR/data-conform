import { useEffect } from 'react';
import type { FC } from 'react';

interface LegalPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport?: () => void;
}

const CONFIGURED_SUPPORT_EMAIL: string = ((import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? '').trim();

export const LegalPrivacyModal: FC<LegalPrivacyModalProps> = ({ isOpen, onClose, onOpenSupport }) => {
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
            <h2 id="legal-modal-title">Termos de Uso, Privacidade, Reembolso & Governança LGPD</h2>
            <p className="modal-subtitle-inline">
              Transparência contratual, ciclo de retenção de dados, direito de arrependimento e escopo técnico
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="rules-intro-banner">
            <strong>🔒 Política Transparente de Retenção e Expurgo de Dados (LGPD — Lei nº 13.709/2018)</strong>
            <p>
              <strong>1. Arquivo CSV/TXT bruto:</strong> utilizado exclusivamente em streaming para gerar a auditoria e <strong>expurgado fisicamente do armazenamento efêmero em até 24 horas</strong> (ou imediatamente ao clicar em <em>Excluir</em> no arquivo ou projeto).
              <br />
              <strong>2. Histórico do laudo:</strong> para consulta do cliente, o relatório armazena os contadores e até 1.000 apontamentos técnicos (incluindo o trecho da célula rejeitada) isolados no seu Workspace até que você exclua o arquivo ou encerre a organização.
            </p>
          </div>

          <div className="rules-section">
            <h4 className="rules-section-title">Diretrizes Contratuais, Comerciais e de Segurança</h4>
            <div className="rules-cards-grid">
              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Papel na LGPD</span>
                </div>
                <strong className="rule-card-title">Controlador vs. Operador</strong>
                <span className="rule-card-trigger">Art. 5º, VII e Art. 39 da Lei 13.709/2018</span>
                <p>
                  Sua empresa permanece como única <strong>Controladora</strong> das bases auditadas. O DataConform atua estritamente como Operador técnico automatizado para validação estrutural e fiscal pré-importação.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Confidencialidade B2B</span>
                </div>
                <strong className="rule-card-title">Zero Compartilhamento ou Uso em IA</strong>
                <span className="rule-card-trigger">Motor 100% Determinístico Privado</span>
                <p>
                  Seus arquivos, CNPJs, CPFs, e-mails e valores financeiros <strong>jamais</strong> são comercializados, cedidos a terceiros ou enviados para treinamento/inferência em APIs externas de Inteligência Artificial.
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Assinaturas & Reembolso</span>
                </div>
                <strong className="rule-card-title">Cancelamento Sem Multa & CDC Art. 49</strong>
                <span className="rule-card-trigger">Pagamentos via Stripe (PCI-DSS Nível 1)</span>
                <p>
                  Sem fidelidade: ao cancelar pelo painel, a renovação automática é interrompida e o acesso pago segue ativo até o fim do ciclo vigente. Garantimos <strong>reembolso integral em até 7 dias corridos</strong> da contratação inicial (Art. 49 do CDC).
                </p>
              </div>

              <div className="rule-card">
                <div className="rule-card-top">
                  <span className="badge badge-action">Segurança Multi-Tenant</span>
                </div>
                <strong className="rule-card-title">Isolamento Estrito por Organização</strong>
                <span className="rule-card-trigger">Tráfego TLS + Segregação JWT</span>
                <p>
                  Cada Workspace opera com verificação de propriedade por requisição autenticada, sanitização contra CSV Formula Injection na exportação e trilha de auditoria própria.
                </p>
              </div>
            </div>
          </div>

          <div className="rules-faq-box">
            <h5>Escopo Técnico do Laudo, Independência de Marcas e Atendimento</h5>
            <p>
              O laudo emitido pelo DataConform atesta a conformidade sintática (RFC 4180) e matemática (Módulo 11, CEP, UF, NCM e colunas parametrizadas) do arquivo submetido, cabendo ao responsável pela implantação a conferência final das regras tributárias, versões e customizações específicas do ambiente ERP de destino.
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
              <strong>Aviso de Marcas Registradas:</strong> TOTVS®, Protheus®, SAP®, SAP Business One®, SAP S/4HANA®, Senior®, Sankhya®, Omie® e ContaAzul® são marcas registradas de seus respectivos proprietários. O DataConform é um software independente de pré-validação de dados e não possui vínculo societário, parceria comercial ou homologação/endosso oficial dessas fabricantes.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              {CONFIGURED_SUPPORT_EMAIL ? (
                <>
                  Atendimento comercial, suporte técnico e solicitações de titulares/controladores (LGPD):{' '}
                  <strong>{CONFIGURED_SUPPORT_EMAIL}</strong>.
                </>
              ) : (
                <>
                  Para solicitações de suporte técnico, reembolso ou direitos de privacidade (LGPD), utilize nosso{' '}
                  <strong>Canal de Suporte e Atendimento</strong> integrado na plataforma ou consulte as versões públicas em{' '}
                  <a href="/termos/">Termos de Uso</a> e <a href="/privacidade/">Política de Privacidade</a>.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          {onOpenSupport && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                onClose();
                onOpenSupport();
              }}
            >
              💬 Abrir Canal de Suporte / LGPD
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Compreendido
          </button>
        </div>
      </div>
    </div>
  );
};
