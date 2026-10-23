import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ErpPresetConfig, ImportFileDto } from '../types';
import { FileStatusLabels, getErpPreset } from '../types';

interface FileListProps {
  files: ImportFileDto[];
  targetSystem?: string | null;
  onValidate: (fileId: string, requiredColumns?: string) => Promise<void>;
  onViewReport: (fileId: string) => void;
  onDeleteFile?: (fileId: string) => Promise<void>;
  validatingFileId: string | null;
}

export const FileList: FC<FileListProps> = ({
  files,
  targetSystem,
  onValidate,
  onViewReport,
  onDeleteFile,
  validatingFileId,
}) => {
  const [selectedFileForRules, setSelectedFileForRules] = useState<string | null>(null);
  const [requiredColumnsInput, setRequiredColumnsInput] = useState<string>('');
  const [fileToDelete, setFileToDelete] = useState<ImportFileDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize: number = 8;

  const erpPreset: ErpPresetConfig = getErpPreset(targetSystem);
  const totalFiles: number = files.length;
  const totalPages: number = Math.max(1, Math.ceil(totalFiles / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setSelectedFileForRules(null);
        setRequiredColumnsInput('');
        setFileToDelete(null);
      }
    };
    if (selectedFileForRules || fileToDelete) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFileForRules, fileToDelete]);

  const handleDelete = async (fileId: string): Promise<void> => {
    if (!onDeleteFile) return;
    try {
      setDeletingId(fileId);
      await onDeleteFile(fileId);
    } finally {
      setDeletingId(null);
      setFileToDelete(null);
    }
  };

  const handleToggleColumnChip = (colName: string): void => {
    const currentParts: string[] = requiredColumnsInput
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const exists: boolean = currentParts.some(
      (p: string) => p.toLowerCase() === colName.toLowerCase()
    );

    if (exists) {
      const next: string[] = currentParts.filter(
        (p: string) => p.toLowerCase() !== colName.toLowerCase()
      );
      setRequiredColumnsInput(next.join(', '));
    } else {
      const next: string[] = [...currentParts, colName];
      setRequiredColumnsInput(next.join(', '));
    }
  };

  const handleApplyErpPresetAll = (): void => {
    setRequiredColumnsInput(erpPreset.requiredColumns.join(', '));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status: number | string): string => {
    const s: string = String(status).toLowerCase();
    if (s === '0' || s === 'pending') return 'badge badge-pending';
    if (s === '1' || s === 'processing') return 'badge badge-processing';
    if (s === '2' || s === 'completed') return 'badge badge-completed';
    if (s === '3' || s === 'failed') return 'badge badge-failed';
    return 'badge';
  };

  const getStatusLabel = (status: number | string): string => {
    const s: string = String(status).toLowerCase();
    if (s === '0' || s === 'pending') return FileStatusLabels[0];
    if (s === '1' || s === 'processing') return FileStatusLabels[1];
    if (s === '2' || s === 'completed') return FileStatusLabels[2];
    if (s === '3' || s === 'failed') return FileStatusLabels[3];
    return String(status);
  };

  const isCompletedStatus = (status: number | string): boolean => {
    const s: string = String(status).toLowerCase();
    return s === '2' || s === 'completed';
  };

  const handleStartValidation = async (fileId: string): Promise<void> => {
    await onValidate(fileId, requiredColumnsInput.trim() || undefined);
    setSelectedFileForRules(null);
    setRequiredColumnsInput('');
  };

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p>Nenhum arquivo anexado a este projeto até o momento.</p>
        <span className="empty-state-hint">
          Utilize a área de upload acima ou baixe o modelo oficial de {erpPreset.systemName} para testar a validação.
        </span>
      </div>
    );
  }

  const startIndex: number = (currentPage - 1) * pageSize;
  const displayedFiles: ImportFileDto[] = files.slice(startIndex, startIndex + pageSize);
  const endIndex: number = Math.min(startIndex + pageSize, totalFiles);

  return (
    <div className="file-list-card">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Tamanho</th>
              <th>Data de Envio</th>
              <th>Status</th>
              <th>Total Linhas</th>
              <th>Conformidade</th>
              <th>Inconsistências</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {displayedFiles.map((file: ImportFileDto) => {
              const isValidatingThis: boolean = validatingFileId === file.id;
              const isDone: boolean = isCompletedStatus(file.status);

              return (
                <tr key={file.id}>
                  <td>
                    <div className="file-name-cell">
                      <span className="file-icon">📄</span>
                      <strong title={file.originalFileName}>{file.originalFileName}</strong>
                    </div>
                  </td>
                  <td>{formatFileSize(file.byteSize)}</td>
                  <td>{formatDate(file.createdAt)}</td>
                  <td>
                    <span className={getStatusBadgeClass(file.status)}>
                      {isValidatingThis ? 'Analisando...' : getStatusLabel(file.status)}
                    </span>
                  </td>
                  <td>{file.totalRows ?? '—'}</td>
                  <td>
                    {file.validRows !== null && file.validRows !== undefined ? (
                      <span className="text-success font-medium">{file.validRows} válidas</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {file.errorRows !== null && file.errorRows !== undefined ? (
                      <span className={file.errorRows > 0 ? 'text-error font-medium' : 'text-muted'}>
                        {file.errorRows > 0 ? `${file.errorRows} c/ erro` : '0 erros'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-right">
                    <div className="table-actions">
                      {isDone && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onViewReport(file.id)}
                        >
                          📊 Ver Laudo
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => setSelectedFileForRules(file.id)}
                        disabled={isValidatingThis || deletingId === file.id}
                      >
                        {isValidatingThis ? 'Validando...' : isDone ? '↻ Revalidar' : '▶ Validar Arquivo'}
                      </button>

                      {onDeleteFile && (
                        <button
                          type="button"
                          className="btn btn-outline btn-xs btn-file-delete-trigger"
                          title="Excluir arquivo e histórico de conformidade"
                          disabled={isValidatingThis || deletingId === file.id}
                          onClick={() => setFileToDelete(file)}
                        >
                          ✕ Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalFiles > pageSize && (
        <div className="table-pagination-bar">
          <div className="pagination-info">
            Mostrando <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> de <strong>{totalFiles}</strong> arquivos
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Anterior
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_: unknown, i: number) => i + 1).map((pageNum: number) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`btn btn-xs ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Arquivo */}
      {fileToDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget && deletingId === null) {
              setFileToDelete(null);
            }
          }}
        >
          <div className="modal-card modal-delete-confirm-card">
            <div className="modal-header">
              <div className="modal-delete-title-row">
                <span className="modal-delete-icon">🗑️</span>
                <div>
                  <h3>Excluir Arquivo do Projeto</h3>
                  <span className="modal-subtitle-inline">Esta ação é irreversível</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setFileToDelete(null)}
                disabled={deletingId !== null}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p className="delete-confirm-text">
                Você tem certeza que deseja remover o arquivo <strong>{fileToDelete.originalFileName}</strong> do projeto?
              </p>

              <div className="delete-file-meta-box">
                <div className="delete-meta-row">
                  <span className="meta-label">Nome:</span>
                  <strong className="meta-val">{fileToDelete.originalFileName}</strong>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Tamanho:</span>
                  <span className="meta-val">{formatFileSize(fileToDelete.byteSize)}</span>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Data de Envio:</span>
                  <span className="meta-val">{formatDate(fileToDelete.createdAt)}</span>
                </div>
                <div className="delete-meta-row">
                  <span className="meta-label">Status:</span>
                  <span className={getStatusBadgeClass(fileToDelete.status)}>
                    {getStatusLabel(fileToDelete.status)}
                  </span>
                </div>
                {fileToDelete.totalRows !== null && fileToDelete.totalRows !== undefined && (
                  <div className="delete-meta-row">
                    <span className="meta-label">Total de Registros:</span>
                    <span className="meta-val">{fileToDelete.totalRows} linhas</span>
                  </div>
                )}
              </div>

              <div className="delete-warning-note">
                ⚠️ O arquivo físico armazenado e todos os relatórios de inconsistências vinculados serão removidos permanentemente. A exclusão será registrada na trilha de auditoria corporativa.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFileToDelete(null)}
                disabled={deletingId !== null}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDelete(fileToDelete.id)}
                disabled={deletingId !== null}
              >
                {deletingId === fileToDelete.id ? 'Excluindo...' : 'Sim, Excluir Arquivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedFileForRules && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) {
              setSelectedFileForRules(null);
              setRequiredColumnsInput('');
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h3>Parametrizar Auditoria de Carga ({erpPreset.systemName})</h3>
                <span className="modal-subtitle-inline">
                  {erpPreset.moduleReference}
                </span>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setSelectedFileForRules(null);
                  setRequiredColumnsInput('');
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="validation-active-rules-summary">
                <strong>✓ Verificações Automáticas Ativas para {erpPreset.systemName}:</strong>
                <ul>
                  <li>Consistência estrutural do lote, delimitadores e codificação de caracteres</li>
                  <li>Prevenção de registros duplicados e colunas conflitantes</li>
                  <li>Auditoria fiscal e financeira de documentos (CPF/CNPJ), e-mails, limites e datas</li>
                </ul>
              </div>

              <div className="form-group">
                <div className="req-cols-header-row">
                  <label htmlFor="req-cols">Campos Obrigatórios do Layout (Opcional)</label>
                  <button
                    type="button"
                    className="btn-link text-xs"
                    onClick={handleApplyErpPresetAll}
                  >
                    + Aplicar Dicionário {erpPreset.systemName}
                  </button>
                </div>
                <input
                  id="req-cols"
                  type="text"
                  className="form-input"
                  placeholder={`Ex: ${erpPreset.requiredColumns.slice(0, 3).join(', ')}`}
                  value={requiredColumnsInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRequiredColumnsInput(e.target.value)}
                />
                <span className="form-hint">
                  Selecione abaixo os campos obrigatórios do dicionário <strong>{erpPreset.systemName}</strong> ou digite colunas customizadas:
                </span>

                <div className="column-chips-row">
                  {erpPreset.requiredColumns.map((chip: string) => {
                    const isSelectedChip: boolean = requiredColumnsInput
                      .toLowerCase()
                      .split(',')
                      .map((s: string) => s.trim())
                      .includes(chip.toLowerCase());

                    return (
                      <button
                        key={chip}
                        type="button"
                        className={`column-chip ${isSelectedChip ? 'column-chip-active' : ''}`}
                        onClick={() => handleToggleColumnChip(chip)}
                      >
                        {isSelectedChip ? '✓ ' : '+ '}
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedFileForRules(null);
                  setRequiredColumnsInput('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleStartValidation(selectedFileForRules)}
              >
                ▶ Executar Auditoria de Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
