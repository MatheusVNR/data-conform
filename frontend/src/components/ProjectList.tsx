import { useState } from 'react';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, projectId: string): Promise<void> => {
    e.stopPropagation();
    if (!onDeleteProject) return;
    try {
      setDeletingId(projectId);
      await onDeleteProject(projectId);
      setConfirmDeleteId(null);
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
                      confirmDeleteId === proj.id ? (
                        <div className="inline-delete-confirm">
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            disabled={deletingId === proj.id}
                            onClick={(e: React.MouseEvent) => handleDelete(e, proj.id)}
                          >
                            {deletingId === proj.id ? '...' : 'Excluir'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost-danger btn-xs"
                          title="Excluir projeto"
                          onClick={() => setConfirmDeleteId(proj.id)}
                        >
                          🗑
                        </button>
                      )
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
    </div>
  );
};
