import { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const planName: string = activeWorkspace
    ? (PlanTierLabels[String(activeWorkspace.plan)] ?? 'Starter')
    : 'Starter';

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo & Name */}
        <div className="navbar-brand">
          <div className="brand-logo-svg" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <span className="brand-title">DataConform</span>
          </div>
        </div>

        {/* Desktop Navigation Links & Controls */}
        <div className="navbar-workspace-controls navbar-desktop-nav">
          <button
            type="button"
            className="nav-link-btn"
            onClick={onOpenRulesModal}
            title="Pilares de governança, validações fiscais e homologação ERP"
          >
            Governança
          </button>

          <button
            type="button"
            className="nav-link-btn btn-plan-trigger"
            onClick={onOpenPlanModal}
            title="Consultar planos comerciais e capacidade operacional"
          >
            {currentUser && activeWorkspace ? (
              <span>
                Plano: <strong>{planName}</strong>
              </span>
            ) : (
              <span>Planos & Preços</span>
            )}
          </button>

          {currentUser && activeWorkspace && (
            <button
              type="button"
              className="nav-link-btn"
              onClick={onOpenAuditModal}
              title="Trilha de auditoria e governança da organização"
            >
              Auditoria
            </button>
          )}

          <div className="nav-divider" />

          {currentUser && activeWorkspace && (
            <button
              type="button"
              className="ws-switcher-pill"
              onClick={onOpenWorkspaceModal}
              title="Alternar organização ativa ou gerenciar equipe"
            >
              <span className="ws-pill-dot" />
              <span className="ws-pill-name">{activeWorkspace.name}</span>
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
                <span className="user-name">{currentUser.fullName}</span>
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
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
                  Criar Conta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Controls (Always visible on mobile) */}
        <div className="navbar-mobile-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm btn-theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Noturno'}
            aria-label="Alternar tema visual"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            type="button"
            className={`btn btn-outline btn-sm mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          {currentUser && activeWorkspace ? (
            <div className="mobile-user-card">
              <div className="mobile-user-header">
                <span className="user-avatar">{currentUser.fullName.charAt(0).toUpperCase()}</span>
                <div className="user-info">
                  <span className="user-name">{currentUser.fullName}</span>
                  <span className="user-role-tag">{currentUser.role}</span>
                </div>
              </div>
              <button
                type="button"
                className="ws-switcher-pill mobile-ws-pill"
                onClick={() => {
                  closeMobileMenu();
                  onOpenWorkspaceModal();
                }}
              >
                <span className="ws-pill-dot" />
                <span className="ws-pill-name">{activeWorkspace.name}</span>
                <span className="mobile-plan-tag">{planName}</span>
              </button>
            </div>
          ) : (
            <div className="mobile-guest-hero">
              <span className="mobile-guest-title">Governança & Homologação ERP</span>
              <p className="mobile-guest-desc">Validação de conformidade prévia antes de carregar no seu ERP.</p>
            </div>
          )}

          <div className="mobile-menu-links">
            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => {
                closeMobileMenu();
                onOpenRulesModal();
              }}
            >
              <span>🛡️ Governança & Regras Fiscais</span>
            </button>

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => {
                closeMobileMenu();
                onOpenPlanModal();
              }}
            >
              <span>★ Planos & Capacidade</span>
              {currentUser && activeWorkspace && <span className="badge badge-info">{planName}</span>}
            </button>

            {currentUser && activeWorkspace && (
              <button
                type="button"
                className="mobile-nav-link"
                onClick={() => {
                  closeMobileMenu();
                  onOpenAuditModal();
                }}
              >
                <span>📋 Trilha de Auditoria</span>
              </button>
            )}
          </div>

          <div className="mobile-auth-actions">
            {currentUser ? (
              <button
                type="button"
                className="btn btn-outline btn-block text-danger"
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
              >
                Encerrar Sessão
              </button>
            ) : (
              <div className="mobile-guest-buttons">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    closeMobileMenu();
                    onOpenAuth('register');
                  }}
                >
                  Criar Conta Gratuita
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    closeMobileMenu();
                    onOpenAuth('login');
                  }}
                >
                  Entrar na Conta
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
