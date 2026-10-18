# AGENT.md — Guia Estrito de Manutenção e Arquitetura (DataConform)

Este documento define as diretrizes obrigatórias para agentes de IA (incluindo modelos de menor capacidade / Flash) na manutenção e evolução do repositório **DataConform**. Siga estas regras sem desvios.

---

## 1. Visão Geral da Arquitetura

### Backend (.NET 10 — Clean Architecture + Minimal APIs)
- **`backend/DataConform.Domain`**: Entidades de negócio (`Workspace`, `User`, `ImportProject`, `ImportFile`, `ValidationIssue`, `AuditLog`) e Enums (`PlanTier`, `FileStatus`, `IssueSeverity`, `UserRole`). Zero dependências de pacotes externos.
- **`backend/DataConform.Application`**: Interfaces (`IApplicationDbContext`, `ICsvValidatorService`, `ISubscriptionQuotaService`, `IAuditService`, `IFileStorageService`), DTOs e serviços puros de negócio (`CsvValidatorService`).
- **`backend/DataConform.Infrastructure`**: Implementação do Entity Framework Core 10 (`DataConformDbContext`), Npgsql (PostgreSQL), configurações Fluent API (`IEntityTypeConfiguration<T>`), BCrypt, JWT e armazenamento físico de arquivos.
- **`backend/DataConform.Api`**: ASP.NET Core Minimal APIs agrupadas por domínio em `Endpoints/*Endpoints.cs`, documentadas via OpenAPI 3.0 (`/openapi/v1.json`) e Scalar UI (`/docs`).

### Frontend (React 19 + TypeScript 5.9 + Vite 8)
- **`frontend/src/types/index.ts`**: Contratos TypeScript espelhados com os DTOs do backend e constantes de limites de planos (`PLAN_LIMITS`).
- **`frontend/src/services/api.ts`**: Cliente HTTP centralizado (`fetch` nativo) com injeção automática do header `Authorization: Bearer <token>` e resolução de `VITE_API_URL`.
- **`frontend/src/components/`**: Componentes funcionais (`FC<Props>`) modulares (Modais, `Navbar`, `FileUploader`, `FileList`, `ProjectList`).
- **`frontend/src/App.tsx` & `App.css`**: Orquestração de estado principal, suporte nativo a Light/Dark Mode (`[data-theme="dark"]`) e estilização responsiva sem dependências externas de UI.

---

## 2. Padrões de Implementação (Snippets Mínimos)

### 2.1. Como declarar e registrar um novo Endpoint (.NET Minimal API)
1. Declare o método estático em `backend/DataConform.Api/Endpoints/<Modulo>Endpoints.cs` usando tipagem explícita (nunca use `var`).
2. Registre o grupo em `Program.cs` se for um novo módulo (`app.Map<Modulo>Endpoints();`).

```csharp
// Em backend/DataConform.Api/Endpoints/ProjectEndpoints.cs
group.MapDelete("/projects/{projectId:guid}", DeleteProject)
    .WithName("DeleteProject")
    .Produces(StatusCodes.Status204NoContent)
    .ProducesProblem(StatusCodes.Status404NotFound);

private static async Task<IResult> DeleteProject(
    Guid projectId,
    IApplicationDbContext dbContext,
    IAuditService auditService,
    CancellationToken cancellationToken)
{
    ImportProject? project = await dbContext.ImportProjects
        .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

    if (project == null)
    {
        return Results.NotFound(new { error = "Projeto não encontrado." });
    }

    dbContext.ImportProjects.Remove(project);
    await dbContext.SaveChangesAsync(cancellationToken);
    await auditService.LogAsync(project.WorkspaceId, null, "DeleteProject", "ImportProject", projectId.ToString(), "Projeto excluído.", cancellationToken);

    return Results.NoContent();
}
```

### 2.2. Como criar/estender Entidades, DTOs e `DbContext`
1. **Entidade**: Crie/edite em `DataConform.Domain/Entities/`, herdando de `BaseEntity`.
2. **DbContext**: Exponha `DbSet<TEntity>` em `IApplicationDbContext` e `DataConformDbContext`, e adicione a configuração Fluent API em `DataConform.Infrastructure/Persistence/Configurations/`.
3. **DTO**: Crie/edite em `DataConform.Application/<Modulo>/Dtos/`.

