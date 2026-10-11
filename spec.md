# DataConform — Manifesto Inicial do Projeto

## 1. Papel e objetivo

Você atuará como um engenheiro de software sênior, responsável por estruturar a fundação técnica de um produto SaaS B2B chamado **DataConform**.

O produto tem como objetivo ajudar empresas a preparar arquivos e planilhas para importação em ERPs e outros sistemas empresariais, reduzindo erros, retrabalho e inconsistências nos dados.

O desenvolvimento deve seguir princípios de engenharia de software, com arquitetura organizada, código sustentável, segurança, testes automatizados e evolução incremental.

**Sua primeira responsabilidade não é implementar o produto completo. É estabelecer uma base técnica sólida e verificável para seu desenvolvimento.**

Leia todas as instruções antes de executar qualquer ação.

---

## 2. Visão do produto

### 2.1. Problema que queremos resolver

Empresas frequentemente precisam importar grandes volumes de dados por meio de planilhas ou arquivos estruturados. Antes da importação, esses arquivos podem apresentar problemas como:

- Campos obrigatórios ausentes.
- Registros duplicados.
- Formatos de data, números ou documentos inválidos.
- Valores inconsistentes.
- Colunas com nomes diferentes dos esperados pelo sistema de destino.
- Dados que não atendem às regras de negócio.
- Registros que precisam ser corrigidos manualmente antes da importação.

Esse processo pode consumir horas de trabalho e causar falhas durante a implantação ou operação de sistemas empresariais.

### 2.2. Proposta de valor

O DataConform deverá permitir que um usuário envie um arquivo, configure ou selecione regras de validação, identifique inconsistências e obtenha um relatório claro dos problemas encontrados.

A evolução planejada inclui:

1. Upload de planilhas e arquivos estruturados.
2. Validação de campos, formatos e regras configuráveis.
3. Identificação de registros duplicados e inconsistentes.
4. Mapeamento de colunas para o formato esperado pelo sistema de destino.
5. Relatório detalhado de erros e avisos.
6. Correção e transformação de dados.
7. Exportação de arquivos preparados para importação.
8. Gestão de projetos e histórico de validações.
9. Recursos comerciais para monetização B2B.

Esses recursos representam a visão futura do produto. **Eles não devem ser implementados nesta primeira etapa.**

### 2.3. Público-alvo inicial

- Consultorias de implantação de ERP.
- Empresas que realizam migrações de dados.
- Profissionais responsáveis por cadastros e integrações.
- Pequenas e médias empresas que importam dados frequentemente.
- Prestadores de serviços que precisam padronizar arquivos de clientes.

A prioridade é criar um produto simples, útil e comercializável, evitando complexidade prematura.

---

## 3. Regras fundamentais de execução

Estas regras são obrigatórias durante todo o desenvolvimento.

### 3.1. Desenvolvimento incremental

O projeto será executado em etapas independentes, com validação explícita ao final de cada uma.

- Execute somente a etapa atualmente autorizada.
- Não avance automaticamente para a próxima etapa.
- Ao concluir uma etapa, apresente um relatório e aguarde minha aprovação.
- Se encontrar um bloqueio, explique-o e aguarde orientação quando necessário.
- Não interprete o planejamento futuro como autorização para implementá-lo agora.

**Nesta execução, somente a Etapa 1 está autorizada.**

### 3.2. Não inventar requisitos

Não implemente funcionalidades que não foram solicitadas.

Não adicione bibliotecas, serviços, abstrações, módulos ou dependências sem necessidade justificada.

Quando houver uma decisão arquitetural relevante sem orientação explícita, prefira a alternativa mais simples, sustentável e compatível com os objetivos do produto.

Se a decisão puder afetar significativamente a arquitetura ou gerar retrabalho, registre a dúvida antes de prosseguir.

### 3.3. Preservação do ambiente

Antes de modificar arquivos:

- Inspecione a estrutura existente do diretório.
- Identifique arquivos, projetos e configurações já presentes.
- Verifique as versões das ferramentas disponíveis.
- Não sobrescreva arquivos existentes indiscriminadamente.
- Não apague conteúdo do usuário.
- Não execute comandos destrutivos sem autorização explícita.

Caso o diretório não esteja vazio, adapte o plano à situação encontrada e informe qualquer conflito relevante.

