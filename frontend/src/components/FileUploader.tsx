import { useRef, useState } from 'react';
import type { DragEvent, FC } from 'react';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const FileUploader: FC<FileUploaderProps> = ({ onUpload, disabled = false }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File): void => {
    setError(null);
    const validExtensions: string[] = ['.csv', '.txt'];
    const fileName: string = file.name.toLowerCase();
    const isValidExtension: boolean = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExtension) {
      setError('Apenas arquivos .csv ou .txt são aceitos.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('O arquivo excede o limite máximo permitido de 20 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadClick = async (): Promise<void> => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Falha ao enviar arquivo';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="file-uploader-card">
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
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndSetFile(e.target.files[0]);
            }
          }}
          disabled={disabled || uploading}
        />

        <div className="dropzone-content">
          <div className="dropzone-icon">📁</div>
          <h4>Arraste sua planilha ou arquivo delimitado (.csv)</h4>
          <p className="dropzone-subtitle">ou clique para selecionar do seu computador (máx. 20 MB)</p>
        </div>
      </div>

      {error && <div className="alert alert-error mt-2">{error}</div>}

      {selectedFile && (
        <div className="file-preview-bar">
          <div className="file-preview-info">
            <span className="file-preview-name">{selectedFile.name}</span>
            <span className="file-preview-size">({formatFileSize(selectedFile.size)})</span>
          </div>

          <div className="file-preview-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={uploading}
            >
              Remover
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
