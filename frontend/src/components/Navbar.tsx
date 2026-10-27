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
  onOpenFeedbackModal: () => void;
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
  onOpenFeedbackModal,
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
              <rect x="2" y="2" width="60" height="60" rx="12" fill="#0B132B" />
              <rect x="3" y="3" width="58" height="58" rx="11" stroke="#1E293B" strokeWidth="1.5" />
              <rect x="13" y="16" width="11" height="8" rx="1.5" fill="#2563EB" />
              <rect x="13" y="28" width="11" height="8" rx="1.5" fill="#3B82F6" />
              <rect x="13" y="40" width="11" height="8" rx="1.5" fill="#60A5FA" />
              <path
                d="M27 16H33C41.8366 16 49 23.1634 49 32C49 40.8366 41.8366 48 33 48H27V41.5H33C38.2467 41.5 42.5 37.2467 42.5 32C42.5 26.7533 38.2467 22.5 33 22.5H27V16Z"
                fill="#F8FAFC"
              />
              <path
                d="M31 33L36.5 38.5L50.5 24.5"
                stroke="#0B132B"
                strokeWidth="9.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path
                d="M31 33L36.5 38.5L50.5 24.5"
                stroke="#10B981"
                strokeWidth="5"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
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

          <button
            type="button"
            className="nav-link-btn"
            onClick={onOpenFeedbackModal}
            title="Enviar sugestão de melhoria ou solicitar novo template de ERP"
          >
            💬 Feedback
          </button>

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

            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => {
                closeMobileMenu();
                onOpenFeedbackModal();
              }}
            >
              <span>💬 Sugerir Melhoria / Feedback</span>
            </button>
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