### 3.4. Qualidade

- Prefira soluções simples e explícitas.
- Mantenha separação clara de responsabilidades.
- Evite dependências desnecessárias entre camadas.
- Não introduza padrões arquiteturais apenas por formalidade.
- Considere segurança desde a fundação.
- Garanta que os comandos de validação realmente sejam executados.
- Nunca declare um build, teste ou serviço como funcional sem verificar seu resultado.

### 3.5. Segurança e confidencialidade

- Não grave senhas, tokens ou credenciais reais no repositório.
- Utilize variáveis de ambiente para configurações sensíveis.
- Não inclua segredos no README, nos arquivos de exemplo ou nos logs.
- Não utilize código, dados, credenciais, configurações internas ou informações confidenciais de outras empresas.
- Utilize exclusivamente recursos criados para este projeto ou devidamente autorizados.
- Não exponha serviços de infraestrutura à rede pública sem necessidade.

---

## 4. Stack tecnológica

Utilize as seguintes tecnologias como padrão inicial.

### 4.1. Backend

- C#.
- .NET 10 ou uma versão LTS posterior compatível com o ambiente, caso exista uma justificativa técnica para a atualização.
- ASP.NET Core Web API.
- Entity Framework Core.
- PostgreSQL.
- Swagger/OpenAPI para documentação da API.
- xUnit para testes automatizados.

Não atualize versões de forma arbitrária. Registre a versão escolhida e sua justificativa.

### 4.2. Frontend

- React.
- TypeScript.
- Vite.
- npm.
- ESLint.

Utilize a estrutura padrão e estável do ecossistema escolhido. Não adicione bibliotecas de componentes visuais, gerenciamento de estado ou roteamento sem necessidade nesta etapa.

### 4.3. Infraestrutura local

- Docker.
- Docker Compose.
- PostgreSQL executado em contêiner para desenvolvimento local.

O ambiente local deverá ser reproduzível, com configurações documentadas e sem dependência de serviços pagos para a inicialização básica.

### 4.4. Controle de versão

- Git.
- `.gitignore` adequado para .NET, Node.js, React, Docker e arquivos locais de configuração.

Não crie commits automaticamente.

---

## 5. Arquitetura do repositório

Adote inicialmente um monorepositório com backend e frontend separados.

Estrutura desejada:

    DataConform/
    ├── backend/
    │   ├── DataConform.sln
    │   ├── DataConform.Domain/
    │   ├── DataConform.Application/
    │   ├── DataConform.Infrastructure/
    │   ├── DataConform.Api/
    │   └── tests/
    │       └── DataConform.UnitTests/
    │
    ├── frontend/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── eslint.config.js
    │   └── src/
    │
    ├── docker-compose.yml
    ├── .env.example
    ├── .gitignore
    └── README.md

A estrutura poderá ser ajustada caso alguma incompatibilidade real seja encontrada, mas qualquer mudança relevante deverá ser explicada.

### 5.1. Domain

Responsável pelo núcleo do domínio e pelas regras de negócio.

No futuro, deverá conter entidades e conceitos de negócio sem depender de ASP.NET Core, Entity Framework Core ou detalhes de infraestrutura.

Nesta etapa, apenas crie e configure o projeto. Não implemente o domínio.

### 5.2. Application

Responsável pelos casos de uso, orquestração da aplicação e contratos necessários.

No futuro, deverá coordenar operações como criação de projetos, validação de arquivos e geração de relatórios.

Nesta etapa, apenas crie e configure o projeto.

### 5.3. Infrastructure

Responsável pelos detalhes técnicos externos, como persistência, acesso ao banco de dados e integrações.

No futuro, deverá implementar as abstrações de infraestrutura definidas pela aplicação.

Nesta etapa, apenas crie e configure o projeto.

### 5.4. Api

Responsável por expor os recursos HTTP do sistema e integrar a entrada de requisições com a camada Application.

Nesta etapa, crie somente o projeto base da API, com a configuração padrão necessária para compilar e iniciar.

Não implemente endpoints de negócio.

### 5.5. UnitTests

Responsável pelos testes automatizados das regras e comportamentos do sistema.

Nesta etapa, configure o projeto de testes com xUnit e referências adequadas.

