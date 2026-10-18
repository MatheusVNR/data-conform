import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { AuthResponseDto, LoginRequestDto, RegisterRequestDto } from '../types';
import { login, register } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (authData: AuthResponseDto) => Promise<void> | void;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}) => {
  const [isRegister, setIsRegister] = useState<boolean>(initialMode === 'register');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');
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

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const req: RegisterRequestDto = {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          workspaceName: workspaceName.trim() || undefined,
        };
        const authData: AuthResponseDto = await register(req);
        await onSuccess(authData);
      } else {
        const req: LoginRequestDto = {
          email: email.trim(),
          password,
        };
        const authData: AuthResponseDto = await login(req);
        await onSuccess(authData);
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
      <div className="modal-dialog auth-modal-dialog">
        <div className="modal-header">
          <div>
            <h2>{isRegister ? 'Criar Conta Corporativa' : 'Acessar sua Organização'}</h2>
            <span className="modal-subtitle">
              {isRegister
                ? 'Comece gratuitamente com 20 validações mensais no plano Starter'
                : 'Entre com suas credenciais corporativas para gerenciar seus projetos'}
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-body">
            <div className="auth-mode-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${!isRegister ? 'active' : ''}`}
                onClick={() => {
                  setIsRegister(false);
                  setPassword('');
                  setError(null);
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${isRegister ? 'active' : ''}`}
                onClick={() => {
                  setIsRegister(true);
                  setPassword('');
                  setError(null);
                }}
              >
                Criar Conta Gratuita
              </button>
            </div>

            {error && <div className="inline-alert-error">{error}</div>}

            {isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-name">Nome Completo *</label>
                  <input
                    id="auth-name"
                    name="dc_fullname"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Beatriz Ferreira"
                    value={fullName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-ws">
                    Razão Social ou Nome da Organização
                    <span className="label-optional"> (Opcional)</span>
                  </label>
                  <input
                    id="auth-ws"
                    name="dc_organization"
                    type="text"
                    className="form-control"
                    placeholder="Ex: Horizonte Logística & Suprimentos Ltda"
                    value={workspaceName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkspaceName(e.target.value)}
                    autoComplete="organization"
                  />
                  <span className="form-hint">
                    Define o nome do seu ambiente de trabalho (pode ser alterado depois).
                  </span>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">E-mail Corporativo *</label>
              <input
                id="auth-email"
                name="dc_email"
                type="email"
                className="form-control"
                placeholder="nome@empresa.com.br"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Senha de Acesso *</label>
              <div className="password-input-wrapper">
                <input
                  id="auth-password"
                  name="dc_password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Digite sua senha (mín. 6 caracteres)"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="btn-password-toggle"
                  onClick={() => setShowPassword((prev: boolean) => !prev)}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Autenticando...' : isRegister ? 'Criar Conta e Acessar' : 'Entrar no Sistema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