```csharp
// Entidade (DataConform.Domain/Entities/ImportProject.cs)
public class ImportProject : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public string Name { get; set; } = string.Empty;
}

// DTO (DataConform.Application/Projects/Dtos/ImportProjectDtos.cs)
public class CreateImportProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? TargetSystem { get; set; }
}
```

### 2.3. Como criar e tipar o consumo no Frontend (React + TypeScript)
1. Declare a interface em `frontend/src/types/index.ts`.
2. Crie a função assíncrona em `frontend/src/services/api.ts` com retorno explicitamente tipado (`Promise<T>`).

```typescript
// 1. Em frontend/src/types/index.ts
export interface UpdateWorkspaceRequest {
  name: string;
}

// 2. Em frontend/src/services/api.ts
export async function updateWorkspace(
  workspaceId: string,
  request: UpdateWorkspaceRequest
): Promise<WorkspaceDto> {
  const response: Response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || 'Erro ao atualizar workspace');
  }
  return (await response.json()) as WorkspaceDto;
}
```

---

## 3. Regras e Restrições Negativas (NUNCA Violar)

1. **PROIBIDO usar `var` no C#**: Toda variável local, de loop ou retorno no backend e nos testes deve ter seu tipo declarado explicitamente (ex: `List<WorkspaceDto> list = ...`, `Guid fileId = ...`).
2. **PROIBIDO usar `any` no TypeScript**: Todas as props, estados (`useState<T>`), parâmetros e retornos de funções devem ter tipagem estrita.
3. **PROIBIDO pré-preencher senhas ou usar dados amadores em inputs**: Campos de senha devem inicializar vazios (`''`) com `autoComplete="new-password"` ou `"current-password"`. Placeholders devem usar nomes corporativos verossímeis.
4. **PROIBIDO alterar planos pagos sem verificação de pagamento**: Upgrades para `Professional` ou `Enterprise` exigem `session_id` válido do Stripe Checkout (`cs_test_...` / `cs_live_...`) via endpoint `/api/workspaces/{id}/checkout/confirm`.
5. **PROIBIDO restringir `/openapi/v1.json` ou `/docs` apenas a `IsDevelopment()`**: A documentação OpenAPI e Scalar deve permanecer acessível em produção.
6. **PROIBIDO referenciar `DataConform.Infrastructure` a partir de `DataConform.Domain` ou `DataConform.Application`**: Respeite a direção das dependências da Clean Architecture.

---

## 4. Convenções e Regras de Negócio do DataConform

### 4.1. Glossário do Domínio
- **`Workspace` (Organização / Tenant)**: Unidade central de isolamento multi-tenant. Concentra o plano comercial ativo (`PlanTier`), a cota mensal de uploads (`MonthlyFilesUploaded` / `MonthlyFilesQuota`), o limite de linhas por planilha (`MaxRowsPerFile`) e os projetos.
- **`User` (Usuário Corporativo)**: Operador autenticado via JWT e vinculado a um `Workspace` primário com papel (`Admin` ou `Member`).
- **`ImportProject` (Projeto de Importação)**: Agrupador lógico de cargas de dados voltado a um ERP específico (ex: *TOTVS Protheus*, *SAP Business One*, *Senior Sapiens*).
- **`ImportFile` (Arquivo de Carga)**: Representa um arquivo `.csv` ou `.txt` enviado a um projeto, armazenando metadados físicos (`ByteSize`, `StoredFileName`), status de processamento e contadores (`TotalRows`, `ValidRows`, `ErrorRows`).
- **`ValidationIssue` (Inconformidade / Ocorrência)**: Apontamento individual gerado pelo motor de validação para uma linha/coluna de um `ImportFile`, classificado por `IssueCode` e `IssueSeverity` (`Warning` ou `Error`).
- **`AuditLog` (Registro de Auditoria)**: Evento imutável que rastreia ações críticas executadas no `Workspace`.

### 4.2. Invariantes de Negócio (Regras Invioláveis)
1. **Isolamento de Cota e Limites por Plano (`PlanTier`)**:
   - `Starter`: Máx. **20 arquivos/mês**, **1.000 linhas/arquivo**, **5 MB/arquivo**, até **2 arquivos simultâneos** por lote.
   - `Professional`: Máx. **500 arquivos/mês**, **50.000 linhas/arquivo**, **25 MB/arquivo**, até **5 arquivos simultâneos** por lote.
   - `Enterprise`: Máx. **10.000 arquivos/mês**, **1.000.000 linhas/arquivo**, **50 MB/arquivo**, até **10 arquivos simultâneos** por lote.