Não crie testes fictícios que apenas aumentem a quantidade de arquivos sem verificar comportamento real. Se o template gerar um teste padrão, mantenha-o somente se estiver devidamente funcional.

---

## 6. Regras de dependência entre projetos

Mantenha a seguinte direção arquitetural:

- `DataConform.Domain`: não depende dos outros projetos da solução.
- `DataConform.Application`: pode depender de `DataConform.Domain`.
- `DataConform.Infrastructure`: pode depender de `DataConform.Application` e `DataConform.Domain`.
- `DataConform.Api`: pode depender de `DataConform.Application` e utilizar `DataConform.Infrastructure` para composição e configuração da aplicação.
- `DataConform.UnitTests`: pode referenciar os projetos necessários para testar o comportamento implementado.

Não crie dependências circulares.

Não force a criação de interfaces ou abstrações sem uma necessidade concreta nesta etapa.

---

## 7. Modelo de domínio planejado

Os conceitos abaixo fazem parte do planejamento futuro. Devem orientar a estrutura do produto, mas **não devem ser implementados na Etapa 1**.

### 7.1. Workspace

Representa um espaço de trabalho de uma empresa ou equipe.

Possíveis responsabilidades futuras:

- Agrupar projetos de importação.
- Separar dados entre organizações.
- Permitir a evolução para usuários, membros e permissões.
- Servir como base para funcionalidades comerciais.

### 7.2. ImportProject

Representa um projeto de preparação de dados para determinado processo de importação.

Exemplos:

- Importação de clientes.
- Importação de produtos.
- Importação de fornecedores.
- Migração de cadastros entre sistemas.

Possíveis responsabilidades futuras:

- Agrupar arquivos relacionados.
- Registrar configurações de validação.
- Manter histórico de execuções.
- Registrar o sistema ou formato de destino.

### 7.3. ImportFile

Representa um arquivo enviado para processamento.

Possíveis responsabilidades futuras:

- Armazenar metadados do arquivo.
- Registrar formato, tamanho e nome original.
- Controlar seu estado de processamento.
- Relacionar o arquivo a um projeto.
- Manter referências seguras ao armazenamento do arquivo.

Os arquivos enviados não deverão ser tratados como conteúdo confiável. Futuramente, será necessário considerar limites de tamanho, formatos permitidos, validação de conteúdo e proteção contra arquivos maliciosos.

### 7.4. ValidationIssue

Representa um problema ou aviso encontrado durante uma validação.

Possíveis atributos futuros:

- Arquivo relacionado.
- Linha ou registro afetado.
- Coluna relacionada.
- Código do problema.
- Descrição legível.
- Severidade.
- Valor encontrado, quando seguro e necessário.
- Orientação de correção.

### 7.5. Enumerações futuras

Avalie posteriormente enumerações para:

- Status de processamento.
- Severidade de inconsistências.
- Tipo de validação.
- Categoria de problema.

Não crie essas enumerações agora.

### 7.6. Considerações de modelagem

Os atributos descritos são hipóteses iniciais, não um contrato definitivo.

Antes de implementar o domínio, será necessário validar requisitos, cardinalidades, regras de negócio, retenção de dados, limites dos arquivos e estratégia de armazenamento.

Não crie tabelas, entidades, DbContext ou migrations nesta etapa.

---

## 8. Etapas planejadas do projeto

O projeto será desenvolvido nas etapas abaixo.

### Etapa 1 — Fundação do repositório

**Autorizada agora.**

Objetivo: preparar a estrutura mínima, reproduzível e verificável para o desenvolvimento.

Escopo:

1. Inspecionar o ambiente e o diretório atual.
2. Verificar as versões instaladas do .NET SDK, Node.js, npm, Git e Docker.
3. Identificar eventuais arquivos existentes e evitar sobrescrevê-los.
4. Criar a solução .NET.
5. Criar os quatro projetos principais do backend.
6. Criar o projeto de testes com xUnit.
7. Configurar as referências entre os projetos.
8. Criar o frontend React com TypeScript e Vite.
9. Configurar o ESLint conforme o template escolhido.
10. Criar o `docker-compose.yml` contendo somente o serviço do SQL Server.
11. Criar o `.env.example` sem credenciais reais.
12. Criar ou atualizar o `.gitignore`, preservando conteúdo existente.
13. Criar o README inicial com instruções de preparação do ambiente.
14. Executar as validações possíveis.
15. Relatar os resultados e aguardar aprovação.

