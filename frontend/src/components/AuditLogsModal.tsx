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

  const getActionLabel = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'uploadfile':
        return 'Upload de Arquivo';
      case 'validatefile':
        return 'Auditoria Executada';
      case 'deletefile':
        return 'Exclusão de Arquivo';
      case 'deleteproject':
        return 'Exclusão de Projeto';
      case 'changeplan':
        return 'Alteração de Plano';
      case 'stripecheckoutconfirmed':
        return 'Pagamento Stripe';
      case 'createworkspace':
        return 'Criação de Ambiente';
      case 'updateworkspace':
        return 'Renomeação de Ambiente';
      case 'createproject':
        return 'Criação de Projeto';
      case 'userregistered':
        return 'Cadastro de Conta';
      case 'userloggedin':
        return 'Acesso (Login)';
      default:
        return action;
    }
  };

  const getEntityLabel = (entityName: string): string => {
    switch (entityName.toLowerCase()) {
      case 'importfile':
        return 'Planilha CSV';
      case 'importproject':
        return 'Projeto ERP';
      case 'workspace':
        return 'Organização';
      case 'user':
        return 'Usuário';
      case 'stripesession':
        return 'Faturamento';
      default:
        return entityName;
    }
  };

  const filteredLogs: AuditLogDto[] = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term: string = searchTerm.toLowerCase();
    return logs.filter(
      (log: AuditLogDto) =>
        log.action.toLowerCase().includes(term) ||
        getActionLabel(log.action).toLowerCase().includes(term) ||
        log.entityName.toLowerCase().includes(term) ||
        getEntityLabel(log.entityName).toLowerCase().includes(term) ||
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
      case 'deleteproject':
        return 'badge badge-action-delete';
      case 'changeplan':
      case 'stripecheckoutconfirmed':
        return 'badge badge-action-plan';
      case 'createworkspace':
      case 'updateworkspace':
      case 'createproject':
      case 'userregistered':
        return 'badge badge-action-create';
      default:
        return 'badge badge-action';
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
          <div>
            <h2>Trilha de Auditoria & Governança</h2>
            <span className="modal-subtitle-inline">
              Histórico imutável das últimas 50 operações na organização <strong>{workspace.name}</strong>
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="inline-alert-error">{error}</div>}

          {/* Search Filter Bar */}
          <div className="audit-filter-bar">
            <input
              type="text"
              className="form-input form-input-sm"
              placeholder="Filtrar por operação, recurso ou descrição..."
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
              {filteredLogs.length} de {logs.length} registros
            </span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando trilha de auditoria...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma atividade registrada até o momento nesta organização.</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma operação encontrada para os termos pesquisados.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table audit-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Operação</th>
                    <th>Recurso</th>
                    <th>Detalhamento</th>
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
                        <span className="text-sm font-semibold">{getEntityLabel(log.entityName)}</span>
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
