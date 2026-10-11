# DataConform

O **DataConform** é uma plataforma SaaS B2B projetada para auxiliar empresas no pré-processamento, validação e conformação de arquivos estruturados e planilhas antes da importação em sistemas de gestão empresarial (ERPs) e outras plataformas corporativas.

---

## 1. Problema que o produto resolve

Processos de migração e importação de dados frequentemente enfrentam gargalos críticos:
- Campos obrigatórios ausentes ou não preenchidos.
- Registros duplicados ou inconsistentes.
- Formatos incorretos de datas, valores numéricos, moedas e documentos (CPF, CNPJ, etc.).
- Cabeçalhos e nomes de colunas fora do padrão esperado pelo sistema destino.
- Violações de regras de negócio específicas da empresa.
- Necessidade de correções manuais demoradas e suscetíveis a erros humanos.

O DataConform atua reduzindo o retrabalho e o risco de falhas em implantações de sistemas ao fornecer validações automatizadas, mapeamentos de colunas, relatórios detalhados de inconsistências e exportação de dados prontos para importação.

---

## 2. Visão Resumida da Arquitetura

O projeto adota uma arquitetura monorepositório separada em backend, frontend e serviços locais:

- **Backend (.NET 10 / C#):**
  - Arquitetura em camadas (Domain, Application, Infrastructure, Api).
  - ASP.NET Core Web API com suporte a OpenAPI.
  - Entity Framework Core planejado para persistência com PostgreSQL (Npgsql).
  - Testes automatizados com xUnit.
- **Frontend (React + TypeScript + Vite):**
  - Interface construída com React e TypeScript.
  - Bundler e ambiente de desenvolvimento rápido com Vite.
  - Padronização de código com ESLint.
- **Infraestrutura Local (Docker Compose):**
  - Contêiner PostgreSQL 17 oficial (Alpine) para desenvolvimento local.
  - Configuração via variáveis de ambiente seguras com persistência em volume Docker.

---

## 3. Estrutura do Repositório

```text
DataConform/
├── backend/
│   ├── DataConform.sln                     # Solução .NET
│   ├── DataConform.Domain/                 # Núcleo de domínio e regras de negócio
│   ├── DataConform.Application/            # Casos de uso e orquestração da aplicação
│   ├── DataConform.Infrastructure/         # Acesso a dados, persistência e integrações
│   ├── DataConform.Api/                    # API HTTP ASP.NET Core
│   └── tests/
│       └── DataConform.UnitTests/          # Testes automatizados (xUnit)
│
├── frontend/
│   ├── package.json                        # Dependências e scripts do frontend
│   ├── tsconfig.json                       # Configurações do TypeScript
│   ├── vite.config.ts                      # Configuração do Vite
│   ├── eslint.config.js                    # Regras de linting do ESLint
│   └── src/                                # Código-fonte da aplicação React
│
├── docker-compose.yml                      # Definição do serviço PostgreSQL local
├── .env.example                            # Modelo ilustrativo de variáveis de ambiente
├── .gitignore                              # Arquivos ignorados pelo Git
└── README.md                               # Documentação inicial do repositório
```

---

## 4. Pré-requisitos

Para executar o ambiente localmente, são recomendadas as seguintes ferramentas:

- **.NET SDK:** Versão 10.0 (utilizada na fundação da solução) ou superior.
- **Node.js:** Versão 22 LTS (v22.14.0+) e **npm** (11.2.0+).
- **Docker e Docker Compose:** Docker Engine 28+ e Compose v2.35+ (necessário Docker Desktop ou daemon ativo para execução dos contêineres).
- **Git:** Versão 2.45+.

---

## 5. Instruções do Backend

### 5.1. Restaurar dependências e compilar (Verificado)

A partir da raiz do repositório ou do diretório `backend`:

```powershell
dotnet restore backend/DataConform.sln
dotnet build backend/DataConform.sln
```

*Status da verificação:* Executado com sucesso. Compilação concluída com 0 erros.

### 5.2. Executar testes automatizados (Verificado)

```powershell
dotnet test backend/DataConform.sln
```

*Status da verificação:* Executado com sucesso. 1 teste executado e aprovado.

---

## 6. Instruções do Frontend

### 6.1. Instalação das dependências (Verificado)

Navegue até a pasta `frontend`:

```powershell
cd frontend
npm install
```

*Status da verificação:* Executado com sucesso. 160 pacotes instalados com 0 vulnerabilidades.

### 6.2. Compilação de produção e Lint (Verificado)

```powershell
npm run build
npm run lint
```

*Status da verificação:* Executado com sucesso. Build do Vite e validação do ESLint concluídos sem erros.

---

## 7. Instruções do Banco de Dados Local (Docker)

### 7.1. Configuração das Variáveis de Ambiente

Antes de iniciar o serviço de banco de dados, crie o arquivo `.env` na raiz do projeto com base no modelo fornecido:

```powershell
Copy-Item .env.example .env
```

Abra o arquivo `.env` gerado e ajuste o usuário, senha e banco de dados caso deseje customizar.

> [!CAUTION]
> **Nunca comite o arquivo `.env` no Git.** Mantenha senhas e credenciais reais restritas ao seu ambiente local.

### 7.2. Iniciar o PostgreSQL

Com o Docker Desktop ou o daemon do Docker em execução:

```powershell
docker compose up -d
```

Para verificar o status e a integridade (healthcheck com `pg_isready`) do contêiner:

```powershell
docker compose ps
```

Para parar o contêiner:

```powershell
docker compose down
```

*Nota sobre a verificação do Docker:* A sintaxe do arquivo `docker-compose.yml` foi validada com sucesso (`docker compose config`). No entanto, a subida do contêiner requer que o daemon do Docker Desktop esteja em execução na máquina do desenvolvedor.

---

## 8. Limitações Atuais (Fase de Fundação)

O projeto encontra-se na **Etapa 1 — Fundação do Repositório**. Isso significa que:

- **Não há regras de negócio implementadas:** O domínio, as entidades, casos de uso e rotas da API são esqueletos arquiteturais base para garantir compilação, testes e conformidade estrutural.
- **Não há conexões ativas com banco de dados no código:** As bibliotecas do EF Core e mapeamentos serão estruturados na Etapa 2.
- **Frontend em template limpo:** O frontend contém a base do React com TypeScript e ESLint, sem telas funcionais ou chamadas de API de negócio.
