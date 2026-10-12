import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { AuthResponseDto, LoginRequestDto, RegisterRequestDto } from '../types';
import { login, register } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authData: AuthResponseDto) => void;
}

export const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const req: RegisterRequestDto = {
          email,
          password,
          fullName,
          workspaceName: workspaceName.trim() || undefined,
        };
        const authData: AuthResponseDto = await register(req);
        onSuccess(authData);
      } else {
        const req: LoginRequestDto = {
          email,
          password,
        };
        const authData: AuthResponseDto = await login(req);
        onSuccess(authData);
      }
      onClose();
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog auth-modal-dialog">
        <div className="modal-header">
          <h2>{isRegister ? 'Criar Conta Corporativa' : 'Entrar no DataConform'}</h2>
          <button type="button" className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert-toast alert-error">{error}</div>}

            {isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-name">Nome Completo</label>
                  <input
                    id="auth-name"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Matheus Ramos"
                    value={fullName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-ws">Nome da Organização / Workspace (Opcional)</label>
                  <input
                    id="auth-ws"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Minha Empresa Corp"
                    value={workspaceName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkspaceName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">E-mail Corporativo</label>
              <input
                id="auth-email"
                type="email"
                className="form-control"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Senha (Mínimo 6 caracteres)</label>
              <input
                id="auth-password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <div className="auth-toggle-link">
              {isRegister ? (
                <p>
                  Já possui conta?{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setIsRegister(false);
                      setError(null);
                    }}
                  >
                    Fazer Login
                  </button>
                </p>
              ) : (
                <p>
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setIsRegister(true);
                      setError(null);
                    }}
                  >
                    Cadastre sua Organização
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processando...' : isRegister ? 'Criar Conta' : 'Acessar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
