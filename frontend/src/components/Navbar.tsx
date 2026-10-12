import type { FC } from 'react';
import type { WorkspaceDto } from '../types';

interface NavbarProps {
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  onSelectWorkspace: (workspace: WorkspaceDto) => void;
  onOpenCreateWorkspace: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onOpenCreateWorkspace,
}) => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-badge">DC</div>
          <div className="brand-text">
            <span className="brand-title">DataConform</span>
            <span className="brand-subtitle">Conformidade de Dados para ERP</span>
          </div>
        </div>

        <div className="navbar-workspace-controls">
          <div className="workspace-select-wrapper">
            <label htmlFor="workspace-select" className="visually-hidden">
              Selecionar Workspace
            </label>
            <select
              id="workspace-select"
              className="workspace-select"
              value={activeWorkspace?.id ?? ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const selected: WorkspaceDto | undefined = workspaces.find((w) => w.id === e.target.value);
                if (selected) {
                  onSelectWorkspace(selected);
                }
              }}
              disabled={workspaces.length === 0}
            >
              {workspaces.length === 0 ? (
                <option value="">Nenhum workspace cadastrado</option>
              ) : (
                workspaces.map((w: WorkspaceDto) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.slug})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onOpenCreateWorkspace}
          >
            + Novo Workspace
          </button>
        </div>
      </div>
    </header>
  );
};
