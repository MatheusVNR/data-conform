import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { AuditLogsModal } from './components/AuditLogsModal';
import { AuthModal } from './components/AuthModal';
import { ChangePlanModal, PENDING_CHECKOUT_STORAGE_KEY } from './components/ChangePlanModal';
import { ComplianceRulesModal } from './components/ComplianceRulesModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { FileList } from './components/FileList';
import { FileUploader } from './components/FileUploader';
import { Navbar } from './components/Navbar';
import { ProjectList } from './components/ProjectList';
import { ValidationReportModal } from './components/ValidationReportModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import {
  confirmStripeCheckout,
  createProject,
  createWorkspace,
  deleteFile,
  deleteProject,
  deleteWorkspace,
  getAuthToken,
  getCurrentUser,
  getFileReport,
  getFiles,
  getProjects,
  getWorkspaceQuota,
  getWorkspaces,
  logout,
  updateWorkspace,
  uploadFile,
  validateFile,
} from './services/api';
import type {
  AuthResponseDto,
  CreateImportProjectRequest,
  CreateWorkspaceRequest,
  ErpPresetConfig,
  ImportFileDto,
  ImportProjectDto,
  ValidationReportDto,
  WorkspaceDto,
  WorkspaceQuotaDto,
} from './types';
import { ERP_PRESETS, getErpPreset, PLAN_LIMITS, PlanTierLabels } from './types';
import './App.css';

interface PendingCheckoutData {
  workspaceId?: string;
  plan?: string;
  timestamp?: number;
}

