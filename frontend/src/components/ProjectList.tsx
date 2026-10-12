import type { FC } from 'react';
import type { ImportProjectDto } from '../types';

interface ProjectListProps {
  projects: ImportProjectDto[];
  activeProject: ImportProjectDto | null;
  onSelectProject: (project: ImportProjectDto) => void;
  onOpenCreateProject: () => void;
}

export const ProjectList: FC<ProjectListProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
}) => {
  return (
    <div className="project-section">
      <div className="section-header">
        <div>
          <h2>Projetos de Importação</h2>
          <p className="section-subtitle">
            Gerencie os fluxos de arquivos e conformidade por sistema de destino.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenCreateProject}
        >
          + Novo Projeto
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">📁</div>
          <h3>Nenhum projeto neste workspace</h3>
          <p>Crie um projeto de importação para começar a validar planilhas e arquivos.</p>
          <button
            type="button"
            className="btn btn-primary mt-3"
            onClick={onOpenCreateProject}
          >
            Criar Primeiro Projeto
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
                    {proj.targetSystem || 'Genérico'}
                  </span>
                  <span className="file-count-badge">
                    {proj.filesCount} {proj.filesCount === 1 ? 'arquivo' : 'arquivos'}
                  </span>
                </div>

                <h3 className="project-card-title">{proj.name}</h3>

                {proj.description && (
                  <p className="project-card-desc">{proj.description}</p>
                )}

                <div className="project-card-footer">
                  <span className="project-card-date">
                    Criado em {new Date(proj.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {isSelected ? 'Selecionado' : 'Abrir'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
