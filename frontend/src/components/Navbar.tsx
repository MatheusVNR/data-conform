import type { FC } from 'react';
import type { AuthResponseDto, WorkspaceDto } from '../types';
import { PlanTierLabels } from '../types';

interface NavbarProps {
  activeWorkspace: WorkspaceDto | null;
  currentUser: AuthResponseDto | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenWorkspaceModal: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenPlanModal: () => void;
  onOpenAuditModal: () => void;
  onOpenRulesModal: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  activeWorkspace,
  currentUser,
  theme,
  onToggleTheme,
  onOpenWorkspaceModal,
  onOpenAuth,
  onLogout,
  onOpenPlanModal,
  onOpenAuditModal,
  onOpenRulesModal,
}) => {
  const planName: string = activeWorkspace
    ? (PlanTierLabels[String(activeWorkspace.plan)] ?? 'Starter')
    : 'Starter';

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo with Interlocking "DC" Monogram + Checkmark */}
        <div className="navbar-brand">
          <div className="brand-logo-svg" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#dcNavBgGrad)" />
              <rect x="3" y="3" width="58" height="58" rx="15" stroke="url(#dcNavBorderGrad)" strokeOpacity="0.4" strokeWidth="1.5" />
              <path
                d="M14 17H24.5C32.5 17 38 22.8 38 32C38 41.2 32.5 47 24.5 47H14V17Z"
                stroke="url(#dcNavBlueLetter)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="19.5" y1="25" x2="26" y2="25" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <line x1="19.5" y1="32" x2="29" y2="32" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <line x1="19.5" y1="39" x2="24.5" y2="39" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
              <path
                d="M46 21.5C43.2 18.8 39.2 17.5 35 18.2C28.2 19.3 24 25.2 24 32C24 38.8 28.5 44.8 35.5 45.8C39.8 46.4 43.8 44.8 46.5 42"
                stroke="url(#dcNavCyanArc)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M33.5 32.5L39.5 38.5L52.5 23.5"
                stroke="url(#dcNavEmeraldCheck)"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="dcNavBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0F172A" />
                  <stop offset="55%" stopColor="#1E3A8A" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="dcNavBorderGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
                <linearGradient id="dcNavBlueLetter" x1="14" y1="17" x2="38" y2="47" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#93C5FD" />
                </linearGradient>
                <linearGradient id="dcNavCyanArc" x1="24" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#60A5FA" />
                </linearGradient>
                <linearGradient id="dcNavEmeraldCheck" x1="33" y1="39" x2="53" y2="23" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#34D399" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-title">DataConform</span>
              <span className="brand-env-pill">ERP Data Governance</span>
            </div>
            <span className="brand-subtitle">Saneamento e Homologação Prévia para Cargas ERP</span>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="navbar-workspace-controls">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onOpenRulesModal}
            title="Consultar pilares de governança, mitigação de riscos fiscais e homologação ERP"
          >
            🛡️ Garantias & Governança
          </button>

          {currentUser && activeWorkspace && (
            <button
              type="button"
              className="btn btn-outline btn-sm ws-switcher-pill"
              onClick={onOpenWorkspaceModal}
              title="Gerenciar suas organizações ou alternar ambiente"
            >
              <span className="ws-pill-dot" />
              <span className="ws-pill-name">{activeWorkspace.name}</span>
              <span className="ws-pill-gear">⚙</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm btn-plan-trigger"
            onClick={onOpenPlanModal}
            title="Consultar planos comerciais e capacidade operacional"
          >
            {currentUser && activeWorkspace ? (
              <>
                ★ Plano: <strong>{planName}</strong>
              </>
            ) : (
              <>★ Planos & Preços</>
            )}
          </button>

          {currentUser && activeWorkspace && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenAuditModal}
              title="Trilha de auditoria e governança da organização"
            >
              📋 Auditoria
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm btn-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Noturno'}
            aria-label="Alternar tema visual"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="auth-user-section">
            {currentUser ? (
              <div className="user-profile-badge">
                <span className="user-avatar">{currentUser.fullName.charAt(0).toUpperCase()}</span>
                <div className="user-info">
                  <span className="user-name">{currentUser.fullName}</span>
                  <span className="user-role-tag">{currentUser.role}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-xs btn-secondary"
                  onClick={onLogout}
                  title="Encerrar sessão com segurança"
                >
                  Sair
                </button>
              </div>
            ) : (
              <div className="guest-auth-buttons">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => onOpenAuth('login')}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onOpenAuth('register')}
                >
                  Criar Conta Gratuita
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
