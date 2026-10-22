import { useRef, useState } from 'react';
import type { DragEvent, FC } from 'react';
import { getErpPreset, PLAN_LIMITS, PlanTierLabels } from '../types';
import type { ErpPresetConfig, PlanLimitsConfig, PlanTier } from '../types';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  plan?: PlanTier;
  targetSystem?: string | null;
  disabled?: boolean;
  onOpenRules?: () => void;
}

export const FileUploader: FC<FileUploaderProps> = ({
  onUpload,
  plan = 'Starter',
  targetSystem,
  disabled = false,
  onOpenRules,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planLabel: string = PlanTierLabels[String(plan)] ?? 'Starter';
  const limits: PlanLimitsConfig = PLAN_LIMITS[planLabel] ?? PLAN_LIMITS.Starter;
  const maxFileBytes: number = limits.maxFileSizeMb * 1024 * 1024;
  const erpPreset: ErpPresetConfig = getErpPreset(targetSystem);

  const validateAndAddFiles = (incomingFiles: FileList | File[]): void => {
    setError(null);
    const fileArray: File[] = Array.from(incomingFiles);
    const validExtensions: string[] = ['.csv', '.txt'];

    const combinedCount: number = selectedFiles.length + fileArray.length;
    if (combinedCount > limits.maxConcurrentFiles) {
      setError(
        `Seu plano (${planLabel}) permite anexar até ${limits.maxConcurrentFiles} ${
          limits.maxConcurrentFiles === 1 ? 'arquivo' : 'arquivos'
        } por lote de envio.`
      );
      return;
    }

    const validatedBatch: File[] = [];
    for (const file of fileArray) {
      const lowerName: string = file.name.toLowerCase();
      const isValidExt: boolean = validExtensions.some((ext: string) => lowerName.endsWith(ext));

      if (!isValidExt) {
        setError(`O arquivo "${file.name}" não é suportado. Envie apenas arquivos .csv ou .txt.`);
        return;
      }

      if (file.size === 0) {
        setError(`O arquivo "${file.name}" está vazio (0 bytes).`);
        return;
      }

      if (file.size > maxFileBytes) {
        setError(
          `O arquivo "${file.name}" (${formatFileSize(file.size)}) excede o limite de ${limits.maxFileSizeMb} MB por arquivo do plano ${planLabel}.`
        );
        return;
      }

      const alreadyQueued: boolean = selectedFiles.some(
        (existing: File) => existing.name === file.name && existing.size === file.size
      );
      if (!alreadyQueued) {
        validatedBatch.push(file);
      }
    }

    setSelectedFiles((prev: File[]) => [...prev, ...validatedBatch]);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleUploadQueue = async (): Promise<void> => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      for (let i = 0; i < selectedFiles.length; i++) {
        const currentFile: File = selectedFiles[i];
        setUploadProgressText(
          `Enviando ${i + 1} de ${selectedFiles.length}: ${currentFile.name}...`
        );
        await onUpload(currentFile);
      }

      setSelectedFiles([]);
      setUploadProgressText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Falha ao enviar lote de arquivos';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  const handleRemoveFile = (indexToRemove: number): void => {
    setSelectedFiles((prev: File[]) => prev.filter((_: File, idx: number) => idx !== indexToRemove));
    setError(null);
  };

  const handleDownloadSampleCsv = (): void => {
    const blob: Blob = new Blob(['\uFEFF' + erpPreset.sampleCsvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url: string = URL.createObjectURL(blob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.setAttribute('download', erpPreset.sampleFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadDemoData = async (): Promise<void> => {
    if (disabled || uploading) return;
    try {
      setUploading(true);
      setError(null);
      setUploadProgressText(`Carregando lote demonstrativo para ${erpPreset.systemName}...`);
      const demoBlob: Blob = new Blob(['\uFEFF' + erpPreset.sampleCsvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      const demoFile: File = new File([demoBlob], erpPreset.sampleFileName, {
        type: 'text/csv',
      });
      await onUpload(demoFile);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Falha ao carregar lote de teste';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="file-uploader-card">
      <div className="uploader-toolbar">
        <div className="uploader-limits-pills">
          <span className="limit-pill" title="Formatos de arquivo aceitos pelo motor de validação">
            📄 Formatos: <strong>.CSV</strong> ou <strong>.TXT</strong>
          </span>
          <span className="limit-pill" title="Tamanho máximo individual permitido pelo seu plano atual">
            ⚖️ Máx: <strong>{limits.maxFileSizeMb} MB / arquivo</strong>
          </span>
          <span className="limit-pill" title="Quantidade máxima de arquivos que podem ser anexados simultaneamente">
            📚 Lote: <strong>Até {limits.maxConcurrentFiles} arquivos</strong>
          </span>
        </div>

        <div className="uploader-toolbar-actions">
          {onOpenRules && (
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={onOpenRules}
            >
              🛡️ Escopo de Auditoria
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={handleDownloadSampleCsv}
            title={`Baixar planilha modelo homologada para ${erpPreset.systemName}`}
          >
            ⬇ Modelo {erpPreset.systemName}
          </button>
          <button
            type="button"
            className="btn btn-accent btn-xs"
            onClick={handleLoadDemoData}
            disabled={disabled || uploading}
            title={`Carregar imediatamente arquivo de teste com registros válidos e com falhas para ${erpPreset.systemName}`}
          >
            ⚡ Testar com Amostra
          </button>
        </div>
      </div>

      <div
        className={`dropzone ${isDragging ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !uploading && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          multiple
          style={{ display: 'none' }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
          disabled={disabled || uploading}
        />

        <div className="dropzone-content">
          <div className="dropzone-svg-wrapper">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="40" height="40" rx="12" fill="currentColor" fillOpacity="0.1" />
              <path
                d="M24 32V17M24 17L18 23M24 17L30 23"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 34H33"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h4>
            {isDragging
              ? 'Solte os arquivos aqui para anexar ao lote!'
              : 'Arraste suas planilhas CSV para cá ou selecione os arquivos'}
          </h4>
          <p className="dropzone-subtitle">
            Perfil ativo: <strong>{erpPreset.moduleReference}</strong> • Detecção automática de delimitadores
          </p>

          <div className="dropzone-actions-group">
            <button
              type="button"
              className="btn btn-primary btn-sm dropzone-browse-btn"
              disabled={disabled || uploading}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                if (!disabled && !uploading && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              Procurar Arquivos no Computador
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm dropzone-demo-btn"
              disabled={disabled || uploading}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                void handleLoadDemoData();
              }}
              title={`Carregar arquivo de demonstração oficial do ${erpPreset.systemName}`}
            >
              ⚡ Testar com Amostra do {erpPreset.systemName}
            </button>
          </div>

          <p className="dropzone-quick-hint">
            💡 Sem planilha em mãos? Clique em <strong>Testar com Amostra</strong> para validar dados pré-configurados do {erpPreset.systemName} instantaneamente.
          </p>
        </div>
      </div>

      {error && <div className="inline-alert-error">{error}</div>}

      {selectedFiles.length > 0 && (
        <div className="file-queue-panel">
          <div className="file-queue-header">
            <span>
              <strong>Fila de Envio ({selectedFiles.length}/{limits.maxConcurrentFiles} arquivos prontos)</strong>
            </span>
            <button
              type="button"
              className="btn-link text-xs"
              disabled={uploading}
              onClick={() => setSelectedFiles([])}
            >
              Limpar fila
            </button>
          </div>

          <div className="file-queue-list">
            {selectedFiles.map((file: File, index: number) => (
              <div key={`${file.name}-${index}`} className="file-preview-bar">
                <div className="file-preview-info">
                  <span className="file-icon">📊</span>
                  <span className="file-preview-name">{file.name}</span>
                  <span className="file-preview-size">({formatFileSize(file.size)})</span>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost-danger btn-xs"
                  onClick={() => handleRemoveFile(index)}
                  disabled={uploading}
                >
                  ✕ Remover
                </button>
              </div>
            ))}
          </div>

          <div className="file-queue-footer">
            {uploadProgressText && (
              <span className="text-sm text-muted">{uploadProgressText}</span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUploadQueue}
              disabled={uploading}
            >
              {uploading
                ? 'Enviando lote...'
                : `Enviar ${selectedFiles.length} ${
                    selectedFiles.length === 1 ? 'Arquivo para o Projeto' : 'Arquivos para o Projeto'
                  }`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
