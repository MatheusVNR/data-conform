# 📋 Relatório de Homologação: Regras de Negócio e Particularidades de ERP

**Data:** 23 de Outubro de 2026  
**Auditor / Persona:** Carlos Eduardo (37 anos, Líder Técnico de Implantação e Migração de Dados ERP)  
**Avaliador Técnico:** Tech Lead & Arquiteto de Software DataConform  
**Escopo:** Avaliação estrita das regras de negócio, validações gerais e particularidades de templates de ERP (TOTVS Protheus, SAP B1, SAP S/4HANA, Senior, Sankhya, Omie e ContaAzul).

---

## 🎯 Parte 1: Homologação aos Olhos da Persona (Carlos Eduardo)

> *"Como consultor sênior com mais de 15 anos de estrada em implantações de Protheus, SAP e Sankhya, o meu maior terror em um fim de semana de virada de sistema (Cutover) é subir uma base de 50.000 clientes ou itens de estoque e o importador do ERP travar na linha 4.823 por causa de um CNPJ com dígito incorreto, uma UF preenchida como 'São Paulo' em vez de 'SP', ou um NCM com 7 dígitos. O importador padrão de qualquer ERP é burro: ele não sanitiza, ele apenas aborta ou cria registros corrompidos na base.*  
> 
> *Fiz um raio-x rigoroso nas regras de negócio atuais do DataConform para verificar se o produto realmente me protege dos erros que custam a virada de um projeto."*

---

### 1.1 Avaliação das Validações Gerais e Estruturais

| Regra / Funcionalidade | Comportamento Observado | Veredito da Persona | Impacto no Projeto ERP |
| :--- | :--- | :--- | :--- |
| **Detecção de Delimitador (`;`, `,`, `\t`)** | Identifica perfeitamente arquivos exportados tanto pelo Excel BR (ponto-e-vírgula) quanto por dumps de banco de dados RFC 4180 (vírgula). | **Excelente (10/10)** | Evita que o arquivo seja lido como uma coluna única gigante. |
| **Auditoria de Encoding / UTF-8 (`\uFFFD`)** | Detecta corrupção gerada por conversões ANSI/Windows-1252 para UTF-8 no cabeçalho ou linhas. | **Excelente (10/10)** | Impede nomes de clientes e produtos com caracteres deformados (`JOO`, `ACAR`). |
| **Detecção de Registros Duplicados Exatos** | Alerta em nível `Warning` linhas idênticas no lote. | **Muito Bom (9/10)** | Protege contra duplicidade de carga em tabelas de catálogo e cadastrais. |
| **Divergência de Contagem de Colunas (`COLUMN_COUNT_MISMATCH`)** | Aponta imediatamente linhas com mais ou menos separadores que o cabeçalho. | **Excelente (10/10)** | Erro fatal típico de campos de texto livre com quebra de linha interna ou delimitador não escapado. |
| **Colunas Obrigatórias Faltantes (`REQUIRED_HEADER_MISSING`)** | Rejeita o lote se o layout do ERP selecionado não contiver as colunas mandatórias. | **Excelente (10/10)** | Evita disparar rotinas de importação sem chaves primárias do sistema. |

---

### 1.2 Avaliação das Regras Semânticas e Fiscais de ERP

