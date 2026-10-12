import type { FC } from 'react';
import type { AuthResponseDto, WorkspaceDto } from '../types';

interface NavbarProps {
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  currentUser: AuthResponseDto | null;
  onSelectWorkspace: (workspace: WorkspaceDto) => void;
  onOpenCreateWorkspace: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenPlanModal: () => void;
  onOpenAuditModal: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  workspaces,
  activeWorkspace,
  currentUser,
  onSelectWorkspace,
  onOpenCreateWorkspace,
  onOpenAuth,
  onLogout,
  onOpenPlanModal,
  onOpenAuditModal,
}) => {
  const planName: string = activeWorkspace ? String(activeWorkspace.plan) : 'Starter';

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
                const selected: WorkspaceDto | undefined = workspaces.find((w: WorkspaceDto) => w.id === e.target.value);
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

          {activeWorkspace && (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm btn-plan-trigger"
                onClick={onOpenPlanModal}
                title="Visualizar e gerenciar plano deste workspace"
              >
                ★ Plano: <strong>{planName}</strong>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onOpenAuditModal}
                title="Histórico de auditoria"
              >
                Auditoria
              </button>
            </>
          )}

          <div className="auth-user-section">
            {currentUser ? (
              <div className="user-profile-badge">
                <span className="user-avatar">{currentUser.fullName.charAt(0).toUpperCase()}</span>
                <div className="user-info">
                  <span className="user-name">{currentUser.fullName}</span>
                  <span className="user-role-tag">{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted"
                  onClick={onLogout}
                  title="Sair da conta"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onOpenAuth}
              >
                Entrar / Cadastrar
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
