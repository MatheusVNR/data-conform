import { useState } from 'react';
import type { FC } from 'react';
import type { ImportFileDto } from '../types';
import { FileStatusLabels } from '../types';

interface FileListProps {
  files: ImportFileDto[];
  onValidate: (fileId: string, requiredColumns?: string) => Promise<void>;
  onViewReport: (fileId: string) => void;
  validatingFileId: string | null;
}

export const FileList: FC<FileListProps> = ({
  files,
  onValidate,
  onViewReport,
  validatingFileId,
}) => {
  const [selectedFileForRules, setSelectedFileForRules] = useState<string | null>(null);
  const [requiredColumnsInput, setRequiredColumnsInput] = useState<string>('');

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

  const getStatusBadgeClass = (status: number): string => {
    switch (status) {
      case 0:
        return 'badge badge-pending';
      case 1:
        return 'badge badge-processing';
      case 2:
        return 'badge badge-completed';
      case 3:
        return 'badge badge-failed';
      default:
        return 'badge';
    }
  };

  const handleStartValidation = async (fileId: string): Promise<void> => {
    await onValidate(fileId, requiredColumnsInput.trim() || undefined);
    setSelectedFileForRules(null);
    setRequiredColumnsInput('');
  };

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhum arquivo enviado para este projeto ainda.</p>
        <span className="empty-state-hint">Envie um arquivo CSV acima para iniciar a validação.</span>
      </div>
    );
  }

  return (
    <div className="file-list-card">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome do Arquivo</th>
              <th>Tamanho</th>
              <th>Enviado Em</th>
              <th>Status</th>
              <th>Linhas Totais</th>
              <th>Válidas</th>
              <th>Erros</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file: ImportFileDto) => {
              const isValidatingThis: boolean = validatingFileId === file.id;

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
                      {isValidatingThis ? 'Processando...' : FileStatusLabels[file.status]}
                    </span>
                  </td>
                  <td>{file.totalRows ?? '—'}</td>
                  <td>
                    {file.validRows !== null && file.validRows !== undefined ? (
                      <span className="text-success font-medium">{file.validRows}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {file.errorRows !== null && file.errorRows !== undefined ? (
                      <span className={file.errorRows > 0 ? 'text-error font-medium' : 'text-muted'}>
                        {file.errorRows}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-right">
                    <div className="table-actions">
                      {file.status === 2 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => onViewReport(file.id)}
                        >
                          Ver Relatório
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => setSelectedFileForRules(file.id)}
                        disabled={isValidatingThis}
                      >
                        {isValidatingThis ? 'Validando...' : file.status === 2 ? 'Revalidar' : 'Validar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedFileForRules && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Configurar Validação do Arquivo</h3>
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
              <div className="form-group">
                <label htmlFor="req-cols">Colunas Obrigatórias (Opcional)</label>
                <input
                  id="req-cols"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Nome, Email, Documento (separadas por vírgula)"
                  value={requiredColumnsInput}
                  onChange={(e) => setRequiredColumnsInput(e.target.value)}
                />
                <span className="form-hint">
                  Se informado, o validador marcará erro se o cabeçalho faltar ou se alguma linha estiver vazia nestas colunas.
                </span>
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
                Executar Validação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
