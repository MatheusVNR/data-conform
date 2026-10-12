import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { CreateWorkspaceRequest } from '../types';

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWorkspaceRequest) => Promise<void>;
}

export const WorkspaceModal: FC<WorkspaceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleNameChange = (val: string): void => {
    setName(val);
    const generatedSlug: string = val
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({ name: name.trim(), slug: slug.trim() });
      setName('');
      setSlug('');
      onClose();
    } catch (err: unknown) {
      const message: string = err instanceof Error ? err.message : 'Erro ao cadastrar workspace';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Novo Workspace</h3>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="ws-name">Nome da Organização / Empresa *</label>
              <input
                id="ws-name"
                type="text"
                className="form-input"
                placeholder="Ex: Matriz Brasil"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                placeholder="Ex: matriz-brasil"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={loading}
              />
              <span className="form-hint">Usado internamente e em identificadores do sistema.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
