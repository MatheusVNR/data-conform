import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { CreateWorkspaceRequest, WorkspaceDto } from '../types';
import { PlanTierLabels } from '../types';

interface WorkspaceModalProps {
  isOpen: boolean;
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  primaryUserWorkspaceId?: string | null;
  onClose: () => void;
  onSelectWorkspace: (workspace: WorkspaceDto) => Promise<void>;
  onCreateWorkspace: (data: CreateWorkspaceRequest) => Promise<void>;
  onRenameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
}

export const WorkspaceModal: FC<WorkspaceModalProps> = ({
  isOpen,
  workspaces,
  activeWorkspace,
  primaryUserWorkspaceId,
  onClose,
  onSelectWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
  const [renameValue, setRenameValue] = useState<string>(activeWorkspace?.name ?? '');
  const [newName, setNewName] = useState<string>('');
  const [newSlug, setNewSlug] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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

  if (!isOpen) return null;

  const handleNewNameChange = (val: string): void => {
    setNewName(val);
    const generatedSlug: string = val
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setNewSlug(generatedSlug);
  };

  const handleRenameSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!activeWorkspace || !renameValue.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onRenameWorkspace(activeWorkspace.id, renameValue.trim());
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao renomear organização';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) {
      setError('Preencha o nome e o identificador da nova organização.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreateWorkspace({ name: newName.trim(), slug: newSlug.trim() });
      setNewName('');
      setNewSlug('');
      setActiveTab('manage');
      onClose();
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : 'Erro ao criar organização';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workspaceId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await onDeleteWorkspace(workspaceId);
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : 'Não foi possível excluir esta organização';
      setError(message);
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
      <div className="modal-dialog ws-modal-dialog">
        <div className="modal-header">
          <div>
            <h2>Configurações da Organização & Ambientes</h2>
            <span className="modal-subtitle">
              Gerencie o nome da sua empresa ou alterne entre ambientes de trabalho isolados
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('manage');
                setError(null);
              }}
            >
              Organizações Ativas ({workspaces.length})
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('create');
                setError(null);
              }}
            >
              + Nova Filial / Ambiente
            </button>
          </div>

          {error && <div className="inline-alert-error">{error}</div>}

          {activeTab === 'manage' ? (
            <div className="ws-manage-container">
              {activeWorkspace && (
                <form onSubmit={handleRenameSubmit} className="ws-rename-box">
                  <label htmlFor="ws-rename-input">Nome da Organização Selecionada</label>
                  <div className="ws-rename-row">
                    <input
                      id="ws-rename-input"
                      type="text"
                      className="form-input"
                      value={renameValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loading || renameValue.trim() === activeWorkspace.name}
                    >
                      Salvar Nome
                    </button>
                  </div>
                </form>
              )}

              <div className="ws-list-section">
                <span className="ws-list-label">Ambientes disponíveis:</span>
                <div className="ws-items-list">
                  {workspaces.map((ws: WorkspaceDto) => {
                    const isCurrent: boolean = activeWorkspace?.id === ws.id;
                    const isPrimaryUserWs: boolean = primaryUserWorkspaceId === ws.id;
                    const canDelete: boolean = workspaces.length > 1 && !isPrimaryUserWs;
                    const planLabel: string = PlanTierLabels[String(ws.plan)] ?? 'Starter';

                    return (
                      <div key={ws.id} className={`ws-item-row ${isCurrent ? 'ws-item-active' : ''}`}>
                        <div className="ws-item-info">
                          <div className="ws-item-title-line">
                            <strong>{ws.name}</strong>
                            <span className="badge badge-pending">{planLabel}</span>
                            {isCurrent && <span className="badge badge-completed">Em uso</span>}
                          </div>
                          <span className="text-xs text-muted">
                            Código: <code>{ws.slug}</code> • {ws.projectsCount}{' '}
                            {ws.projectsCount === 1 ? 'projeto vinculado' : 'projetos vinculados'}
                          </span>
                        </div>

                        <div className="ws-item-actions">
                          {!isCurrent && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              disabled={loading}
                              onClick={async () => {
                                await onSelectWorkspace(ws);
                                onClose();
                              }}
                            >
                              Alternar
                            </button>
                          )}

                          {canDelete && (
                            confirmDeleteId === ws.id ? (
                              <div className="inline-delete-confirm">
                                <button
                                  type="button"
                                  className="btn btn-danger btn-xs"
                                  disabled={loading}
                                  onClick={() => handleDelete(ws.id)}
                                >
                                  Confirmar Exclusão
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  disabled={loading}
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost-danger btn-xs"
                                disabled={loading}
                                onClick={() => setConfirmDeleteId(ws.id)}
                                title="Excluir este ambiente secundário"
                              >
                                Excluir
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="ws-name">Nome da Nova Filial / Organização *</label>
                <input
                  id="ws-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Unidade Sul — Distribuidora"
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNewNameChange(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ws-slug">Identificador Único (Slug) *</label>
                <input
                  id="ws-slug"
                  type="text"
                  className="form-input"
                  placeholder="Ex: unidade-sul-distribuidora"
                  value={newSlug}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSlug(e.target.value)}
                  required
                  disabled={loading}
                />
                <span className="form-hint">Identificador técnico sem espaços ou acentos.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('manage')}
                  disabled={loading}
                >
                  Voltar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Ambiente'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