Não implemente funcionalidades do produto nesta etapa.

### Etapa 2 — Fundação da aplicação e persistência

**Não autorizada ainda.**

Será considerada após minha aprovação da Etapa 1.

Escopo planejado:

- Configuração de injeção de dependência.
- Configuração inicial do EF Core.
- Integração com PostgreSQL.
- Definição inicial do modelo de domínio.
- Configuração de migrations.
- Convenções de persistência.
- Testes iniciais de integração, se necessários.

As decisões concretas serão tomadas somente quando essa etapa for autorizada.

### Etapa 3 — Primeiro fluxo funcional

**Não autorizada ainda.**

Possível escopo:

- Criação e consulta de projetos de importação.
- Upload controlado de arquivos.
- Validação básica de formato.
- Processamento inicial de planilhas.
- Registro de inconsistências.
- Geração de um relatório de validação.

O fluxo será definido com foco em entregar valor real sem introduzir complexidade prematura.

### Etapa 4 — Interface utilizável

**Não autorizada ainda.**

Possível escopo:

- Tela de projetos.
- Formulário de envio de arquivos.
- Exibição dos resultados de validação.
- Relatório de erros.
- Estados de carregamento e mensagens de erro.
- Interface responsiva e acessível.

### Etapa 5 — Produto comercial

**Não autorizada ainda.**

Possível escopo:

- Autenticação e autorização.
- Isolamento de dados por organização.
- Planos comerciais e limites de utilização.
- Armazenamento de arquivos adequado à produção.
- Observabilidade, auditoria e segurança.
- Deploy e configuração de ambientes.
- Documentação operacional.
- Validação com clientes reais.

Não implemente antecipadamente recursos dessas etapas.

---

## 9. Instruções detalhadas para executar a Etapa 1

### 9.1. Inspeção inicial

Antes de criar qualquer arquivo:

- Confirme o diretório de trabalho.
- Liste os arquivos e diretórios existentes.
- Verifique os SDKs e ferramentas disponíveis.
- Identifique eventuais incompatibilidades.
- Apresente uma estratégia de execução segura.

Se não houver bloqueios, prossiga com a Etapa 1. Não é necessário solicitar aprovação apenas para criar a estrutura inicial, pois essa etapa já está autorizada.

### 9.2. Backend

Crie a solução `DataConform.sln` em `backend/`.

Crie os projetos:

- `DataConform.Domain`
- `DataConform.Application`
- `DataConform.Infrastructure`
- `DataConform.Api`
- `tests/DataConform.UnitTests`

Utilize os templates oficiais apropriados e configure as referências conforme a arquitetura definida.

Execute a restauração das dependências e o build da solução.

Execute os testes automatizados existentes.

Não adicione entidades de negócio, repositórios, serviços de aplicação, DbContext, migrations ou endpoints funcionais.

### 9.3. Frontend

Inicialize o React com TypeScript e Vite em `frontend/`.

Utilize npm como gerenciador de pacotes.

Instale as dependências necessárias para o template e configure o ESLint.

Execute a instalação das dependências e o build de produção.

Não implemente páginas de negócio, rotas, autenticação, chamadas à API ou componentes funcionais do produto.

Preserve a estrutura padrão mínima do template.

### 9.4. PostgreSQL com Docker Compose

Crie um `docker-compose.yml` na raiz contendo somente o serviço do PostgreSQL.

Requisitos:

- Utilizar uma imagem oficial e uma versão explicitamente definida.
- Configurar as credenciais por variáveis de ambiente.
- Não inserir credenciais reais no repositório.
- Configurar um volume persistente para os dados locais.
- Adicionar um healthcheck, se suportado pela imagem escolhida.
- Documentar os pré-requisitos para inicialização.
- Evitar a exposição desnecessária do serviço à rede.
- Não adicionar Redis, RabbitMQ, Kafka, armazenamento de objetos ou outros serviços.

O `.env.example` deverá documentar as variáveis necessárias, utilizando somente valores ilustrativos e seguros.

Não crie automaticamente um arquivo `.env` com credenciais reais ou presumidamente seguras.