export const App: FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved: string | null = localStorage.getItem('dataconform_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [currentUser, setCurrentUser] = useState<AuthResponseDto | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(null);
  const [quota, setQuota] = useState<WorkspaceQuotaDto | null>(null);
  const [projects, setProjects] = useState<ImportProjectDto[]>([]);
  const [activeProject, setActiveProject] = useState<ImportProjectDto | null>(null);
  const [files, setFiles] = useState<ImportFileDto[]>([]);
  const [activeReport, setActiveReport] = useState<ValidationReportDto | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [validatingFileId, setValidatingFileId] = useState<string | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [isCreateProjOpen, setIsCreateProjOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [isPlanOpen, setIsPlanOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dataconform_theme', theme);
  }, [theme]);

  const handleToggleTheme = (): void => {
    setTheme((prev: 'light' | 'dark') => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showAlert = useCallback((text: string, type: 'success' | 'error' = 'success'): void => {
    setAlert({ type, text });
    setTimeout(() => {
      setAlert((curr) => (curr?.text === text ? null : curr));
    }, 6000);
  }, []);

  const loadQuotaForWorkspace = useCallback(async (workspaceId: string): Promise<WorkspaceQuotaDto | null> => {
    try {
      const q: WorkspaceQuotaDto = await getWorkspaceQuota(workspaceId);
      setQuota(q);
      return q;
    } catch {
      setQuota(null);
      return null;
    }
  }, []);

  const loadFilesForProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      const list: ImportFileDto[] = await getFiles(projectId);
      setFiles(list);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao buscar arquivos';
      showAlert(msg, 'error');
    }
  }, [showAlert]);

  const loadProjectsForWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      setLoadingProjects(true);
      const list: ImportProjectDto[] = await getProjects(workspaceId);
      setProjects(list);
      if (list.length > 0) {
        setActiveProject(list[0]);
        await loadFilesForProject(list[0].id);
      } else {
        setActiveProject(null);
        setFiles([]);
      }
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao carregar projetos';
      showAlert(msg, 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, [loadFilesForProject, showAlert]);

  useEffect(() => {
    let isMounted: boolean = true;

    async function init(): Promise<void> {
      try {
        let authenticatedUser: AuthResponseDto | null = null;
        if (getAuthToken()) {
          try {
            authenticatedUser = await getCurrentUser();
            if (isMounted) {
              setCurrentUser(authenticatedUser);
            }
          } catch {
            logout();
          }
        }

        // Isolamento estrito Multi-Tenant: somente busca e carrega organizações se o usuário estiver autenticado
        if (!authenticatedUser) {
          if (isMounted) {
            setWorkspaces([]);
            setActiveWorkspace(null);
            setQuota(null);
            setProjects([]);
            setActiveProject(null);
            setFiles([]);
          }
          return;
        }

        let wsList: WorkspaceDto[] = await getWorkspaces();
        if (!isMounted) return;

        setWorkspaces(wsList);

        if (wsList.length > 0) {
          let selectedWs: WorkspaceDto = wsList[0];
          const userWs: WorkspaceDto | undefined = wsList.find(
            (w: WorkspaceDto) => w.id === authenticatedUser!.workspaceId
          );
          if (userWs) {
            selectedWs = userWs;
          }

          // Verificar se há retorno pós-pagamento do Stripe na URL (?session_id=cs_...)
          const urlParams: URLSearchParams = new URLSearchParams(window.location.search);
          const stripeSessionId: string | null = urlParams.get('session_id');

          if (stripeSessionId && stripeSessionId.trim().length > 0) {
            let targetWsId: string = selectedWs.id;
            let targetPlan: string = 'Professional';

            try {
              const rawPending: string | null = localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
              if (rawPending) {
                const parsedPending: PendingCheckoutData = JSON.parse(rawPending) as PendingCheckoutData;
                if (parsedPending.workspaceId) {
                  const foundPendingWs: WorkspaceDto | undefined = wsList.find(
                    (w: WorkspaceDto) => w.id === parsedPending.workspaceId
                  );
                  if (foundPendingWs) {
                    selectedWs = foundPendingWs;
                    targetWsId = foundPendingWs.id;
                  }
                }
                if (parsedPending.plan === 'Enterprise' || parsedPending.plan === 'Professional') {
                  targetPlan = parsedPending.plan;
                }
              }
            } catch {
              // Segue com defaults
            }

            try {
              const confirmedQuota: WorkspaceQuotaDto = await confirmStripeCheckout(targetWsId, {
                sessionId: stripeSessionId.trim(),
                plan: targetPlan,
              });
              localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
              window.history.replaceState({}, document.title, window.location.pathname);

              selectedWs = {
                ...selectedWs,
                plan: confirmedQuota.plan,
                monthlyFilesUploaded: confirmedQuota.monthlyFilesUploaded,
                monthlyFilesQuota: confirmedQuota.monthlyFilesQuota,
                maxRowsPerFile: confirmedQuota.maxRowsPerFile,
              };
              wsList = wsList.map((w: WorkspaceDto) => (w.id === selectedWs.id ? selectedWs : w));
              if (isMounted) {
                setWorkspaces(wsList);
                setQuota(confirmedQuota);
                showAlert(
                  `Pagamento confirmado via Stripe! O plano ${targetPlan} já está ativo na sua organização.`,
                  'success'
                );
              }
            } catch (checkoutErr: unknown) {
              window.history.replaceState({}, document.title, window.location.pathname);
              const errMsg: string =
                checkoutErr instanceof Error ? checkoutErr.message : 'Não foi possível validar a sessão de pagamento';
              if (isMounted) {
                showAlert(errMsg, 'error');
              }
            }
          }

          if (!isMounted) return;
          setActiveWorkspace(selectedWs);
          await loadQuotaForWorkspace(selectedWs.id);

          const projList: ImportProjectDto[] = await getProjects(selectedWs.id);
          if (!isMounted) return;
          setProjects(projList);
          if (projList.length > 0) {
            setActiveProject(projList[0]);
            const fileList: ImportFileDto[] = await getFiles(projList[0].id);
            if (!isMounted) return;
            setFiles(fileList);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg: string = err instanceof Error ? err.message : 'Erro ao conectar à API';
        setAlert({ type: 'error', text: msg });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [loadQuotaForWorkspace, showAlert]);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login'): void => {
    setAuthInitialMode(mode);
    setIsAuthOpen(true);
  };

  const handleSelectWorkspace = async (ws: WorkspaceDto): Promise<void> => {
    setActiveWorkspace(ws);
    await loadQuotaForWorkspace(ws.id);
    await loadProjectsForWorkspace(ws.id);
  };

  const handleSelectProject = async (proj: ImportProjectDto): Promise<void> => {
    setActiveProject(proj);
    await loadFilesForProject(proj.id);
  };

  const handleCreateWorkspace = async (req: CreateWorkspaceRequest): Promise<void> => {
    const created: WorkspaceDto = await createWorkspace(req);
    const updatedList: WorkspaceDto[] = [created, ...workspaces];
    setWorkspaces(updatedList);
    setActiveWorkspace(created);
    await loadQuotaForWorkspace(created.id);
    await loadProjectsForWorkspace(created.id);
    showAlert(`Organização '${created.name}' criada com sucesso!`);
  };

  const handleRenameWorkspace = async (workspaceId: string, newName: string): Promise<void> => {
    const updated: WorkspaceDto = await updateWorkspace(workspaceId, { name: newName });
    setWorkspaces((prev: WorkspaceDto[]) =>
      prev.map((w: WorkspaceDto) => (w.id === updated.id ? updated : w))
    );
    if (activeWorkspace?.id === updated.id) {
      setActiveWorkspace(updated);
    }
    showAlert(`Nome da organização atualizado para '${updated.name}'!`);
  };

  const handleDeleteWorkspace = async (workspaceId: string): Promise<void> => {
    await deleteWorkspace(workspaceId);
    const remaining: WorkspaceDto[] = workspaces.filter((w: WorkspaceDto) => w.id !== workspaceId);
    setWorkspaces(remaining);
    if (activeWorkspace?.id === workspaceId && remaining.length > 0) {
      await handleSelectWorkspace(remaining[0]);
    }
    showAlert('Ambiente removido com sucesso!');
  };

  const handleCreateProject = async (req: CreateImportProjectRequest): Promise<void> => {
    if (!activeWorkspace) return;
    const created: ImportProjectDto = await createProject(activeWorkspace.id, req);
    const updatedList: ImportProjectDto[] = [created, ...projects];
    setProjects(updatedList);
    setActiveProject(created);
    setFiles([]);
    const updatedWs: WorkspaceDto = {
      ...activeWorkspace,
      projectsCount: activeWorkspace.projectsCount + 1,
    };
    setActiveWorkspace(updatedWs);
    setWorkspaces((prev: WorkspaceDto[]) =>
      prev.map((w: WorkspaceDto) => (w.id === updatedWs.id ? updatedWs : w))
    );
    showAlert(`Projeto '${created.name}' criado com sucesso!`);
  };

  const handleDeleteProject = async (projectId: string): Promise<void> => {
    await deleteProject(projectId);
    const remaining: ImportProjectDto[] = projects.filter((p: ImportProjectDto) => p.id !== projectId);
    setProjects(remaining);
    if (activeProject?.id === projectId) {
      if (remaining.length > 0) {
        setActiveProject(remaining[0]);
        await loadFilesForProject(remaining[0].id);
      } else {
        setActiveProject(null);
        setFiles([]);
      }
    }
    if (activeWorkspace) {
      const updatedWs: WorkspaceDto = {
        ...activeWorkspace,
        projectsCount: Math.max(0, activeWorkspace.projectsCount - 1),
      };
      setActiveWorkspace(updatedWs);
      setWorkspaces((prev: WorkspaceDto[]) =>
        prev.map((w: WorkspaceDto) => (w.id === updatedWs.id ? updatedWs : w))
      );
      await loadQuotaForWorkspace(activeWorkspace.id);
    }
    showAlert('Projeto e arquivos vinculados excluídos com sucesso.');
  };

  const handleUploadFile = async (file: File): Promise<void> => {
    if (!activeProject || !activeWorkspace) return;
    const uploaded: ImportFileDto = await uploadFile(activeProject.id, file);
    setFiles((prev: ImportFileDto[]) => [uploaded, ...prev]);
    setProjects((prev: ImportProjectDto[]) =>
      prev.map((p: ImportProjectDto) =>
        p.id === activeProject.id ? { ...p, filesCount: p.filesCount + 1 } : p
      )
    );
    await loadQuotaForWorkspace(activeWorkspace.id);
    showAlert(`Arquivo '${file.name}' anexado ao projeto com sucesso!`);
  };

  const handleValidateFile = async (fileId: string, requiredColumns?: string): Promise<void> => {
    try {
      setValidatingFileId(fileId);
      const report: ValidationReportDto = await validateFile(fileId, requiredColumns);
      setActiveReport(report);

      if (activeProject) {
        await loadFilesForProject(activeProject.id);
      }
      if (activeWorkspace) {
        await loadQuotaForWorkspace(activeWorkspace.id);
      }
      showAlert('Auditoria de conformidade concluída!');
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro na validação do arquivo';
      showAlert(msg, 'error');
    } finally {
      setValidatingFileId(null);
    }
  };

  const handleViewReport = async (fileId: string): Promise<void> => {
    try {
      const report: ValidationReportDto = await getFileReport(fileId);
      setActiveReport(report);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao buscar relatório';
      showAlert(msg, 'error');
    }
  };

  const handleDeleteFile = async (fileId: string): Promise<void> => {
    try {
      await deleteFile(fileId);
      setFiles((prev: ImportFileDto[]) => prev.filter((f: ImportFileDto) => f.id !== fileId));
      if (activeProject) {
        setProjects((prev: ImportProjectDto[]) =>
          prev.map((p: ImportProjectDto) =>
            p.id === activeProject.id ? { ...p, filesCount: Math.max(0, p.filesCount - 1) } : p
          )
        );
      }
      if (activeWorkspace) {
        await loadQuotaForWorkspace(activeWorkspace.id);
      }
      showAlert('Arquivo e histórico excluídos.');
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao excluir arquivo';
      showAlert(msg, 'error');
    }
  };

  const handleAuthSuccess = async (authData: AuthResponseDto): Promise<void> => {
    const wsList: WorkspaceDto[] = await getWorkspaces();
    const targetWs: WorkspaceDto | undefined =
      wsList.find((w: WorkspaceDto) => w.id === authData.workspaceId) ?? wsList[0];

    setWorkspaces(wsList);
    if (targetWs) {
      setActiveWorkspace(targetWs);
      await loadQuotaForWorkspace(targetWs.id);
      await loadProjectsForWorkspace(targetWs.id);
    }
    setCurrentUser(authData);
    showAlert(`Bem-vindo(a), ${authData.fullName}! Sessão autenticada.`);
  };

  const handleLogout = (): void => {
    logout();
    setCurrentUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setQuota(null);
    setProjects([]);
    setActiveProject(null);
    setFiles([]);
    setActiveReport(null);
    showAlert('Sessão encerrada com segurança.');
  };

  const handlePlanChanged = async (updatedQuota: WorkspaceQuotaDto): Promise<void> => {
    setQuota(updatedQuota);
    if (activeWorkspace) {
      const updatedWs: WorkspaceDto = {
        ...activeWorkspace,
        plan: updatedQuota.plan,
        monthlyFilesUploaded: updatedQuota.monthlyFilesUploaded,
        monthlyFilesQuota: updatedQuota.monthlyFilesQuota,
        maxRowsPerFile: updatedQuota.maxRowsPerFile,
      };
      setActiveWorkspace(updatedWs);
      setWorkspaces((prev: WorkspaceDto[]) =>
        prev.map((w: WorkspaceDto) => (w.id === updatedWs.id ? updatedWs : w))
      );
    }
    const planLabel: string = PlanTierLabels[String(updatedQuota.plan)] ?? String(updatedQuota.plan);
    showAlert(`Plano da organização atualizado para ${planLabel}!`);
  };

  const activePlanLabel: string = activeWorkspace
    ? (PlanTierLabels[String(activeWorkspace.plan)] ?? 'Starter')
    : 'Starter';
  const activePlanLimits = PLAN_LIMITS[activePlanLabel] ?? PLAN_LIMITS.Starter;
  const quotaPercent: number = quota ? quota.usagePercentage : 0;
  const isQuotaNearLimit: boolean = quotaPercent >= 80;
  const activeProjectErpPreset: ErpPresetConfig | null = activeProject
    ? getErpPreset(activeProject.targetSystem)
    : null;

  const showcaseErpKeys: string[] = [
    'TOTVS Protheus',
    'SAP Business One',
    'SAP S/4HANA',
    'Senior ERP',
    'Sankhya',
    'Omie',
  ];

  return (
    <div className="app-layout">
      <Navbar
        activeWorkspace={activeWorkspace}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenPlanModal={() => setIsPlanOpen(true)}
        onOpenAuditModal={() => setIsAuditOpen(true)}
        onOpenRulesModal={() => setIsRulesOpen(true)}
      />

      <main className="main-content">
        {alert && (
          <div className={`alert-toast alert-${alert.type}`} role="alert">
            <span className="alert-toast-content">
              {alert.type === 'success' ? '✓ ' : '✕ '} {alert.text}
            </span>
            <button
              type="button"
              className="btn-toast-close"
              aria-label="Fechar notificação"
              onClick={() => setAlert(null)}
            >
              &times;
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Inicializando ambiente de governança e validação...</p>
          </div>
        ) : !currentUser ? (
          /* ==========================================================
             Visão Executiva / Institucional para Visitantes Deslogados
             (Sem exibir dados ou consumo de nenhuma outra organização)
             ========================================================== */
          <div className="content-container">
            <section className="visitor-showcase-hero">
              <div className="visitor-hero-main">
                <div className="visitor-hero-badge-row">
                  <span className="visitor-pill-highlight">Homologação Prévia para ERPs</span>
                  <span className="visitor-pill-outline">Isolamento Multi-Tenant Seguro</span>
                </div>
                <h1>
                  Elimine rejeições de carga e retrabalho em implantações de sistemas ERP.
                </h1>
                <p className="visitor-hero-lead">
                  O <strong>DataConform</strong> audita, valida e homologa planilhas cadastrais e financeiras antes da importação definitiva no seu ERP, apontando linha a linha qualquer desvio estrutural ou fiscal com laudo técnico exportável.
                </p>

                <div className="visitor-hero-cta-group">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenAuth('register')}
                  >
                    🚀 Criar Conta Corporativa Gratuita
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleOpenAuth('login')}
                  >
                    Acessar Minha Organização
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsRulesOpen(true)}
                  >
                    🛡️ Ver Garantias de Conformidade
                  </button>
                </div>
              </div>

              <div className="visitor-hero-metrics-card">
                <span className="visitor-metrics-tag">Plano Starter Gratuito ao Cadastrar</span>
                <h3>Pronto para testar em 30 segundos</h3>
                <ul className="visitor-metrics-list">
                  <li>
                    <strong>✓ Ambiente Isolado:</strong> Organização exclusiva com trilha de auditoria própria
                  </li>
                  <li>
                    <strong>✓ Dicionários Nativos:</strong> Presets oficiais para TOTVS, SAP, Senior, Sankhya, Omie e ContaAzul
                  </li>
                  <li>
                    <strong>✓ Diagnóstico Instantâneo:</strong> Laudo interativo com cópia rápida e exportação CSV
                  </li>
                  <li>
                    <strong>✓ Zero Exposição:</strong> Seus dados nunca são compartilhados com outros locatários
                  </li>
                </ul>
                <button
                  type="button"
                  className="btn btn-outline btn-sm btn-full"
                  onClick={() => setIsPlanOpen(true)}
                >
                  Consultar Planos & Capacidade Operacional
                </button>
              </div>
            </section>

            <section className="visitor-erp-presets-section">
              <div className="section-header">
                <div>
                  <h2>Dicionários de Dados Homologados por ERP</h2>
                  <p className="section-subtitle">
                    Cada projeto conta com mapeamento exclusivo das tabelas, campos obrigatórios e modelos CSV oficiais dos principais ERPs do mercado.
                  </p>
                </div>
              </div>

              <div className="visitor-erp-grid">
                {showcaseErpKeys.map((erpKey: string) => {
                  const preset: ErpPresetConfig = ERP_PRESETS[erpKey];
                  return (
                    <div key={erpKey} className="visitor-erp-card">
                      <div className="visitor-erp-card-top">
                        <strong>{preset.systemName}</strong>
                        <span className="erp-module-badge">{preset.moduleReference}</span>
                      </div>
                      <p className="visitor-erp-desc">{preset.summary}</p>
                      <div className="visitor-erp-cols">
                        {preset.requiredColumns.map((col: string) => (
                          <span key={col} className="erp-col-tag">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          /* ==========================================================
             Dashboard Corporativo Autenticado (Multi-Tenant Isolado)
             ========================================================== */
          <div className="content-container">
            {/* Top Hero Banner with Organization Status & Commercial Quota */}
            <div className="workspace-hero-banner">
              <div className="hero-details">
                <div className="hero-overline">
                  <span>ORGANIZAÇÃO ATIVA</span>
                  <button
                    type="button"
                    className="hero-edit-ws-link"
                    onClick={() => setIsWorkspaceModalOpen(true)}
                  >
                    ⚙ Gerenciar / Renomear
                  </button>
                </div>
                <div className="hero-title-row">
                  <h1>{activeWorkspace?.name || 'Ambiente Corporativo'}</h1>
                  {activeWorkspace && (
                    <span className={`plan-badge-pill plan-badge-${activePlanLabel.toLowerCase()}`}>
                      {activePlanLabel}
                    </span>
                  )}
                </div>
                <p className="hero-subtitle">
                  Motor de auditoria estrutural (RFC 4180) e conformidade semântica para cargas de dados em ERPs (TOTVS, SAP, Senior, Sankhya, Omie, ContaAzul).
                </p>

                <div className="hero-quick-badges">
                  <span className="hero-cap-pill">
                    ⚡ Até {activePlanLimits.maxRowsPerFile.toLocaleString('pt-BR')} linhas/arquivo
                  </span>
                  <span className="hero-cap-pill">
                    📦 Até {activePlanLimits.maxFileSizeMb} MB/arquivo
                  </span>
                  <span className="hero-cap-pill">
                    📚 Lote de até {activePlanLimits.maxConcurrentFiles} arquivos simultâneos
                  </span>
                </div>
              </div>

              {/* Commercial Quota Card */}
              {quota && (
                <div className="hero-quota-card">
                  <div className="quota-card-header">
                    <span
                      className="quota-title"
                      title="Quantidade de arquivos validados no ciclo mensal vigente da sua organização"
                    >
                      Consumo Mensal do Plano
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-upgrade"
                      onClick={() => setIsPlanOpen(true)}
                    >
                      {activePlanLabel === 'Starter' ? '🚀 Fazer Upgrade' : 'Ver Planos'}
                    </button>
                  </div>

                  <div className="quota-metric">
                    <strong>{quota.monthlyFilesUploaded}</strong> / {quota.monthlyFilesQuota} uploads
                    <span className="quota-percent">({quota.usagePercentage}%)</span>
                  </div>

                  <div className="quota-progress-bar">
                    <div
                      className={`quota-progress-fill ${isQuotaNearLimit ? 'quota-progress-warn' : ''}`}
                      style={{ width: `${Math.min(quota.usagePercentage, 100)}%` }}
                    />
                  </div>

                  <span className="quota-footnote">
                    Capacidade máxima: {quota.maxRowsPerFile.toLocaleString('pt-BR')} linhas por planilha
                  </span>
                </div>
              )}
            </div>

            {/* Project Selection & Grid */}
            <ProjectList
              projects={projects}
              activeProject={activeProject}
              isLoading={loadingProjects}
              onSelectProject={handleSelectProject}
              onOpenCreateProject={() => setIsCreateProjOpen(true)}
              onDeleteProject={handleDeleteProject}
            />

            {/* Active Project Workspace Detail */}
            {activeProject && (
              <section className="active-project-section">
                <div className="project-detail-header">
                  <div className="project-detail-header-top">
                    <div>
                      <span className="section-tag">Projeto Selecionado</span>
                      <h2>{activeProject.name}</h2>
                      <div className="project-meta-row">
                        <span className="target-pill">
                          ERP de Destino: <strong>{activeProject.targetSystem || 'Genérico / CSV'}</strong>
                        </span>
                        {activeProjectErpPreset && (
                          <span className="erp-module-badge">
                            {activeProjectErpPreset.moduleReference}
                          </span>
                        )}
                        {activeProject.description && (
                          <span className="text-sm text-muted">• {activeProject.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="upload-container">
                  <div className="section-title-bar">
                    <h3 className="section-title">1. Anexar Planilhas para Validação</h3>
                  </div>
                  <FileUploader
                    onUpload={handleUploadFile}
                    plan={activeWorkspace?.plan}
                    targetSystem={activeProject.targetSystem}
                    onOpenRules={() => setIsRulesOpen(true)}
                  />
                </div>

                {/* File List and Reports */}
                <div className="files-container">
                  <div className="section-title-bar">
                    <h3 className="section-title">2. Lotes Enviados & Laudos de Conformidade</h3>
                    <span className="text-muted text-sm">
                      {files.length} {files.length === 1 ? 'arquivo registrado' : 'arquivos registrados'}
                    </span>
                  </div>
                  <FileList
                    files={files}
                    targetSystem={activeProject.targetSystem}
                    onValidate={handleValidateFile}
                    onViewReport={handleViewReport}
                    onDeleteFile={handleDeleteFile}
                    validatingFileId={validatingFileId}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-brand-col">
            <div className="footer-brand-row">
              <strong>DataConform</strong>
              <span className="footer-status-pill">
                <span className="status-dot-online" /> Motor de Auditoria Ativo
              </span>
            </div>
            <p className="footer-desc">
              Plataforma corporativa para saneamento, governança e homologação prévia de cargas de dados em sistemas ERP.
            </p>
          </div>

          <div className="footer-links-col">
            <button type="button" className="footer-link-btn" onClick={() => setIsRulesOpen(true)}>
              Garantias de Conformidade
            </button>
            <button type="button" className="footer-link-btn" onClick={() => setIsPlanOpen(true)}>
              Planos & Capacidade
            </button>
            {currentUser && (
              <button type="button" className="footer-link-btn" onClick={() => setIsAuditOpen(true)}>
                Trilha de Auditoria
              </button>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} DataConform Software. Todos os direitos reservados.</span>
          <span>Homologação RFC 4180 • Isolamento Multi-Tenant JWT & TLS</span>
        </div>
      </footer>

      {/* Modals */}
      <WorkspaceModal
        key={`ws-${String(isWorkspaceModalOpen)}-${activeWorkspace?.id ?? 'none'}`}
        isOpen={isWorkspaceModalOpen}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        primaryUserWorkspaceId={currentUser?.workspaceId}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onRenameWorkspace={handleRenameWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
      />

      <CreateProjectModal
        isOpen={isCreateProjOpen}
        onClose={() => setIsCreateProjOpen(false)}
        onSubmit={handleCreateProject}
      />

      <ValidationReportModal
        report={activeReport}
        onClose={() => setActiveReport(null)}
      />

      <AuthModal
        key={`auth-${String(isAuthOpen)}-${authInitialMode}`}
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ChangePlanModal
        key={`plan-${String(isPlanOpen)}-${activeWorkspace?.id ?? 'none'}-${String(activeWorkspace?.plan ?? '')}`}
        isOpen={isPlanOpen}
        workspace={activeWorkspace}
        isAuthenticated={Boolean(currentUser)}
        onClose={() => setIsPlanOpen(false)}
        onPlanChanged={handlePlanChanged}
        onRequireAuth={() => handleOpenAuth('register')}
      />

      <AuditLogsModal
        isOpen={isAuditOpen}
        workspace={activeWorkspace}
        onClose={() => setIsAuditOpen(false)}
      />

      <ComplianceRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
};

export default App;
