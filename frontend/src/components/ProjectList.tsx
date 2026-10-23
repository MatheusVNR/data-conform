import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ImportProjectDto } from '../types';

interface ProjectListProps {
  projects: ImportProjectDto[];
  activeProject: ImportProjectDto | null;
  isLoading?: boolean;
  onSelectProject: (project: ImportProjectDto) => void;
  onOpenCreateProject: () => void;
  onDeleteProject?: (projectId: string) => Promise<void>;
}

export const ProjectList: FC<ProjectListProps> = ({
  projects,
  activeProject,
  isLoading = false,
  onSelectProject,
  onOpenCreateProject,
  onDeleteProject,
}) => {
  const [projectToDelete, setProjectToDelete] = useState<ImportProjectDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && deletingId === null) {
        setProjectToDelete(null);
      }
    };
    if (projectToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [projectToDelete, deletingId]);

  const handleDelete = async (e: React.MouseEvent, projectId: string): Promise<void> => {
    e.stopPropagation();
    if (!onDeleteProject) return;
    try {
      setDeletingId(projectId);
      await onDeleteProject(projectId);
      setProjectToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="project-section">
      <div className="section-header">
        <div>
          <div className="section-title-with-helper">
            <h2>Projetos de Importação</h2>
            <span
              className="helper-badge"
              title="Agrupe suas planilhas por sistema ERP de destino ou por frente de migração (ex: Clientes, Fornecedores, Catálogo)"
            >
              ? Como funciona
            </span>
          </div>
          <p className="section-subtitle">
            Organize lotes de validação por sistema ERP de destino ou departamento (ex: Clientes, Fornecedores, Estoque).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading}
          onClick={onOpenCreateProject}
        >
          + Novo Projeto
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state card">
          <div className="spinner" style={{ margin: '0 auto 0.75rem auto' }}></div>
          <h3>Carregando projetos da organização...</h3>
          <p>Sincronizando dicionários ERP e histórico de homologação do ambiente selecionado.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🗂️</div>
          <h3>Comece sua primeira homologação em 3 passos simples</h3>
          <p>
            Crie um projeto escolhendo o seu ERP de destino para liberar os dicionários oficiais e modelos prontos de planilha.
          </p>

          <div className="onboarding-steps-grid">
            <div className="onboarding-step-item">
              <span className="onboarding-step-num">1</span>
              <div>
                <strong>Crie o Projeto e Escolha o ERP</strong>
                <span>Selecione TOTVS, SAP, Senior, Sankhya, Omie ou ContaAzul.</span>
              </div>
            </div>
            <div className="onboarding-step-item">
              <span className="onboarding-step-num">2</span>
              <div>
                <strong>Anexe seu CSV ou Baixe o Modelo</strong>
                <span>Arraste sua planilha real ou use o arquivo de exemplo do ERP.</span>
              </div>
            </div>
            <div className="onboarding-step-item">
              <span className="onboarding-step-num">3</span>
              <div>
                <strong>Audite e Exporte o Laudo</strong>
                <span>Veja o diagnóstico linha a linha e baixe o relatório em 1 clique.</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreateProject}
          >
            🚀 Criar Primeiro Projeto Agora
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((proj: ImportProjectDto) => {
            const isSelected: boolean = activeProject?.id === proj.id;

            return (
              <div
                key={proj.id}
                className={`project-card ${isSelected ? 'project-card-active' : ''}`}
                onClick={() => onSelectProject(proj)}
              >
                <div className="project-card-header">
                  <span className="target-system-badge">
                    ⚙️ {proj.targetSystem || 'Padrão CSV'}
                  </span>
                  <span className="file-count-badge">
                    {proj.filesCount} {proj.filesCount === 1 ? 'arquivo' : 'arquivos'}
                  </span>
                </div>

                <h3 className="project-card-title">{proj.name}</h3>

                {proj.description ? (
                  <p className="project-card-desc">{proj.description}</p>
                ) : (
                  <p className="project-card-desc text-muted">
                    Validação estrutural e semântica configurada para {proj.targetSystem || 'ERP'}.
                  </p>
                )}

                <div className="project-card-footer">
                  <span className="project-card-date">
                    Criado em {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="project-card-actions" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {onDeleteProject && (
                      <button
                        type="button"
                        className="btn btn-outline btn-xs btn-file-delete-trigger"
                        title="Excluir projeto e histórico"
                        disabled={deletingId === proj.id}
                        onClick={() => setProjectToDelete(proj)}
                      >
                        ✕ Excluir
                      </button>
                    )}
                    <button
                      type="button"
                      className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => onSelectProject(proj)}
                    >
                      {isSelected ? '✓ Ativo' : 'Selecionar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Corporativo de Confirmação de Exclusão de Projeto */}
      {projectToDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget && deletingId === null) {
              setProjectToDelete(null);
            }
          }}
        >
          <div className="modal-card modal-delete-confirm-card">
            <div className="modal-header">
              <div className="modal-delete-title-row">
                <span className="modal-delete-icon">⚠️</span>
                <div>
                  <h3>Excluir Projeto de Importação</h3>
                  <span className="modal-subtitle-inline">Esta ação é irreversível</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setProjectToDelete(null)}
                disabled={deletingId !== null}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p className="delete-confirm-text">
                Você tem certeza que deseja excluir o projeto <strong>{projectToDelete.name}</strong>?
              </p>

              <div className="delete-file-meta-box">
                <div className="delete-meta-row">
                  <span className="meta-label">Nome do Projeto:</span>
                  <strong className="meta-val">{projectToDelete.name}</strong>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Sistema / ERP:</span>
                  <span className="meta-val">{projectToDelete.targetSystem || 'Genérico'}</span>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Arquivos Vinculados:</span>
                  <span className="meta-val">{projectToDelete.filesCount} arquivo(s)</span>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Data de Criação:</span>
                  <span className="meta-val">{new Date(projectToDelete.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="delete-warning-note">
                ⚠️ A exclusão deste projeto removerá permanentemente todos os lotes de arquivos anexados e seus respectivos laudos técnicos de auditoria. O evento será registrado na trilha de auditoria corporativa.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProjectToDelete(null)}
                disabled={deletingId !== null}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={(e: React.MouseEvent) => handleDelete(e, projectToDelete.id)}
                disabled={deletingId !== null}
              >
                {deletingId === projectToDelete.id ? 'Excluindo...' : 'Sim, Excluir Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
