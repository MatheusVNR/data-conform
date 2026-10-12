import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { CreateImportProjectRequest } from '../types';

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
          <h3>Novo Projeto de Importação</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="proj-name">Nome do Projeto *</label>
              <input
                id="proj-name"
                type="text"
                className="form-input"
                placeholder="Ex: Carga de Clientes 2026"
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
                <option value="TOTVS Protheus">TOTVS Protheus</option>
                <option value="SAP S/4HANA">SAP S/4HANA</option>
                <option value="SAP Business One">SAP Business One</option>
                <option value="Omie">Omie</option>
                <option value="ContaAzul">ContaAzul</option>
                <option value="Senior ERP">Senior ERP</option>
                <option value="Genérico / CSV">Genérico / Padrão</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="proj-desc">Descrição / Observações</label>
              <textarea
                id="proj-desc"
                className="form-input"
                rows={3}
                placeholder="Ex: Validação cadastral para migração de base legada."
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
