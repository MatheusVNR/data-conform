import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import { CreateProjectModal } from './components/CreateProjectModal';
import { FileList } from './components/FileList';
import { FileUploader } from './components/FileUploader';
import { Navbar } from './components/Navbar';
import { ProjectList } from './components/ProjectList';
import { ValidationReportModal } from './components/ValidationReportModal';
import { WorkspaceModal } from './components/WorkspaceModal';
import {
  createProject,
  createWorkspace,
  getFileReport,
  getFiles,
  getProjects,
  getWorkspaces,
  uploadFile,
  validateFile,
} from './services/api';
import type {
  CreateImportProjectRequest,
  CreateWorkspaceRequest,
  ImportFileDto,
  ImportProjectDto,
  ValidationReportDto,
  WorkspaceDto,
} from './types';
import './App.css';

export const App: FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceDto | null>(null);
  const [projects, setProjects] = useState<ImportProjectDto[]>([]);
  const [activeProject, setActiveProject] = useState<ImportProjectDto | null>(null);
  const [files, setFiles] = useState<ImportFileDto[]>([]);
  const [activeReport, setActiveReport] = useState<ValidationReportDto | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [validatingFileId, setValidatingFileId] = useState<string | null>(null);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState<boolean>(false);
  const [isCreateProjOpen, setIsCreateProjOpen] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success'): void => {
    setAlert({ type, text });
    setTimeout(() => {
      setAlert(null);
    }, 5000);
  };

  const loadFilesForProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      const list: ImportFileDto[] = await getFiles(projectId);
      setFiles(list);
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : 'Erro ao buscar arquivos';
      showAlert(msg, 'error');
    }
  }, []);

  const loadProjectsForWorkspace = useCallback(async (workspaceId: string): Promise<void> => {
    try {
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
    }
  }, [loadFilesForProject]);

  useEffect(() => {
    let isMounted: boolean = true;

    async function init(): Promise<void> {
      try {
        const wsList: WorkspaceDto[] = await getWorkspaces();
        if (!isMounted) return;
        setWorkspaces(wsList);

        if (wsList.length > 0) {
          const firstWs: WorkspaceDto = wsList[0];
          setActiveWorkspace(firstWs);
          const projList: ImportProjectDto[] = await getProjects(firstWs.id);
          if (!isMounted) return;
          setProjects(projList);
          if (projList.length > 0) {
            setActiveProject(projList[0]);
            const fileList: ImportFileDto[] = await getFiles(projList[0].id);
            if (!isMounted) return;
            setFiles(fileList);
          }
        } else {
          try {
            const defaultWs: WorkspaceDto = await createWorkspace({
              name: 'Organização Exemplo',
              slug: 'organizacao-exemplo',
            });
            if (!isMounted) return;
            setWorkspaces([defaultWs]);
            setActiveWorkspace(defaultWs);
          } catch {
            // Mantém vazio se falhar conexão inicial
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
  }, []);

  const handleSelectWorkspace = async (ws: WorkspaceDto): Promise<void> => {
    setActiveWorkspace(ws);
    await loadProjectsForWorkspace(ws.id);
  };

  const handleSelectProject = async (proj: ImportProjectDto): Promise<void> => {
    setActiveProject(proj);
    await loadFilesForProject(proj.id);
  };

  const handleCreateWorkspace = async (req: CreateWorkspaceRequest): Promise<void> => {
    const created: WorkspaceDto = await createWorkspace(req);
    const updatedList: WorkspaceDto[] = [...workspaces, created];
    setWorkspaces(updatedList);
    setActiveWorkspace(created);
    await loadProjectsForWorkspace(created.id);
    showAlert(`Workspace '${created.name}' criado com sucesso!`);
  };

  const handleCreateProject = async (req: CreateImportProjectRequest): Promise<void> => {
    if (!activeWorkspace) return;
    const created: ImportProjectDto = await createProject(activeWorkspace.id, req);
    const updatedList: ImportProjectDto[] = [created, ...projects];
    setProjects(updatedList);
    setActiveProject(created);
    setFiles([]);
    showAlert(`Projeto '${created.name}' criado com sucesso!`);
  };

  const handleUploadFile = async (file: File): Promise<void> => {
    if (!activeProject) return;
    const uploaded: ImportFileDto = await uploadFile(activeProject.id, file);
    setFiles((prev) => [uploaded, ...prev]);
    showAlert(`Arquivo '${file.name}' enviado com sucesso!`);
  };

  const handleValidateFile = async (fileId: string, requiredColumns?: string): Promise<void> => {
    try {
      setValidatingFileId(fileId);
      const report: ValidationReportDto = await validateFile(fileId, requiredColumns);
      setActiveReport(report);

      if (activeProject) {
        await loadFilesForProject(activeProject.id);
      }
      showAlert('Validação concluída com sucesso!');
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

  return (
    <div className="app-layout">
      <Navbar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
      />

      <main className="main-content">
        {alert && (
          <div className={`alert-toast alert-${alert.type}`} role="alert">
            {alert.type === 'success' ? '✓ ' : '✕ '} {alert.text}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando dados da aplicação...</p>
          </div>
        ) : (
          <div className="content-container">
            {/* Top Bar with Workspace Status */}
            <div className="workspace-hero-banner">
              <div>
                <h1>{activeWorkspace?.name || 'Selecione um Workspace'}</h1>
                <p className="hero-subtitle">
                  Ambiente de conformidade e preparação de planilhas e dados para ERPs corporativos.
                </p>
              </div>
            </div>

            {/* Project Selection & Grid */}
            <ProjectList
              projects={projects}
              activeProject={activeProject}
              onSelectProject={handleSelectProject}
              onOpenCreateProject={() => setIsCreateProjOpen(true)}
            />

            {/* Active Project Workspace Detail */}
            {activeProject && (
              <section className="active-project-section">
                <div className="project-detail-header">
                  <div>
                    <span className="section-tag">Projeto Ativo</span>
                    <h2>{activeProject.name}</h2>
                    <span className="target-pill">
                      Destino: <strong>{activeProject.targetSystem || 'Genérico'}</strong>
                    </span>
                  </div>
                </div>

                {/* Upload Zone */}
                <div className="upload-container">
                  <h3 className="section-title">Upload de Planilha / Arquivo</h3>
                  <FileUploader onUpload={handleUploadFile} />
                </div>

                {/* File List and Reports */}
                <div className="files-container">
                  <div className="section-title-bar">
                    <h3 className="section-title">Arquivos do Projeto</h3>
                    <span className="text-muted text-sm">{files.length} arquivos registrados</span>
                  </div>
                  <FileList
                    files={files}
                    onValidate={handleValidateFile}
                    onViewReport={handleViewReport}
                    validatingFileId={validatingFileId}
                  />
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <WorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
        onSubmit={handleCreateWorkspace}
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
    </div>
  );
};

export default App;
