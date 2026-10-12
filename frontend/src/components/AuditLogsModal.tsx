import { useEffect, useState } from 'react';
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

  if (!isOpen || !workspace) return null;

  return (
    <div className="modal-backdrop">
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

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando histórico...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma atividade registrada até o momento neste workspace.</p>
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
                  {logs.map((log: AuditLogDto) => (
                    <tr key={log.id}>
                      <td className="text-nowrap text-sm">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <span className="badge badge-action">{log.action}</span>
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