| Domínio de Regra | Regra do DataConform | Teste de Carga da Persona | Feedback da Persona |
| :--- | :--- | :--- | :--- |
| **Documentos Fiscais (CPF / CNPJ)** | Algoritmo Módulo 11 da Receita Federal com checagem de 11 e 14 dígitos e bloqueio de sequências (`00000000000`). | Testado com `A1_CGC` (Protheus), `LicTradNum` (SAP B1), `TaxId0` (S/4HANA), `CgcCpf` (Senior), `CGC_CPF` (Sankhya), `cnpj_cpf`. | **Perfeito.** Pegou exatamente o CNPJ falso com dígito final alterado (`12.345.678/0001-00`). O ERP rejeitaria isso no SEFAZ. |
| **E-mails Corporativos** | Validação sintática por Regex RFC (presença de `@` e domínio válido). | Testado com `A1_EMAIL`, `E_Mail`, `EmaCli`, `EMAIL`. | **Aprovado.** Identificou e-mails sem arroba ou sem domínio (`email-sem-arroba.com`). |
| **Valores Financeiros e Limites de Crédito** | Normalização de moeda brasileira (`R$`, separadores de milhar e decimal), bloqueio de valores negativos. | Testado com `A1_LC` (Protheus), `CreditLine` (SAP), `VlrLim` (Senior), `LIMCRED` (Sankhya). | **Aprovado.** Valores como `R$ 85.000,50` foram convertidos corretamente e `-4500.00` foi barrado com erro explicativo. |
| **Datas** | Formatos ISO (`yyyy-MM-dd`) e pt-BR (`dd/MM/yyyy`). | Testado com `ValidFrom`, `data_vencimento`, `A1_DTNASC`. | **Aprovado.** Pegou datas textuais inválidas (`data-errada`). |

---

### 1.3 Gargalos Críticos e Lacunas Identificadas pela Persona

Apesar de o motor ser extremamente robusto, identifiquei **5 pontos cegos nas regras de negócio** que são cruciais para quem vive o dia a dia de ERP:

1. **Ausência de Validação de UF (Estados Brasileiros):**
   - *O problema:* Em cadastros de Clientes/Fornecedores (`A1_EST`, `A2_EST`, `UF`, `Estado`), o consultor frequentemente recebe planilhas com `São Paulo`, `SP `, `XX`, ou vazio. No ERP, isso passa na carga inicial se o campo for texto, mas **inviabiliza a emissão de NF-e na SEFAZ e quebra o SPED Fiscal**. A regra deve exigir estritamente as 27 siglas de estados brasileiros (`SP`, `RJ`, `MG`, etc.) ou `EX` (Exterior).
2. **Ausência de Validação de CEP:**
   - *O problema:* Campos de CEP (`A1_CEP`, `A2_CEP`, `CEP`, `ZipCode`) precisam ter exatamente 8 dígitos numéricos (com ou sem hífen `XXXXX-XXX`). CEPs com 7 dígitos (quando o Excel come o zero à esquerda) travam o cálculo automático de frete e validações de endereço de Protheus e SAP B1.
3. **Ausência de Validação de NCM (Nomenclatura Comum do Mercosul):**
   - *O problema:* Quando migramos **Catálogo de Produtos / Itens** (`SB1` Protheus com `B1_POSIPI`, `OITM` SAP B1, `TGFPRO` Sankhya), o NCM deve ter obrigatoriamente 8 dígitos numéricos. NCM com 6 ou 7 dígitos é a causa nº 1 de rejeição de lote na virada fiscal de estoque.
4. **Validação de Telefone / Celular:**
   - *O problema:* Colunas como `A1_TEL`, `Telefone`, `Phone1`, `Celular` devem ter entre 10 e 11 dígitos numéricos com DDD. Telefones com 8 dígitos sem DDD quebram rotinas de WhatsApp e CRM integradas ao ERP.
5. **Dicionários Específicos para Outras Tabelas Além de Clientes:**
   - *O problema:* Hoje os templates padrões focam na tabela de Clientes/Parceiros (`SA1`, `OCRD`, `TGFPAR`). Mas migração de ERP tem pelo menos mais 2 grandes lotes: **Fornecedores** (`SA2` Protheus, `E095FOR` Senior) e **Produtos/Itens** (`SB1` Protheus, `OITM` SAP B1, `TGFPRO` Sankhya). O sistema deve fornecer presets claros para esses módulos.

---

## 🛠️ Parte 2: Avaliação do Tech Lead & Analista de Negócios

> *"Como Tech Lead, avaliei o parecer do Carlos Eduardo sob as óticas de: viabilidade técnica, performance em streaming de memória, manutenibilidade e diretrizes de arquitetura (Zero `var` em C#, Zero `any` em TypeScript, sem dependências externas pesadas)."*

### 2.1 Decisões de Escopo e Arquitetura

