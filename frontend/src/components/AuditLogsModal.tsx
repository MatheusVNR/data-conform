import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import type { AuditLogDto, WorkspaceDto } from '../types';
import { getWorkspaceAuditLogs } from '../services/api';

interface AuditLogsModalProps {
  isOpen: boolean;
  workspace: WorkspaceDto | null;
  onClose: () => void;
}

export const AuditLogsModal: FC<AuditLogsModalProps> = ({ isOpen, workspace, onClose }) => {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  useEffect(() => {
    let isMounted: boolean = true;

    async function fetchLogs(): Promise<void> {
      if (!workspace) return;
      setLoading(true);
      setError(null);
      try {
        const result: AuditLogDto[] = await getWorkspaceAuditLogs(workspace.id);
        if (isMounted) {
          setLogs(result);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg: string = err instanceof Error ? err.message : 'Erro ao buscar trilha de auditoria';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (isOpen && workspace) {
      fetchLogs();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, workspace]);

  const filteredLogs: AuditLogDto[] = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term: string = searchTerm.toLowerCase();
    return logs.filter(
      (log: AuditLogDto) =>
        log.action.toLowerCase().includes(term) ||
        log.entityName.toLowerCase().includes(term) ||
        (log.details?.toLowerCase().includes(term) ?? false)
    );
  }, [logs, searchTerm]);

  const getActionBadgeClass = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'uploadfile':
        return 'badge badge-action-upload';
      case 'validatefile':
        return 'badge badge-action-validate';
      case 'deletefile':
        return 'badge badge-action-delete';
      case 'changeplan':
        return 'badge badge-action-plan';
      case 'createworkspace':
      case 'createproject':
        return 'badge badge-action-create';
      default:
        return 'badge badge-action';
    }
  };

  const getActionLabel = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'uploadfile':
        return 'Upload Arquivo';
      case 'validatefile':
        return 'Validação';
      case 'deletefile':
        return 'Exclusão Arquivo';
      case 'changeplan':
        return 'Mudança de Plano';
      case 'createworkspace':
        return 'Criação Workspace';
      case 'createproject':
        return 'Criação Projeto';
      default:
        return action;
    }
  };

  if (!isOpen || !workspace) return null;

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
      <div className="modal-dialog audit-modal-dialog">
        <div className="modal-header">
          <h2>Trilha de Auditoria & Atividades</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
            Histórico das últimas 50 ações realizadas no workspace <strong>{workspace.name}</strong>.
          </p>

          {error && <div className="alert-toast alert-error">{error}</div>}

          {/* Search Filter Bar */}
          <div className="audit-filter-bar">
            <input
              type="text"
              className="form-input form-input-sm"
              placeholder="Buscar por ação, entidade ou detalhes..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => setSearchTerm('')}
              >
                Limpar
              </button>
            )}
            <span className="text-muted text-xs audit-count">
              {filteredLogs.length} de {logs.length} ações
            </span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando histórico...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma atividade registrada até o momento neste workspace.</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma ação encontrada para os termos pesquisados.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table audit-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Ação</th>
                    <th>Entidade</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log: AuditLogDto) => (
                    <tr key={log.id}>
                      <td className="text-nowrap text-sm">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <span className={getActionBadgeClass(log.action)}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm font-semibold">{log.entityName}</span>
                      </td>
                      <td className="text-sm text-muted">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