2. **Idempotência de Confirmação Stripe**: Um mesmo `session_id` de pagamento do Stripe nunca pode ser reutilizado para múltiplos upgrades (verificado via `AuditLogs` com `Action == "StripeCheckoutConfirmed"`).
3. **Proteção contra Orfandade de Workspace**: O último `Workspace` remanescente ou o workspace primário vinculado a usuários ativos não pode ser excluído.
4. **Dupla Camada de Validação CSV (`CsvValidatorService`)**:
   - **Camada 1 (Estrutural Universal)**: Sempre valida `EMPTY_FILE`, `EMPTY_HEADER_NAME`, `DUPLICATE_HEADER`, `COLUMN_COUNT_MISMATCH` (RFC 4180), `ENCODING_CORRUPTION` (`\uFFFD`) e `DUPLICATE_ROW`.
   - **Camada 2 (Semântica ERP & Parametrizável)**: Sempre valida `REQUIRED_HEADER_MISSING` e `REQUIRED_FIELD_MISSING` (quando colunas obrigatórias são informadas) e aplica inspeção semântica automática por nome de coluna para `INVALID_EMAIL_FORMAT`, `INVALID_DOCUMENT_FORMAT` (CPF 11 dígitos / CNPJ 14 dígitos + Módulo 11), `INVALID_AMOUNT_FORMAT` / `NEGATIVE_AMOUNT_NOT_ALLOWED` e `INVALID_DATE_FORMAT`.
5. **Rastreabilidade de Auditoria**: Operações de upload, validação, exclusão de arquivo/projeto e alteração/confirmação de plano devem obrigatoriamente gerar um registro via `IAuditService.LogAsync`.

### 4.3. Ciclo de Vida e Máquina de Estados

#### Ciclo de Vida de `ImportFile` (`FileStatus`)
```text
[Upload Concluído] ──► Pending (0)
                          │
              (Início de ValidateFile)
                          ▼
                     Processing (1)
                       /        \
     (Dentro da cota e s/ exceção)  (Excedeu MaxRowsPerFile ou erro de I/O)
                     ▼            ▼
              Completed (2)    Failed (3)
                     │
          (Revalidação c/ novas regras)
                     └──────────► Processing (1)
```
- **Nota importante**: Um arquivo com inconsistências de dados (`ErrorRows > 0`) transita para **`Completed (2)`** (pois a inspeção técnica foi concluída e o laudo está disponível). O estado **`Failed (3)`** é reservado para bloqueio de cota de linhas (`403 Forbidden`) ou falha estrutural de leitura/I/O.

#### Ciclo de Vida de Assinatura (`PlanTier`)
- `Starter (0)` ──(Checkout Stripe + `session_id` confirmado)──► `Professional (1)` ou `Enterprise (2)`.
- `Professional (1)` / `Enterprise (2)` ──(Cancelamento confirmado pelo usuário via `/change-plan`)──► `Starter (0)`.

### 4.4. Tratamento de Erros de Domínio e Formato de Resposta HTTP
- **Erros de Validação de Entrada / Regra Simples (`400 Bad Request`, `404 Not Found`, `409 Conflict`)**:
  Retornar objeto JSON padronizado com a chave `error`:
  ```json
  { "error": "Mensagem clara em português explicando o motivo da recusa." }
  ```
- **Violações de Limite de Plano / Cotas Comerciais (`403 Forbidden`)**:
  Retornar `Results.Problem` (RFC 7807 ProblemDetails) com `statusCode: 403`, `title` e `detail`:
  ```csharp
  return Results.Problem(
      statusCode: StatusCodes.Status403Forbidden,
      title: "Limite do plano atingido",
      detail: quotaCheck.Reason);
  ```
- **Consumo de Erros no Frontend (`services/api.ts`)**:
  Sempre extrair `errorData.detail || errorData.title || errorData.error` antes de lançar `new Error(...)`.

---

## 5. Workflow de Validação Obrigatório

Após qualquer alteração de código no repositório, execute **todos** os comandos abaixo e garanta saída sem erros ou avisos antes de concluir a tarefa:

```powershell
# 1. Compilar e executar todos os testes unitários do Backend (.NET 10)
dotnet test backend\DataConform.sln

# 2. Validar linting estrito do Frontend (ESLint)
cd frontend
npm run lint

# 3. Validar checagem de tipos (tsc -b) e build de produção (Vite)
npm run build
```