| Item Proposto pela Persona | Decisão Técnica | Justificativa Arquitetural |
| :--- | :--- | :--- |
| **1. Validação de UF (Estados + EX)** | **APROVADO PARA EXECUÇÃO IMEDIATA** | Implementação puramente em memória (`HashSet<string>` estático com as 27 UFs + `EX`), complexidade $O(1)$, zero impacto de performance. Identifica colunas contendo `_est`, `uf`, `estado`, `codest`, `state` (ignorando palavras como `status`). |
| **2. Validação de CEP (8 Dígitos)** | **APROVADO PARA EXECUÇÃO IMEDIATA** | Sanitização rápida extraindo apenas dígitos (`char.IsDigit`). Se tiver menos ou mais que 8 dígitos, emite `INVALID_CEP_FORMAT`. |
| **3. Validação de NCM Fiscal (8 Dígitos)** | **APROVADO PARA EXECUÇÃO IMEDIATA** | Indispensável para cargas de produtos (`B1_POSIPI`, `NCM`, `NcmCode`). Valida se o NCM possui exatamente 8 dígitos numéricos (com ou sem formatação de pontos). |
| **4. Validação de Telefone / Celular BR** | **APROVADO PARA EXECUÇÃO IMEDIATA** | Extrai dígitos numéricos de colunas de telefone (`A1_TEL`, `A2_TEL`, `Telefone`, `Phone1`). Valida se contém 10 ou 11 dígitos com DDD válido (11 a 99). |
| **5. Expansão dos Dicionários de ERP (Produtos & Fornecedores)** | **APROVADO PARA EXECUÇÃO IMEDIATA** | Adicionar presets dedicados no catálogo de templates (`TOTVS Protheus - SA2 Fornecedores`, `TOTVS Protheus - SB1 Produtos`, `SAP Business One - OITM Itens`, etc.) e enriquecer a lista de colunas reconhecidas pelo motor. |
| **6. Consulta Externa em Tempo Real na Receita Federal** | **REJEITADO / ROADMAP FUTURO** | Consultar a SEFAZ/Receita via API em tempo real para um lote de 50.000 linhas causaria rate limiting, custo de requisição e travaria o streaming de validação. A auditoria algorítmica Módulo 11 em memória é instantânea e suficiente para pré-carga. |

---

## ⚡ Parte 3: Plano de Execução Técnica

1. **Backend (`DataConform.Application/Services/CsvValidatorService.cs`):**
   - Implementar conjunto imutável de UFs válidas brasileiras: `AC`, `AL`, `AP`, `AM`, `BA`, `CE`, `DF`, `ES`, `GO`, `MA`, `MT`, `MS`, `MG`, `PA`, `PB`, `PR`, `PE`, `PI`, `RJ`, `RN`, `RS`, `RO`, `RR`, `SC`, `SP`, `SE`, `TO`, `EX`.
   - Adicionar rotina de validação semântica para:
     - UF (`INVALID_UF_CODE`).
     - CEP (`INVALID_CEP_FORMAT`).
     - NCM (`INVALID_NCM_FORMAT`).
     - Telefone (`INVALID_PHONE_FORMAT`).
     - Fornecedores (`A2_CGC`, `A2_EMAIL`, `A2_LC`, `A2_EST`).
     - Produtos / Itens (`B1_COD`, `B1_DESC`, `B1_POSIPI`, `B1_PRV1`, `SalUnitMsr`, `Price`).
   - Manter uso estrito de tipos C# (proibido `var`).
2. **Testes Unitários (`DataConform.UnitTests/Services/CsvValidatorServiceTests.cs`):**
   - Criar baterias de testes para validação de UF, CEP, NCM, Telefones e múltiplos layouts de ERP.
   - Garantir 100% dos testes aprovados com `dotnet test`.
3. **Frontend (`frontend/src/types/index.ts` e componentes):**
   - Adicionar presets de layouts de Fornecedores e Produtos para Protheus e SAP B1.
   - Garantir tipagem TypeScript estrita sem `any`.
   - Executar `npm run build`.
4. **Homologação e Deploy:**
   - Commit e envio para a branch principal.
