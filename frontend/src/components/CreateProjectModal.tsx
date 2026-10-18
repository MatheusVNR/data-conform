import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { CreateImportProjectRequest, ErpPresetConfig } from '../types';
import { getErpPreset } from '../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateImportProjectRequest) => Promise<void>;
}

export const CreateProjectModal: FC<CreateProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [targetSystem, setTargetSystem] = useState<string>('TOTVS Protheus');
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

  if (!isOpen) {
    return null;
  }

  const activePreset: ErpPresetConfig = getErpPreset(targetSystem);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do projeto é obrigatório.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        targetSystem: targetSystem.trim() || undefined,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : 'Erro ao criar projeto';
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
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>Novo Projeto de Importação</h3>
            <p className="modal-subtitle-inline">
              Configure o escopo de homologação e o dicionário do ERP de destino
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="inline-alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="proj-name">Nome do Projeto / Lote *</label>
              <input
                id="proj-name"
                type="text"
                className="form-input"
                placeholder="Ex: Saneamento de Clientes Ativos 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="proj-target">Sistema de Destino / ERP</label>
              <select
                id="proj-target"
                className="form-input"
                value={targetSystem}
                onChange={(e) => setTargetSystem(e.target.value)}
                disabled={loading}
              >
                <option value="TOTVS Protheus">TOTVS Protheus (SX3 / SA1 / SA2)</option>
                <option value="SAP Business One">SAP Business One (DTW / OCRD)</option>
                <option value="SAP S/4HANA">SAP S/4HANA (Migration Cockpit / BP)</option>
                <option value="Senior ERP">Senior ERP (Sapiens / E085CLI)</option>
                <option value="Sankhya">Sankhya Om (Parceiros / TGFPAR)</option>
                <option value="Omie">Omie ERP (Planilha Oficial)</option>
                <option value="ContaAzul">ContaAzul (Importação Cadastral)</option>
                <option value="Genérico / CSV">Genérico / Layout Customizado</option>
              </select>
            </div>

            {/* ERP Preset Preview Box */}
            <div className="erp-preset-preview-box">
              <div className="erp-preset-header">
                <span className="erp-preset-badge">Template Homologado</span>
                <strong>{activePreset.moduleReference}</strong>
              </div>
              <p className="erp-preset-desc">{activePreset.summary}</p>
              <div className="erp-preset-cols">
                <span>Campos-chave sugeridos:</span>
                {activePreset.requiredColumns.map((col: string) => (
                  <code key={col} className="erp-col-tag">
                    {col}
                  </code>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="proj-desc">Descrição / Escopo da Carga (Opcional)</label>
              <textarea
                id="proj-desc"
                className="form-input"
                rows={2}
                placeholder="Ex: Validação cadastral e fiscal antes da virada de chave no ERP."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