Caso o Docker não esteja disponível, não tente instalar ferramentas, alterar permissões do sistema ou modificar a configuração da máquina. Documente o bloqueio e execute as demais verificações possíveis.

### 9.5. README

Crie um README em português contendo:

- Nome e propósito do DataConform.
- Problema que o produto pretende resolver.
- Visão resumida da arquitetura.
- Pré-requisitos.
- Estrutura do repositório.
- Instruções para restaurar e compilar o backend.
- Instruções para executar os testes.
- Instruções para instalar e compilar o frontend.
- Instruções para preparar e iniciar o SQL Server local.
- Orientações para configurar variáveis de ambiente.
- Limitações atuais: projeto em fase de fundação, sem funcionalidades de negócio.

Não documente comandos que não foram testados como se estivessem comprovadamente funcionando. Diferencie comandos verificados daqueles que dependem de configuração adicional.

### 9.6. Git e arquivos ignorados

Crie ou ajuste o `.gitignore` para ignorar, quando aplicável:

- `bin/` e `obj/`.
- `node_modules/`.
- Builds gerados.
- Arquivos locais de ambiente.
- Segredos e credenciais.
- Logs temporários.
- Arquivos de configuração específicos da máquina.
- Dados e volumes locais do Docker.

Não ignore arquivos necessários para reproduzir o ambiente.

Não inicialize um repositório Git se isso exigir sobrescrever ou modificar um repositório existente sem necessidade. Não faça commits.

---

## 10. Critérios de aceitação da Etapa 1

A Etapa 1 somente deverá ser considerada concluída quando todos os critérios aplicáveis forem avaliados.

### Backend

- [ ] Solução criada no local correto.
- [ ] Quatro projetos principais criados.
- [ ] Projeto de testes criado.
- [ ] Referências entre projetos configuradas corretamente.
- [ ] Dependências restauradas.
- [ ] Build executado com sucesso, ou falhas documentadas.
- [ ] Testes executados, ou limitações documentadas.

### Frontend

- [ ] Projeto React com TypeScript criado.
- [ ] Vite configurado.
- [ ] npm configurado.
- [ ] ESLint configurado.
- [ ] Dependências instaladas.
- [ ] Build de produção executado com sucesso, ou falhas documentadas.

### Infraestrutura e documentação

- [ ] `docker-compose.yml` criado com somente SQL Server.
- [ ] Variáveis de ambiente documentadas em `.env.example`.
- [ ] Nenhuma credencial real adicionada aos arquivos.
- [ ] `.gitignore` adequado.
- [ ] README com instruções iniciais.
- [ ] Configuração do Docker validada, se Docker estiver disponível.
- [ ] Saúde do contêiner verificada, se for possível iniciar o serviço.
- [ ] Nenhum arquivo existente foi sobrescrito indevidamente.
- [ ] Nenhuma funcionalidade de negócio foi implementada.

Os itens não executáveis por limitações do ambiente devem ser identificados explicitamente, com a causa e os comandos que faltam executar.

---

## 11. Relatório obrigatório ao final

Ao terminar a Etapa 1, apresente um relatório objetivo com:

1. **Resumo:** o que foi criado.
2. **Estrutura:** diretórios e projetos gerados.
3. **Decisões técnicas:** versões escolhidas e justificativas relevantes.
4. **Validações:** comandos executados e resultados reais.
5. **Bloqueios:** problemas encontrados e o que não foi possível validar.
6. **Arquivos importantes:** lista dos arquivos de configuração criados.
7. **Próxima etapa:** descrição resumida do que poderá ser feito após minha aprovação.

Não declare que tudo está funcionando se alguma verificação não foi realizada.

Não prossiga para a Etapa 2.

**Ao finalizar o relatório, pare a execução e aguarde minha autorização explícita para continuar.**

---

## 12. Instrução final

Comece inspecionando o ambiente e o diretório atual. Em seguida, execute exclusivamente a Etapa 1, respeitando todas as regras deste manifesto.

Não implemente funcionalidades de negócio.

Não antecipe etapas futuras.

Não faça alterações destrutivas.

Não invente resultados de validação.

**O objetivo desta primeira execução é deixar o DataConform com uma fundação técnica limpa, organizada, compilável e documentada, pronta para evoluir de maneira controlada.**

Ao terminar, apresente o relatório final e aguarde minha aprovação.