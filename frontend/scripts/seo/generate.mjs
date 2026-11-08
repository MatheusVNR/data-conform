import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ERP_SEO_PAGES } from './erp-pages.mjs';
import { RULE_SEO_PAGES } from './rule-pages.mjs';
import { ALL_BACKEND_RULES_SUMMARY, PRICING_PLANS } from './hub-pages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..', '..');
const publicDir = path.join(frontendRoot, 'public');

const SITE_ORIGIN = 'https://dataconform.com.br';
const OG_IMAGE_URL = `${SITE_ORIGIN}/og/dataconform-og.png`;
const TODAY_ISO = '2026-11-02';
const SUPPORT_EMAIL = (process.env.VITE_SUPPORT_EMAIL || '').trim();

function escapeHtml(raw) {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildFaqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

function renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects }) {
  const jsonLdScripts = jsonLdObjects
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n    ');

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(metaDescription)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="DataConform" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(metaDescription)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${OG_IMAGE_URL}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="DataConform — Pré-validação de planilhas CSV para ERPs" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />
    <meta name="twitter:image" content="${OG_IMAGE_URL}" />
    <link rel="stylesheet" href="/seo.css" />
    ${jsonLdScripts}
    <script>
      (function() {
        try {
          var p = new URLSearchParams(window.location.search);
          var s = p.get('utm_source');
          var m = p.get('utm_medium');
          var c = p.get('utm_campaign');
          var ct = p.get('utm_content');
          var e = p.get('erp');
          var r = document.referrer || '';
          var item = {
            path: window.location.pathname,
            referrer: r,
            utmSource: s || undefined,
            utmMedium: m || undefined,
            utmCampaign: c || undefined,
            utmContent: ct || undefined,
            erp: e || undefined,
            timestamp: new Date().toISOString()
          };
          if (!localStorage.getItem('dc_first_touch')) {
            localStorage.setItem('dc_first_touch', JSON.stringify(item));
          }
          sessionStorage.setItem('dc_last_touch', JSON.stringify(item));
        } catch (err) {}
      })();
    </script>
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "dataconform_analytics"}'></script>
  </head>`;
}

function renderTopHeader(ctaHref) {
  return `  <header class="seo-navbar">
    <div class="seo-container seo-navbar-inner">
      <a href="/" class="seo-brand" aria-label="DataConform - Página Inicial">
        <img src="/favicon.svg" alt="Logo DataConform" width="32" height="32" />
        <span class="seo-brand-title">DataConform</span>
        <span class="seo-brand-badge">Validador CSV ERP</span>
      </a>
      <nav class="seo-nav-links" aria-label="Navegação Principal">
        <a href="/layouts-de-importacao-erp/">Layouts de ERP</a>
        <a href="/regras-de-validacao-csv/">Regras de Validação</a>
        <a href="/precos/">Preços</a>
        <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary seo-btn-sm">Validar meu arquivo grátis</a>
      </nav>
    </div>
  </header>`;
}

function renderBreadcrumbs(items) {
  const listHtml = items
    .map((item, idx) => {
      const isLast = idx === items.length - 1;
      if (isLast) {
        return `<li aria-current="page">${escapeHtml(item.name)}</li>`;
      }
      return `<li><a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a></li>`;
    })
    .join('\n          ');

  return `      <nav class="seo-breadcrumbs" aria-label="Breadcrumb">
        <ol>
          ${listHtml}
        </ol>
      </nav>`;
}

function renderFooter() {
  const topErpLinks = ERP_SEO_PAGES.slice(0, 5)
    .map((p) => `<li><a href="/${p.slug}/">${escapeHtml(p.systemName)} (${escapeHtml(p.tableCode)})</a></li>`)
    .join('\n            ');
  const moreErpLinks = ERP_SEO_PAGES.slice(5)
    .map((p) => `<li><a href="/${p.slug}/">${escapeHtml(p.systemName)} (${escapeHtml(p.tableCode)})</a></li>`)
    .join('\n            ');
  const ruleLinks = RULE_SEO_PAGES.map(
    (r) => `<li><a href="/${r.slug}/">${escapeHtml(r.shortTitle)}</a></li>`
  ).join('\n            ');

  return `  <footer class="seo-footer">
    <div class="seo-container">
      <div class="seo-footer-grid">
        <div class="seo-footer-col">
          <strong>DataConform</strong>
          <p>Plataforma SaaS de pré-validação e homologação de arquivos CSV antes da importação em sistemas ERP. Diagnóstico linha a linha com exportação CSV e laudo em PDF.</p>
          <p class="seo-footer-links-inline">
            <a href="/">Início &amp; Simulador</a> •
            <a href="/layouts-de-importacao-erp/">Layouts ERP</a> •
            <a href="/regras-de-validacao-csv/">Regras CSV</a> •
            <a href="/precos/">Preços</a> •
            <a href="/termos/">Termos de Uso</a> •
            <a href="/privacidade/">Privacidade (LGPD)</a>
          </p>
        </div>
        <div class="seo-footer-col">
          <strong>Layouts por ERP (Parte 1)</strong>
          <ul>
            ${topErpLinks}
          </ul>
        </div>
        <div class="seo-footer-col">
          <strong>Layouts por ERP (Parte 2)</strong>
          <ul>
            ${moreErpLinks}
          </ul>
        </div>
        <div class="seo-footer-col">
          <strong>Regras de Validação CSV</strong>
          <ul>
            ${ruleLinks}
          </ul>
        </div>
      </div>
      <div class="seo-footer-bottom">
        <span>© 2026 DataConform. Software independente sem vínculo ou endosso oficial de TOTVS®, SAP®, Senior®, Sankhya®, Omie® ou ContaAzul®.</span>
        <span>Conformidade RFC 4180 • Validação Fiscal e Cadastral para ERPs</span>
      </div>
    </div>
  </footer>`;
}

function findRuleBySlug(slug) {
  return RULE_SEO_PAGES.find((r) => r.slug === slug);
}

function findErpBySlug(slug) {
  return ERP_SEO_PAGES.find((e) => e.slug === slug);
}

function buildErpPageHtml(page) {
  const canonicalUrl = `${SITE_ORIGIN}/${page.slug}/`;
  const ctaHref = `/?erp=${encodeURIComponent(page.shortKey)}#sandbox`;

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Layouts de Importação ERP', path: '/layouts-de-importacao-erp/', url: `${SITE_ORIGIN}/layouts-de-importacao-erp/` },
    { name: `${page.systemName} — ${page.tableCode}`, path: `/${page.slug}/`, url: canonicalUrl },
  ];

  const jsonLdObjects = [
    buildBreadcrumbJsonLd(breadcrumbItems),
    buildFaqJsonLd(page.faqs),
  ];

  const purposeHtml = page.purposeParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n          ');

  const columnsRowsHtml = page.requiredColumns
    .map(
      (col) => `              <tr>
                <td><code>${escapeHtml(col.name)}</code></td>
                <td>${escapeHtml(col.description)}</td>
                <td><code>${escapeHtml(col.example)}</code></td>
                <td><span class="seo-code-pill">${escapeHtml(col.ruleCode)}</span></td>
              </tr>`
    )
    .join('\n');

  const errorsHtml = page.commonErrors
    .map(
      (err) => `          <div class="seo-card">
            <div class="seo-card-header">
              <span class="seo-code-pill seo-code-error">${escapeHtml(err.code)}</span>
              <span class="seo-field-tag">Campo: <code>${escapeHtml(err.field)}</code></span>
            </div>
            <h3>${escapeHtml(err.title)}</h3>
            <p>${escapeHtml(err.detail)}</p>
          </div>`
    )
    .join('\n');

  const stepsHtml = page.steps
    .map(
      (step, i) => `          <li class="seo-step-item">
            <span class="seo-step-num">${i + 1}</span>
            <div>
              <strong>Passo ${i + 1}</strong>
              <p>${escapeHtml(step)}</p>
            </div>
          </li>`
    )
    .join('\n');

  const faqsHtml = page.faqs
    .map(
      (faq) => `          <div class="seo-faq-item">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`
    )
    .join('\n');

  const relatedRulesHtml = page.relatedRules
    .map((slug) => findRuleBySlug(slug))
    .filter(Boolean)
    .map(
      (rule) =>
        `<li><a href="/${rule.slug}/"><strong>${escapeHtml(rule.shortTitle)}</strong> (${escapeHtml(rule.issueCode)})</a></li>`
    )
    .join('\n              ');

  const relatedErpsHtml = page.relatedErps
    .map((slug) => findErpBySlug(slug))
    .filter(Boolean)
    .map(
      (erp) =>
        `<li><a href="/${erp.slug}/"><strong>${escapeHtml(erp.systemName)}</strong> — ${escapeHtml(erp.moduleReference)}</a></li>`
    )
    .join('\n              ');

  return `${renderHead({
    title: page.title,
    metaDescription: page.metaDescription,
    canonicalUrl,
    jsonLdObjects,
  })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">${escapeHtml(page.systemName)}</span>
              <span class="seo-pill-outline">${escapeHtml(page.moduleReference)}</span>
            </div>
            <h1>${escapeHtml(page.h1)}</h1>
            <p class="seo-lead">${escapeHtml(page.lead)}</p>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/layouts-de-importacao-erp/" class="seo-btn seo-btn-secondary">Ver todos os layouts de ERP</a>
            </div>
          </header>

          <section class="seo-section">
            <h2>Para que serve o layout ${escapeHtml(page.tableCode)} no ${escapeHtml(page.systemName)}</h2>
            ${purposeHtml}
          </section>

          <section class="seo-section">
            <h2>Tabela de Colunas Sugeridas no Perfil (${escapeHtml(page.tableCode)})</h2>
            <p>O perfil de referência do DataConform para <strong>${escapeHtml(page.systemName)}</strong> inspeciona as seguintes colunas no cabeçalho da planilha CSV (arquivo de exemplo: <code>${escapeHtml(page.sampleFileName)}</code>), lembrando que a obrigatoriedade final no ERP pode variar conforme versão e parametrização local:</p>
            <div class="seo-table-wrap">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Coluna Obrigatória</th>
                    <th>Descrição Técnica no ERP</th>
                    <th>Exemplo Válido</th>
                    <th>Regra Aplicada no DataConform</th>
                  </tr>
                </thead>
                <tbody>
${columnsRowsHtml}
                </tbody>
              </table>
            </div>
          </section>

          <section class="seo-section">
            <h2>Exemplo de Estrutura CSV de Referência (${escapeHtml(page.sampleFileName)})</h2>
            <p>Abaixo está a estrutura real do arquivo CSV utilizado pelo DataConform para homologar cargas deste módulo, incluindo linhas íntegras e linhas de teste para captura de inconsistências:</p>
            <pre class="seo-code-block"><code>${escapeHtml(page.sampleCsvContent)}</code></pre>
          </section>

          <section class="seo-section">
            <h2>Erros Mais Comuns na Importação do ${escapeHtml(page.systemName)} e Regras do DataConform</h2>
            <p>Durante a preparação da carga de dados, os seguintes desvios costumam bloquear a importação no ERP e são interceptados automaticamente pelo motor de validação:</p>
            <div class="seo-cards-grid">
${errorsHtml}
            </div>
          </section>

          <section class="seo-section">
            <h2>Passo a Passo para Validar sua Planilha antes da Carga no ERP</h2>
            <ol class="seo-steps-list">
${stepsHtml}
            </ol>
          </section>

          <section class="seo-section">
            <h2>Perguntas Frequentes (FAQ) — Importação ${escapeHtml(page.systemName)}</h2>
            <div class="seo-faq-list">
${faqsHtml}
            </div>
          </section>

          <section class="seo-cta-banner">
            <div>
              <h2>Pronto para homologar sua planilha do ${escapeHtml(page.systemName)}?</h2>
              <p>Teste agora mesmo no simulador interativo sem cadastro ou crie sua conta gratuita no plano Starter (até 5 arquivos/mês de 500 linhas e laudo em PDF).</p>
            </div>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/precos/" class="seo-btn seo-btn-secondary">Conhecer planos e limites</a>
            </div>
          </section>

          <aside class="seo-related-box" aria-label="Conteúdos Relacionados">
            <div class="seo-related-col">
              <h3>Regras de Validação Aplicadas neste Layout</h3>
              <ul>
                ${relatedRulesHtml}
              </ul>
            </div>
            <div class="seo-related-col">
              <h3>Outros Layouts de Importação ERP</h3>
              <ul>
                ${relatedErpsHtml}
                <li><a href="/layouts-de-importacao-erp/"><strong>Ver todos os 10 presets de ERP →</strong></a></li>
              </ul>
            </div>
          </aside>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildRulePageHtml(rule) {
  const canonicalUrl = `${SITE_ORIGIN}/${rule.slug}/`;
  const ctaHref = '/#sandbox';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Regras de Validação CSV', path: '/regras-de-validacao-csv/', url: `${SITE_ORIGIN}/regras-de-validacao-csv/` },
    { name: rule.shortTitle, path: `/${rule.slug}/`, url: canonicalUrl },
  ];

  const jsonLdObjects = [
    buildBreadcrumbJsonLd(breadcrumbItems),
    buildFaqJsonLd(rule.faqs),
  ];

  const problemHtml = rule.problemParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n          ');
  const howItWorksHtml = rule.howItWorksParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n          ');

  const detectedColsHtml = rule.detectedColumns
    .map((c) => `<span class="seo-col-chip">${escapeHtml(c)}</span>`)
    .join('\n              ');

  const examplesRowsHtml = rule.examples
    .map(
      (ex) => `              <tr>
                <td><code>${escapeHtml(ex.rawValue)}</code></td>
                <td><span class="seo-code-pill ${ex.status.startsWith('Válido') ? 'seo-code-ok' : 'seo-code-error'}">${escapeHtml(ex.status)}</span></td>
                <td>${escapeHtml(ex.explanation)}</td>
              </tr>`
    )
    .join('\n');

  const stepsHtml = rule.steps
    .map(
      (step, i) => `          <li class="seo-step-item">
            <span class="seo-step-num">${i + 1}</span>
            <div>
              <strong>Passo ${i + 1}</strong>
              <p>${escapeHtml(step)}</p>
            </div>
          </li>`
    )
    .join('\n');

  const faqsHtml = rule.faqs
    .map(
      (faq) => `          <div class="seo-faq-item">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`
    )
    .join('\n');

  const relatedRulesHtml = rule.relatedRules
    .map((slug) => findRuleBySlug(slug))
    .filter(Boolean)
    .map(
      (r) =>
        `<li><a href="/${r.slug}/"><strong>${escapeHtml(r.shortTitle)}</strong> (${escapeHtml(r.issueCode)})</a></li>`
    )
    .join('\n              ');

  const relatedErpsHtml = rule.relatedErps
    .map((slug) => findErpBySlug(slug))
    .filter(Boolean)
    .map(
      (erp) =>
        `<li><a href="/${erp.slug}/"><strong>${escapeHtml(erp.systemName)}</strong> (${escapeHtml(erp.tableCode)})</a></li>`
    )
    .join('\n              ');

  return `${renderHead({
    title: rule.title,
    metaDescription: rule.metaDescription,
    canonicalUrl,
    jsonLdObjects,
  })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Código: ${escapeHtml(rule.issueCode)}</span>
              <span class="seo-pill-outline">Severidade: ${escapeHtml(rule.severity)}</span>
            </div>
            <h1>${escapeHtml(rule.h1)}</h1>
            <p class="seo-lead">${escapeHtml(rule.lead)}</p>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/regras-de-validacao-csv/" class="seo-btn seo-btn-secondary">Ver todas as 17 regras</a>
            </div>
          </header>

          <section class="seo-section">
            <h2>Por que esse erro acontece na planilha CSV e trava o ERP</h2>
            ${problemHtml}
          </section>

          <section class="seo-section">
            <h2>Como o Motor do DataConform Executa a Regra <code>${escapeHtml(rule.issueCode)}</code></h2>
            ${howItWorksHtml}
            <div class="seo-detected-box">
              <h3>Colunas e Dicionários Inspecionados Automaticamente:</h3>
              <div class="seo-chips-wrap">
                ${detectedColsHtml}
              </div>
            </div>
          </section>

          <section class="seo-section">
            <h2>Exemplos Práticos: Valores Aprovados vs. Valores Rejeitados</h2>
            <p>Confira como o validador classifica diferentes entradas encontradas em planilhas reais durante a auditoria:</p>
            <div class="seo-table-wrap">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Valor na Célula / Linha CSV</th>
                    <th>Resultado no Laudo</th>
                    <th>Explicação Técnica</th>
                  </tr>
                </thead>
                <tbody>
${examplesRowsHtml}
                </tbody>
              </table>
            </div>
          </section>

          <section class="seo-section">
            <h2>Passo a Passo para Auditar e Sanear sua Planilha</h2>
            <ol class="seo-steps-list">
${stepsHtml}
            </ol>
          </section>

          <section class="seo-section">
            <h2>Perguntas Frequentes (FAQ) — ${escapeHtml(rule.shortTitle)}</h2>
            <div class="seo-faq-list">
${faqsHtml}
            </div>
          </section>

          <section class="seo-cta-banner">
            <div>
              <h2>Audite sua planilha CSV contra o erro <code>${escapeHtml(rule.issueCode)}</code> agora mesmo</h2>
              <p>Experimente o simulador interativo na página inicial ou valide até 5 arquivos por mês gratuitamente no plano Starter com exportação de inconsistências e laudo em PDF.</p>
            </div>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/precos/" class="seo-btn seo-btn-secondary">Consultar planos e cotas</a>
            </div>
          </section>

          <aside class="seo-related-box" aria-label="Links Relacionados">
            <div class="seo-related-col">
              <h3>Outras Regras de Alta Intenção</h3>
              <ul>
                ${relatedRulesHtml}
                <li><a href="/regras-de-validacao-csv/"><strong>Ver catálogo completo das 17 regras →</strong></a></li>
              </ul>
            </div>
            <div class="seo-related-col">
              <h3>Layouts de ERP que Utilizam esta Regra</h3>
              <ul>
                ${relatedErpsHtml}
              </ul>
            </div>
          </aside>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildLayoutsHubHtml() {
  const slug = 'layouts-de-importacao-erp';
  const canonicalUrl = `${SITE_ORIGIN}/${slug}/`;
  const ctaHref = '/#sandbox';
  const title = 'Layouts de Importação ERP em CSV: TOTVS Protheus, SAP, Senior, Sankhya, Omie | DataConform';
  const metaDescription =
    'Catálogo de layouts e dicionários de dados CSV para importação em ERPs: TOTVS Protheus (SA1/SA2/SB1), SAP Business One (OCRD/OITM), SAP S/4HANA, Senior, Sankhya, Omie e ContaAzul.';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Layouts de Importação ERP', path: `/${slug}/`, url: canonicalUrl },
  ];

  const faqs = [
    {
      question: 'Quais ERPs possuem presets nativos no DataConform?',
      answer:
        'São 10 presets nativos (TOTVS Protheus SA1, SA2 e SB1, SAP Business One OCRD e OITM, SAP S/4HANA BP, Senior E085CLI, Sankhya TGFPAR, Omie e ContaAzul) mais o layout Genérico / CSV.',
    },
    {
      question: 'Posso baixar uma planilha modelo CSV para cada ERP?',
      answer:
        'Sim. Cada preset disponibiliza para download imediato um arquivo CSV de exemplo em UTF-8 contendo o cabeçalho de referência e linhas demonstrativas.',
    },
    {
      question: 'É possível customizar as colunas obrigatórias ao validar um arquivo?',
      answer:
        'Sim. O DataConform pré-carrega as colunas obrigatórias do ERP escolhido, permitindo adicionar ou ajustar nomes de colunas conforme sua implantação.',
    },
  ];

  const jsonLdObjects = [
    buildBreadcrumbJsonLd(breadcrumbItems),
    buildFaqJsonLd(faqs),
  ];

  const tableRowsHtml = ERP_SEO_PAGES.map(
    (erp) => `              <tr>
                <td><strong>${escapeHtml(erp.systemName)}</strong></td>
                <td>${escapeHtml(erp.moduleReference)}</td>
                <td><code>${escapeHtml(erp.requiredColumns.map((c) => c.name).join(', '))}</code></td>
                <td><a href="/${erp.slug}/">Ver layout e regras →</a></td>
              </tr>`
  ).join('\n');

  const cardsHtml = ERP_SEO_PAGES.map(
    (erp) => `          <div class="seo-card">
            <div class="seo-card-header">
              <span class="seo-code-pill">${escapeHtml(erp.systemName)}</span>
              <span class="seo-field-tag"><code>${escapeHtml(erp.sampleFileName)}</code></span>
            </div>
            <h3><a href="/${erp.slug}/">${escapeHtml(erp.tableCode)} — ${escapeHtml(erp.systemName)}</a></h3>
            <p>${escapeHtml(erp.moduleReference)}.</p>
            <div class="seo-card-actions">
              <a href="/${erp.slug}/" class="seo-btn seo-btn-secondary seo-btn-sm">Guia do layout</a>
              <a href="/?erp=${encodeURIComponent(erp.shortKey)}#sandbox" class="seo-btn seo-btn-primary seo-btn-sm">Simulador</a>
            </div>
          </div>`
  ).join('\n');

  const faqsHtml = faqs
    .map(
      (faq) => `          <div class="seo-faq-item">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`
    )
    .join('\n');

  return `${renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Hub de Dicionários de Dados</span>
              <span class="seo-pill-outline">10 Presets de ERP + Genérico RFC 4180</span>
            </div>
            <h1>Layouts de Importação ERP em CSV: Dicionários de Dados e Colunas Obrigatórias</h1>
            <p class="seo-lead">Consulte a estrutura técnica das planilhas de carga para TOTVS Protheus, SAP Business One, SAP S/4HANA, Senior ERP, Sankhya, Omie e ContaAzul. Homologue seus arquivos CSV linha a linha antes de executar a importação definitiva no banco de dados.</p>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/regras-de-validacao-csv/" class="seo-btn seo-btn-secondary">Conhecer as 18 regras de validação</a>
            </div>
          </header>

          <section class="seo-section">
            <h2>Por que Homologar o Layout CSV Antes da Carga no ERP</h2>
            <p>Projetos de migração e cargas cadastrais atrasam quando as planilhas não respeitam o dicionário técnico do ERP. Uma coluna ausente, um CNPJ com zero à esquerda suprimido pelo Excel ou um NCM de 7 dígitos interrompem rotinas como o CRMA980/MATA030/MATA010 do TOTVS Protheus, o DTW do SAP Business One e o Migration Cockpit do SAP S/4HANA.</p>
            <p>Ao selecionar o ERP de destino no DataConform, a plataforma verifica todas as colunas configuradas no perfil e aplica validações fiscais em cada célula, gerando laudo em PDF e exportação CSV das inconsistências.</p>
          </section>

          <section class="seo-section">
            <h2>Tabela Comparativa dos Perfis de Importação por ERP</h2>
            <div class="seo-table-wrap">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Sistema ERP</th>
                    <th>Tabela / Objeto e Rotina</th>
                    <th>Colunas Obrigatórias no Preset</th>
                    <th>Documentação Completa</th>
                  </tr>
                </thead>
                <tbody>
${tableRowsHtml}
                  <tr>
                    <td><strong>Genérico / CSV</strong></td>
                    <td>Padrão Corporativo B2B (RFC 4180)</td>
                    <td><code>codigo_cliente, razao_social, cnpj_cpf, email, valor_limite_credito, uf, cep</code></td>
                    <td><a href="/#sandbox">Testar no Simulador →</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="seo-section">
            <h2>Guias Detalhados por Sistema ERP e Tabela</h2>
            <p>Escolha abaixo o layout correspondente à sua rotina de importação para consultar a tabela detalhada de campos, exemplos de arquivos CSV e os erros mais comuns bloqueados pelo DataConform:</p>
            <div class="seo-cards-grid">
${cardsHtml}
            </div>
          </section>

          <section class="seo-section">
            <h2>Perguntas Frequentes (FAQ) — Layouts de Importação ERP</h2>
            <div class="seo-faq-list">
${faqsHtml}
            </div>
          </section>

          <section class="seo-cta-banner">
            <div>
              <h2>Valide suas planilhas de migração ERP em segundos</h2>
              <p>Experimente gratuitamente no simulador interativo ou crie sua conta no plano Starter Gratuito para auditar até 5 arquivos por mês.</p>
            </div>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/precos/" class="seo-btn seo-btn-secondary">Ver planos Starter, Professional e Enterprise</a>
            </div>
          </section>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildRulesHubHtml() {
  const slug = 'regras-de-validacao-csv';
  const canonicalUrl = `${SITE_ORIGIN}/${slug}/`;
  const ctaHref = '/#sandbox';
  const title = 'Regras de Validação CSV e Conformidade Fiscal para ERPs | DataConform';
  const metaDescription =
    'Conheça as 18 regras reais de validação estrutural (RFC 4180) e fiscal do DataConform: CPF/CNPJ (Módulo 11), NCM, CEP, UF, UTF-8, chave primária e delimitadores.';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Regras de Validação CSV', path: `/${slug}/`, url: canonicalUrl },
  ];

  const faqs = [
    {
      question: 'Como o DataConform sabe qual regra aplicar em cada coluna da planilha CSV?',
      answer:
        'O motor combina duas camadas: primeiro valida as colunas obrigatórias definidas para o projeto/ERP (`REQUIRED_HEADER_MISSING` e `REQUIRED_FIELD_MISSING`). Em seguida, analisa o nome de cada coluna do cabeçalho — reconhecendo tanto nomes genéricos (`cpf`, `cnpj`, `email`, `cep`, `uf`, `ncm`, `valor`, `data`, `telefone`) quanto nomes técnicos de dicionários de ERP (`A1_CGC`, `B1_POSIPI`, `LicTradNum`, `NcmCode`, `TaxId0`, `CgcCpf`, `EmaCli`, `VlrLim`, `LIMCRED`).',
    },
    {
      question: 'O DataConform protege contra arquivos binários renomeados e injeção de fórmulas em CSV?',
      answer:
        'Sim. A plataforma bloqueia o envio de arquivos binários disfarçados de CSV (como planilhas .xlsx ou .pdf apenas renomeadas para .csv) e sanitiza a exportação de relatórios para evitar ataques de CSV Formula Injection.',
    },
    {
      question: 'Qual a diferença entre apontamentos com severidade "Erro" e severidade "Aviso"?',
      answer:
        'Apontamentos de Erro indicam desvios que impedem a importação ou corrompem regras fiscais (como CNPJ inválido, coluna obrigatória ausente ou quebra de delimitador). Avisos (como `EMPTY_HEADER_NAME` e `DUPLICATE_ROW`) alertam sobre anomalias estruturais ou duplicidades de linhas no lote.',
    },
  ];

  const jsonLdObjects = [
    buildBreadcrumbJsonLd(breadcrumbItems),
    buildFaqJsonLd(faqs),
  ];

  const allRulesTableHtml = ALL_BACKEND_RULES_SUMMARY.map(
    (r) => `              <tr>
                <td><code>${escapeHtml(r.code)}</code></td>
                <td><span class="seo-code-pill ${r.severity === 'Erro' ? 'seo-code-error' : ''}">${escapeHtml(r.severity)}</span></td>
                <td>${escapeHtml(r.category)}</td>
                <td>${escapeHtml(r.description)}</td>
              </tr>`
  ).join('\n');

  const cardsHtml = RULE_SEO_PAGES.map(
    (r) => `          <div class="seo-card">
            <div class="seo-card-header">
              <span class="seo-code-pill seo-code-error">${escapeHtml(r.issueCode)}</span>
              <span class="seo-field-tag">${escapeHtml(r.severity)}</span>
            </div>
            <h3><a href="/${r.slug}/">${escapeHtml(r.shortTitle)}</a></h3>
            <div class="seo-card-actions">
              <a href="/${r.slug}/" class="seo-btn seo-btn-secondary seo-btn-sm">Ler guia técnico</a>
              <a href="/#sandbox" class="seo-btn seo-btn-primary seo-btn-sm">Simulador</a>
            </div>
          </div>`
  ).join('\n');

  const faqsHtml = faqs
    .map(
      (faq) => `          <div class="seo-faq-item">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`
    )
    .join('\n');

  return `${renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Motor de Auditoria CSV</span>
              <span class="seo-pill-outline">18 Códigos de Verificação Nativos</span>
            </div>
            <h1>Regras de Validação CSV: Conformidade Estrutural (RFC 4180) e Fiscal para ERPs</h1>
            <p class="seo-lead">Conheça em detalhes todas as 18 regras executadas pelo motor do DataConform para auditar planilhas cadastrais, fiscais, financeiras e de estoque antes da importação no seu sistema ERP.</p>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/layouts-de-importacao-erp/" class="seo-btn seo-btn-secondary">Ver layouts por ERP</a>
            </div>
          </header>

          <section class="seo-section">
            <h2>Arquitetura de Validação Estrutural e Semântica</h2>
            <p>Cargas CSV falham por corrupção estrutural (encoding fora de UTF-8, vírgulas fora de aspas ou cabeçalhos repetidos) e por inconsistência semântica (CNPJ inválido, NCM incompleto, UF inexistente, limite negativo ou chave primária duplicada).</p>
            <p>O DataConform processa o CSV em streaming, detecta delimitadores automaticamente, aplica hash XxHash64 e valida os dicionários TOTVS Protheus, SAP, Senior, Sankhya, Omie e ContaAzul.</p>
          </section>

          <section class="seo-section">
            <h2>Guias Aprofundados por Regra de Alta Intenção</h2>
            <p>Explore abaixo os guias técnicos detalhados com exemplos de valores aprovados e rejeitados para as principais dores de importação de planilhas:</p>
            <div class="seo-cards-grid">
${cardsHtml}
            </div>
          </section>

          <section class="seo-section">
            <h2>Catálogo Completo dos 18 Códigos de Erro e Aviso do DataConform</h2>
            <div class="seo-table-wrap">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Código da Regra (IssueCode)</th>
                    <th>Severidade</th>
                    <th>Categoria</th>
                    <th>O que o Validador Inspeciona</th>
                  </tr>
                </thead>
                <tbody>
${allRulesTableHtml}
                </tbody>
              </table>
            </div>
          </section>

          <section class="seo-section">
            <h2>Perguntas Frequentes (FAQ) — Motor de Regras DataConform</h2>
            <div class="seo-faq-list">
${faqsHtml}
            </div>
          </section>

          <section class="seo-cta-banner">
            <div>
              <h2>Audite sua planilha contra as 18 regras em segundos</h2>
              <p>Use o simulador gratuito sem cadastro ou crie sua conta no plano Starter para validar seus próprios arquivos CSV e emitir laudos em PDF.</p>
            </div>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/precos/" class="seo-btn seo-btn-secondary">Ver planos e capacidade</a>
            </div>
          </section>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildPricingPageHtml() {
  const slug = 'precos';
  const canonicalUrl = `${SITE_ORIGIN}/${slug}/`;
  const ctaHref = '/#sandbox';
  const title = 'Preços e Planos DataConform: Starter Grátis, Professional e Enterprise';
  const metaDescription =
    'Conheça os planos reais do DataConform para validação de CSV e homologação de carga em ERPs: Starter Gratuito (R$ 0), Professional (R$ 79,90/mês) e Enterprise (R$ 249,90/mês).';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Preços e Planos', path: `/${slug}/`, url: canonicalUrl },
  ];

  const faqs = [
    {
      question: 'O plano Starter é gratuito e sem cartão de crédito?',
      answer:
        'Sim. O plano Starter é 100% gratuito (R$ 0/mês), não exige cartão no cadastro e inclui até 5 arquivos validados por mês (até 500 linhas e 5 MB por arquivo), com acesso a todos os presets de ERP, às regras fiscais e ao laudo preliminar em PDF.',
    },
    {
      question: 'Como funciona o pagamento, cancelamento e reembolso dos planos pagos?',
      answer:
        'O upgrade é self-service com pagamento via cartão de crédito processado pela Stripe (PCI-DSS Nível 1), sem taxa de setup nem fidelidade. Ao cancelar, o acesso pago segue ativo até o fim do período já faturado, com garantia integral de reembolso em até 7 dias corridos da contratação inicial (Art. 49 do CDC).',
    },
    {
      question: 'Há diferença nas regras ou nos ERPs suportados entre os planos?',
      answer:
        'Não. Todos os planos incluem os 10 presets de ERP, todas as 18 regras de validação, exportação CSV de erros e laudo PDF (com versão executiva oficial sem marca d\'água e Termo de Aceite nos planos pagos).',
    },
    {
      question: 'Qual plano escolher para migrações de médio ou grande porte?',
      answer:
        'Para planilhas de até 15.000 linhas (25 MB) e 500 arquivos/mês, escolha o Professional (R$ 79,90/mês). Para bases de até 1.000.000 de linhas por arquivo (50 MB) e 10.000 arquivos/mês, escolha o Enterprise (R$ 249,90/mês).',
    },
  ];

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DataConform',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE_ORIGIN}/`,
    description:
      'Plataforma SaaS de pré-validação de arquivos CSV antes da importação em sistemas ERP (TOTVS Protheus, SAP Business One, SAP S/4HANA, Senior, Sankhya, Omie, ContaAzul).',
    offers: PRICING_PLANS.map((plan) => ({
      '@type': 'Offer',
      name: `Plano ${plan.tier}`,
      price: plan.priceValue,
      priceCurrency: 'BRL',
      description: `${plan.monthlyFilesQuota}, ${plan.maxRowsPerFile}, ${plan.maxFileSizeMb}.`,
      url: canonicalUrl,
    })),
  };

  const jsonLdObjects = [
    buildBreadcrumbJsonLd(breadcrumbItems),
    softwareAppJsonLd,
    buildFaqJsonLd(faqs),
  ];

  const pricingCardsHtml = PRICING_PLANS.map(
    (plan) => `          <div class="seo-card seo-plan-card ${plan.highlight ? 'seo-plan-highlight' : ''}">
            <div class="seo-card-header">
              <span class="seo-code-pill ${plan.highlight ? 'seo-code-ok' : ''}">${escapeHtml(plan.badge)}</span>
            </div>
            <h3>Plano ${escapeHtml(plan.tier)}</h3>
            <div class="seo-plan-price">
              <strong>${escapeHtml(plan.priceLabel)}</strong>
              <span>${escapeHtml(plan.periodLabel)}</span>
            </div>
            <p>${escapeHtml(plan.description)}</p>
            <ul class="seo-plan-specs">
              <li><strong>Cota mensal:</strong> ${escapeHtml(plan.monthlyFilesQuota)}</li>
              <li><strong>Limite de linhas:</strong> ${escapeHtml(plan.maxRowsPerFile)}</li>
              <li><strong>Tamanho máximo:</strong> ${escapeHtml(plan.maxFileSizeMb)}</li>
              <li><strong>Lote simultâneo:</strong> ${escapeHtml(plan.maxConcurrentFiles)}</li>
            </ul>
            <ul class="seo-plan-features">
              ${plan.features.map((f) => `<li>✓ ${escapeHtml(f)}</li>`).join('\n              ')}
            </ul>
            <div class="seo-card-actions">
              <a href="/#sandbox" class="seo-btn ${plan.highlight ? 'seo-btn-primary' : 'seo-btn-secondary'}">Começar com ${escapeHtml(plan.tier)}</a>
            </div>
          </div>`
  ).join('\n');

  const faqsHtml = faqs
    .map(
      (faq) => `          <div class="seo-faq-item">
            <h3>${escapeHtml(faq.question)}</h3>
            <p>${escapeHtml(faq.answer)}</p>
          </div>`
    )
    .join('\n');

  return `${renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Transparência Comercial</span>
              <span class="seo-pill-outline">Self-Service • Comece Grátis</span>
            </div>
            <h1>Preços e Planos DataConform: Capacidade Operacional sob Medida para sua Migração ERP</h1>
            <p class="seo-lead">Comece gratuitamente no plano Starter sem cartão de crédito e escale para os planos Professional ou Enterprise conforme o volume de linhas e arquivos CSV da sua operação.</p>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/layouts-de-importacao-erp/" class="seo-btn seo-btn-secondary">Ver ERPs suportados</a>
            </div>
          </header>

          <section class="seo-section">
            <h2>Escolha o Plano Ideal para o Volume das suas Planilhas CSV</h2>
            <div class="seo-cards-grid seo-pricing-grid">
${pricingCardsHtml}
            </div>
          </section>

          <section class="seo-section">
            <h2>Comparativo de Limites Operacionais por Plano</h2>
            <p>Todos os planos contam com as 18 regras de validação, os 10 presets de ERP, exportação CSV de erros e emissão de laudo em PDF:</p>
            <div class="seo-table-wrap">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Recurso / Capacidade</th>
                    <th>Starter (Gratuito)</th>
                    <th>Professional (R$ 79,90/mês)</th>
                    <th>Enterprise (R$ 249,90/mês)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Investimento Mensal</strong></td>
                    <td><strong>R$ 0,00 (Gratuito)</strong></td>
                    <td><strong>R$ 79,90 / mês</strong></td>
                    <td><strong>R$ 249,90 / mês</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Cota Mensal de Uploads</strong></td>
                    <td>5 arquivos</td>
                    <td>500 arquivos</td>
                    <td>10.000 arquivos</td>
                  </tr>
                  <tr>
                    <td><strong>Linhas por Arquivo CSV</strong></td>
                    <td>Até 500 linhas</td>
                    <td>Até 15.000 linhas</td>
                    <td>Até 1.000.000 de linhas</td>
                  </tr>
                  <tr>
                    <td><strong>Tamanho Máximo por Arquivo</strong></td>
                    <td>Até 5 MB</td>
                    <td>Até 25 MB</td>
                    <td>Até 50 MB</td>
                  </tr>
                  <tr>
                    <td><strong>Arquivos Simultâneos por Lote</strong></td>
                    <td>Até 2 arquivos</td>
                    <td>Até 5 arquivos</td>
                    <td>Até 10 arquivos</td>
                  </tr>
                  <tr>
                    <td><strong>Presets Nativos de ERP (10 + Genérico)</strong></td>
                    <td>Incluso</td>
                    <td>Incluso</td>
                    <td>Incluso</td>
                  </tr>
                  <tr>
                    <td><strong>Exportação CSV de Inconsistências e Laudo PDF</strong></td>
                    <td>Incluso</td>
                    <td>Incluso</td>
                    <td>Incluso</td>
                  </tr>
                  <tr>
                    <td><strong>Forma de Contratação</strong></td>
                    <td>Cadastro imediato sem cartão</td>
                    <td>Cartão de crédito via Stripe</td>
                    <td>Cartão de crédito via Stripe</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="seo-section">
            <h2>Incluso em Todos os Planos</h2>
            <ul class="seo-bullet-list">
              <li><strong>Presets ERP:</strong> <a href="/layout-importacao-protheus-sa1-clientes/">Protheus</a>, <a href="/layout-importacao-sap-business-one-ocrd-parceiros/">SAP B1</a>, <a href="/layout-importacao-sap-s4hana-business-partner/">S/4HANA</a>, <a href="/layout-importacao-senior-erp-e085cli-clientes/">Senior</a>, <a href="/layout-importacao-sankhya-tgfpar-parceiros/">Sankhya</a>, <a href="/layout-importacao-omie-clientes/">Omie</a> e <a href="/layout-importacao-contaazul-clientes/">ContaAzul</a>.</li>
              <li><strong>18 Regras:</strong> <a href="/validar-cpf-cnpj-em-massa-csv/">CPF/CNPJ</a>, <a href="/validar-ncm-planilha-csv/">NCM</a>, <a href="/validar-cep-em-lote-csv/">CEP</a>, <a href="/validar-uf-estado-planilha-csv/">UF</a>, <a href="/validar-email-em-lote-planilha-csv/">e-mail</a>, <a href="/erro-encoding-utf8-caracteres-estranhos-csv/">UTF-8</a>, <a href="/erro-colunas-delimitador-quebrado-csv/">delimitadores</a> e <a href="/remover-identificar-linhas-duplicadas-csv/">duplicidades</a>.</li>
              <li><strong>Exportação e PDF:</strong> Download CSV de inconsistências e laudo PDF para aceite de carga.</li>
            </ul>
          </section>

          <section class="seo-section">
            <h2>Perguntas Frequentes (FAQ) — Preços, Cobrança e Limites</h2>
            <div class="seo-faq-list">
${faqsHtml}
            </div>
          </section>

          <section class="seo-cta-banner">
            <div>
              <h2>Comece pelo Plano Starter Gratuito hoje mesmo</h2>
              <p>Teste o simulador interativo na página inicial ou crie sua conta gratuita em segundos para auditar suas planilhas CSV reais.</p>
            </div>
            <div class="seo-cta-row">
              <a href="${escapeHtml(ctaHref)}" class="seo-btn seo-btn-primary">Validar meu arquivo grátis</a>
              <a href="/regras-de-validacao-csv/" class="seo-btn seo-btn-secondary">Explorar regras de validação</a>
            </div>
          </section>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildTermsPageHtml() {
  const slug = 'termos';
  const canonicalUrl = `${SITE_ORIGIN}/${slug}/`;
  const ctaHref = '/#sandbox';
  const title = 'Termos de Uso, Assinatura e Política de Reembolso | DataConform';
  const metaDescription =
    'Consulte os Termos de Uso do DataConform: escopo técnico da pré-validação CSV para ERPs, planos Starter, Professional e Enterprise, cobrança via Stripe, cancelamento sem fidelidade e reembolso em 7 dias (CDC Art. 49).';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Termos de Uso', path: `/${slug}/`, url: canonicalUrl },
  ];

  const jsonLdObjects = [buildBreadcrumbJsonLd(breadcrumbItems)];
  const supportContactHtml = SUPPORT_EMAIL
    ? `pelo e-mail institucional <strong>${escapeHtml(SUPPORT_EMAIL)}</strong> ou pelo Canal de Suporte e Atendimento disponível no rodapé da aplicação web`
    : 'diretamente pelo <strong>Canal de Suporte e Atendimento</strong> disponível no rodapé da aplicação web em <a href="/">dataconform.com.br</a>';

  return `${renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Governança Contratual</span>
              <span class="seo-pill-outline">Atualizado em Novembro de 2026</span>
            </div>
            <h1>Termos de Uso, Licenciamento SaaS e Política de Cancelamento e Reembolso</h1>
            <p class="seo-lead">Estes Termos de Uso regulam o acesso e a utilização da plataforma SaaS DataConform por empresas, consultorias de implantação, escritórios de BPO e profissionais técnicos em operações de pré-validação de arquivos CSV.</p>
          </header>

          <section class="seo-section">
            <h2>1. Objeto e Escopo Técnico da Plataforma</h2>
            <p>O DataConform fornece software como serviço (SaaS) voltado à auditoria sintática (norma RFC 4180), estrutural e semântica de arquivos em texto delimitado (<code>.csv</code> e <code>.txt</code>) antes de sua importação em sistemas de gestão empresarial (ERP).</p>
            <p>Os perfis de validação disponibilizados na plataforma constituem modelos técnicos de referência baseados na documentação pública de mercado. O laudo emitido pelo DataConform atesta exclusivamente a conformidade matemática e estrutural das regras inspecionadas (como dígitos verificadores Módulo 11 de CPF/CNPJ, CEP, UF, NCM, formato de datas, valores numéricos e chaves repetidas), cabendo integralmente ao usuário e ao responsável pela implantação validar parametrizações fiscais, versões, gatilhos customizados e backups no ambiente ERP de destino antes da carga definitiva.</p>
          </section>

          <section class="seo-section">
            <h2>2. Planos, Cotas Operacionais e Isolamento de Workspaces</h2>
            <p>O uso da plataforma organiza-se em três faixas transparentes de capacidade mensal por organização: <strong>Starter</strong> (gratuito, até 5 arquivos/mês, 500 linhas e 5 MB por arquivo, limitado a 1 Workspace por titular), <strong>Professional</strong> (R$ 79,90/mês, até 500 arquivos/mês, 15.000 linhas e 25 MB por arquivo, 1 Workspace) e <strong>Enterprise</strong> (R$ 249,90/mês, até 10.000 arquivos/mês, 1.000.000 de linhas e 50 MB por arquivo, até 10 Workspaces segregados).</p>
            <p>É vedado compartilhar credenciais de acesso com terceiros não autorizados, automatizar cadastros múltiplos para contornar limites gratuitos ou submeter arquivos contendo código malicioso.</p>
          </section>

          <section class="seo-section">
            <h2>3. Cobrança Segura via Stripe, Cancelamento e Reembolso (CDC Art. 49)</h2>
            <p>Os pagamentos recorrentes dos planos Professional e Enterprise são processados exclusivamente pela <strong>Stripe</strong> (certificação PCI-DSS Nível 1), sem armazenamento de números completos de cartão ou códigos CVV nos servidores do DataConform. Não há taxa de adesão nem prazo mínimo de fidelidade.</p>
            <p><strong>Cancelamento sem multa:</strong> o titular pode solicitar o cancelamento da renovação automática a qualquer momento no painel de planos ou no Portal do Cliente Stripe. Após o cancelamento da renovação, os recursos contratados permanecem integralmente ativos até a data de encerramento do ciclo mensal já pago, retornando automaticamente ao plano gratuito Starter ao término do período.</p>
            <p><strong>Direito de arrependimento (7 dias):</strong> em conformidade com o Art. 49 da Lei nº 8.078/1990 (Código de Defesa do Consumidor), o contratante pode solicitar o reembolso integral (100%) do valor pago em até 7 (sete) dias corridos contados da contratação inicial da assinatura, bastando registrar o pedido em nosso canal oficial de suporte.</p>
          </section>

          <section class="seo-section">
            <h2>4. Propriedade Intelectual e Independência de Marcas</h2>
            <p>Todo o código-fonte, layout visual, motor de validação e identidade DataConform pertencem aos seus titulares legais, enquanto os arquivos e dados submetidos permanecem sob titularidade exclusiva do cliente. <strong>Aviso de independência:</strong> TOTVS®, Protheus®, SAP®, SAP Business One®, SAP S/4HANA®, Senior®, Sankhya®, Omie® e ContaAzul® são marcas registradas de seus respectivos proprietários. O DataConform é uma solução tecnológica independente e não possui vínculo societário, parceria comercial ou homologação oficial dessas fabricantes.</p>
          </section>

          <section class="seo-section">
            <h2>5. Suporte Técnico, Atendimento Comercial e Foro</h2>
            <p>Solicitações técnicas, dúvidas de faturamento, pedidos de reembolso e comunicações contratuais são atendidos ${supportContactHtml}, com prazo padrão de resposta de até 1 (um) dia útil. Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
          </section>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildPrivacyPageHtml() {
  const slug = 'privacidade';
  const canonicalUrl = `${SITE_ORIGIN}/${slug}/`;
  const ctaHref = '/#sandbox';
  const title = 'Política de Privacidade, Segurança e Governança LGPD | DataConform';
  const metaDescription =
    'Política de Privacidade do DataConform conforme a LGPD (Lei nº 13.709/2018): papéis de Controlador e Operador, expurgo físico do CSV bruto em até 24h, retenção de laudos e direitos dos titulares.';

  const breadcrumbItems = [
    { name: 'Início', path: '/', url: `${SITE_ORIGIN}/` },
    { name: 'Política de Privacidade (LGPD)', path: `/${slug}/`, url: canonicalUrl },
  ];

  const jsonLdObjects = [buildBreadcrumbJsonLd(breadcrumbItems)];
  const dpoContactHtml = SUPPORT_EMAIL
    ? `pelo canal dedicado <strong>${escapeHtml(SUPPORT_EMAIL)}</strong> ou pelo formulário de Atendimento Comercial / LGPD integrado à plataforma`
    : 'pelo <strong>Canal de Suporte e Atendimento (categoria Comercial / LGPD)</strong> disponível diretamente na plataforma em <a href="/">dataconform.com.br</a>';

  return `${renderHead({ title, metaDescription, canonicalUrl, jsonLdObjects })}
  <body>
${renderTopHeader(ctaHref)}
    <main class="seo-main">
      <div class="seo-container">
${renderBreadcrumbs(breadcrumbItems)}
        <article class="seo-article">
          <header class="seo-hero">
            <div class="seo-badge-row">
              <span class="seo-pill-primary">Conformidade LGPD</span>
              <span class="seo-pill-outline">Lei Federal nº 13.709/2018</span>
            </div>
            <h1>Política de Privacidade, Proteção de Dados e Retenção Efêmera</h1>
            <p class="seo-lead">Esta Política descreve de forma clara e objetiva como o DataConform coleta, processa, protege e elimina dados pessoais e corporativos durante o uso da plataforma de pré-validação de planilhas CSV.</p>
          </header>

          <section class="seo-section">
            <h2>1. Papéis na LGPD: Controlador e Operador</h2>
            <p>Nos termos do Art. 5º, incisos VI e VII, e do Art. 39 da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), o cliente ou organização usuária atua como <strong>Controlador</strong> dos dados contidos nas planilhas submetidas para homologação, cabendo-lhe definir a base legal para o tratamento cadastral. O DataConform atua estritamente como <strong>Operador</strong> técnico em relação ao conteúdo das planilhas auditadas e como Controlador apenas quanto aos dados cadastrais da conta do próprio usuário (nome, e-mail corporativo, hash de senha e histórico de faturamento).</p>
          </section>

          <section class="seo-section">
            <h2>2. Ciclo de Vida, Retenção e Expurgo de Arquivos e Laudos</h2>
            <p>Aplicamos o princípio da minimização de dados (Art. 6º, III da LGPD) com separação estrita entre o arquivo bruto e o relatório técnico:</p>
            <ul class="seo-bullet-list">
              <li><strong>Simulador interativo na página inicial:</strong> executa 100% localmente na memória do navegador do visitante; nenhum arquivo testado no simulador é transmitido aos servidores do DataConform.</li>
              <li><strong>Arquivos CSV e TXT brutos em projetos autenticados:</strong> são lidos em streaming para execução das regras determinísticas e <strong>expurgados fisicamente do armazenamento efêmero em até 24 (vinte e quatro) horas</strong> após o envio — ou imediatamente no instante em que o usuário aciona o botão <em>Excluir</em> no arquivo ou no projeto.</li>
              <li><strong>Relatórios de conformidade no Workspace:</strong> para permitir auditoria e exportação pelo cliente, o banco de dados retém os contadores do lote e até 1.000 apontamentos de inconsistência por arquivo (incluindo número da linha, coluna, código da regra e trecho do valor rejeitado), os quais permanecem segregados no Workspace até sua exclusão pelo próprio titular.</li>
            </ul>
          </section>

          <section class="seo-section">
            <h2>3. Zero Compartilhamento Comercial e Zero Uso em Inteligência Artificial</h2>
            <p>O motor do DataConform é 100% determinístico e algorítmico. Os dados das planilhas (CNPJs, CPFs, razões sociais, endereços, e-mails e limites financeiros) <strong>jamais</strong> são comercializados, cedidos a parceiros de marketing ou transmitidos para APIs externas de modelos de linguagem (LLMs / Inteligência Artificial).</p>
            <p>Utilizamos exclusivamente suboperadores essenciais de infraestrutura em nuvem com criptografia em trânsito (TLS 1.2/1.3): processamento de pagamentos via Stripe (PCI-DSS Nível 1), banco de dados gerenciado PostgreSQL com conexão SSL obrigatória, hospedagem de aplicação containerizada e proteção de borda DNS/CDN via Cloudflare, além de atribuição própria sem cookies invasivos de terceiros.</p>
          </section>

          <section class="seo-section">
            <h2>4. Segurança Técnica e Isolamento Multi-Tenant</h2>
            <p>Adotamos medidas técnicas e administrativas alinhadas ao Art. 46 da LGPD para proteger os dados contra acessos não autorizados, incluindo derivação criptográfica de senhas (PBKDF2-SHA256 com salt aleatório), autenticação JWT assinada, isolamento lógico estrito por Workspace, proteção contra injeção de fórmulas em planilhas CSV, limitação de requisições por endereço IP e registro em trilha de auditoria das operações administrativas.</p>
          </section>

          <section class="seo-section">
            <h2>5. Direitos dos Titulares e Canal de Privacidade</h2>
            <p>Em cumprimento ao Art. 18 da LGPD, o titular ou representante legal pode solicitar confirmação de tratamento, acesso, correção cadastral, portabilidade ou eliminação integral de sua conta e Workspaces ${dpoContactHtml}. As requisições são respondidas com prioridade e transparência dentro dos prazos legais.</p>
          </section>
        </article>
      </div>
    </main>
${renderFooter()}
  </body>
</html>`;
}

function buildSeoCss() {
  return `/* DataConform Static SEO Pages Shared Stylesheet */
:root {
  --seo-primary: #2563eb;
  --seo-primary-hover: #1d4ed8;
  --seo-primary-light: #eff6ff;
  --seo-primary-border: #bfdbfe;
  --seo-text-main: #0f172a;
  --seo-text-muted: #475569;
  --seo-bg-page: #f8fafc;
  --seo-bg-card: #ffffff;
  --seo-bg-subtle: #f1f5f9;
  --seo-border: #e2e8f0;
  --seo-border-strong: #cbd5e1;
  --seo-error-bg: #fef2f2;
  --seo-error-border: #fecaca;
  --seo-error-text: #b91c1c;
  --seo-ok-bg: #ecfdf5;
  --seo-ok-border: #a7f3d0;
  --seo-ok-text: #047857;
  --seo-radius-sm: 6px;
  --seo-radius-md: 10px;
  --seo-radius-lg: 14px;
  --seo-shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);
  --seo-shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
}

@media (prefers-color-scheme: dark) {
  :root {
    --seo-primary: #3b82f6;
    --seo-primary-hover: #2563eb;
    --seo-primary-light: rgba(59, 130, 246, 0.15);
    --seo-primary-border: rgba(59, 130, 246, 0.35);
    --seo-text-main: #f1f5f9;
    --seo-text-muted: #94a3b8;
    --seo-bg-page: #0b1120;
    --seo-bg-card: #111827;
    --seo-bg-subtle: #1e293b;
    --seo-border: #1e293b;
    --seo-border-strong: #334155;
    --seo-error-bg: rgba(239, 68, 68, 0.14);
    --seo-error-border: rgba(239, 68, 68, 0.35);
    --seo-error-text: #f87171;
    --seo-ok-bg: rgba(16, 185, 129, 0.14);
    --seo-ok-border: rgba(16, 185, 129, 0.35);
    --seo-ok-text: #34d399;
  }
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--seo-bg-page);
  color: var(--seo-text-main);
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a {
  color: var(--seo-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.86em;
  background-color: var(--seo-bg-subtle);
  border: 1px solid var(--seo-border);
  padding: 0.12rem 0.38rem;
  border-radius: 4px;
}

.seo-container {
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
  padding: 0 1.25rem;
}

/* Navbar */
.seo-navbar {
  background-color: var(--seo-bg-card);
  border-bottom: 1px solid var(--seo-border);
  padding: 0.85rem 0;
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: var(--seo-shadow-sm);
}

.seo-navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.seo-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--seo-text-main);
  text-decoration: none !important;
}

.seo-brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.seo-brand-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  background-color: var(--seo-primary-light);
  color: var(--seo-primary);
  border: 1px solid var(--seo-primary-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.seo-nav-links {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  flex-wrap: wrap;
  font-size: 0.88rem;
  font-weight: 600;
}

.seo-nav-links a:not(.seo-btn) {
  color: var(--seo-text-muted);
}

.seo-nav-links a:not(.seo-btn):hover {
  color: var(--seo-text-main);
  text-decoration: none;
}

/* Buttons */
.seo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.6rem 1.2rem;
  border-radius: var(--seo-radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none !important;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.seo-btn-primary {
  background: linear-gradient(135deg, var(--seo-primary) 0%, var(--seo-primary-hover) 100%);
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}

.seo-btn-primary:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.seo-btn-secondary {
  background-color: var(--seo-bg-card);
  color: var(--seo-text-main) !important;
  border-color: var(--seo-border-strong);
}

.seo-btn-secondary:hover {
  background-color: var(--seo-bg-subtle);
  border-color: var(--seo-primary);
}

.seo-btn-sm {
  font-size: 0.82rem;
  padding: 0.42rem 0.85rem;
}

/* Main & Breadcrumbs */
.seo-main {
  flex: 1;
  padding: 1.75rem 0 3.5rem;
}

.seo-breadcrumbs {
  margin-bottom: 1.25rem;
  font-size: 0.82rem;
  color: var(--seo-text-muted);
}

.seo-breadcrumbs ol {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.seo-breadcrumbs li + li::before {
  content: "/";
  margin-right: 0.45rem;
  color: var(--seo-text-muted);
  opacity: 0.6;
}

.seo-article {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

/* Hero */
.seo-hero {
  background: linear-gradient(135deg, var(--seo-bg-card) 0%, var(--seo-primary-light) 100%);
  border: 1px solid var(--seo-primary-border);
  border-radius: var(--seo-radius-lg);
  padding: 2.25rem;
  box-shadow: var(--seo-shadow-md);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seo-badge-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.seo-pill-primary {
  background-color: var(--seo-primary);
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.24rem 0.7rem;
  border-radius: 999px;
}

.seo-pill-outline {
  background-color: var(--seo-bg-card);
  color: var(--seo-text-main);
  border: 1px solid var(--seo-border-strong);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.24rem 0.7rem;
  border-radius: 999px;
}

.seo-hero h1 {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.seo-lead {
  font-size: 1.05rem;
  color: var(--seo-text-muted);
  max-width: 880px;
}

.seo-cta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

/* Sections */
.seo-section {
  background-color: var(--seo-bg-card);
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-md);
  padding: 1.75rem;
  box-shadow: var(--seo-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seo-section h2 {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.3;
}

.seo-section p {
  color: var(--seo-text-muted);
  font-size: 0.96rem;
}

/* Tables */
.seo-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-sm);
}

.seo-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.88rem;
}

.seo-table th {
  background-color: var(--seo-bg-subtle);
  color: var(--seo-text-main);
  font-weight: 700;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--seo-border-strong);
  white-space: nowrap;
}

.seo-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--seo-border);
  vertical-align: top;
}

.seo-table tr:last-child td {
  border-bottom: none;
}

.seo-code-pill {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 4px;
  background-color: var(--seo-primary-light);
  color: var(--seo-primary);
  border: 1px solid var(--seo-primary-border);
}

.seo-code-error {
  background-color: var(--seo-error-bg);
  color: var(--seo-error-text);
  border-color: var(--seo-error-border);
}

.seo-code-ok {
  background-color: var(--seo-ok-bg);
  color: var(--seo-ok-text);
  border-color: var(--seo-ok-border);
}

.seo-code-block {
  background-color: #0f172a;
  color: #e2e8f0;
  padding: 1rem 1.25rem;
  border-radius: var(--seo-radius-sm);
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.55;
}

.seo-code-block code {
  background: none;
  border: none;
  padding: 0;
  color: inherit;
}

/* Cards */
.seo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.1rem;
}

.seo-card {
  background-color: var(--seo-bg-subtle);
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-md);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.seo-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.seo-field-tag {
  font-size: 0.78rem;
  color: var(--seo-text-muted);
}

.seo-card h3 {
  font-size: 1.02rem;
  font-weight: 800;
  color: var(--seo-text-main);
}

.seo-card p {
  font-size: 0.88rem;
  color: var(--seo-text-muted);
  flex: 1;
}

.seo-card-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}

/* Pricing Specific */
.seo-pricing-grid {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.seo-plan-card {
  background-color: var(--seo-bg-card);
  border-width: 2px;
}

.seo-plan-highlight {
  border-color: var(--seo-primary);
  box-shadow: var(--seo-shadow-md);
}

.seo-plan-price {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.seo-plan-price strong {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--seo-primary);
}

.seo-plan-price span {
  font-size: 0.88rem;
  color: var(--seo-text-muted);
}

.seo-plan-specs,
.seo-plan-features,
.seo-bullet-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.86rem;
}

.seo-plan-specs {
  background-color: var(--seo-bg-subtle);
  padding: 0.85rem;
  border-radius: var(--seo-radius-sm);
  border: 1px solid var(--seo-border);
}

.seo-bullet-list li {
  padding-left: 1rem;
  border-left: 3px solid var(--seo-primary);
  color: var(--seo-text-muted);
}

/* Detected Columns Box */
.seo-detected-box {
  background-color: var(--seo-bg-subtle);
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-sm);
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.seo-detected-box h3 {
  font-size: 0.9rem;
  font-weight: 700;
}

.seo-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seo-col-chip {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.76rem;
  background-color: var(--seo-bg-card);
  border: 1px solid var(--seo-border-strong);
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
}

/* Steps */
.seo-steps-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.seo-step-item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  background-color: var(--seo-bg-subtle);
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-sm);
  padding: 1rem 1.15rem;
}

.seo-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--seo-primary);
  color: #ffffff;
  font-weight: 800;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

/* FAQ */
.seo-faq-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.seo-faq-item {
  background-color: var(--seo-bg-subtle);
  border-left: 4px solid var(--seo-primary);
  border-radius: var(--seo-radius-sm);
  padding: 1rem 1.25rem;
}

.seo-faq-item h3 {
  font-size: 0.98rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
}

.seo-faq-item p {
  font-size: 0.9rem;
}

/* CTA Banner */
.seo-cta-banner {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
  color: #ffffff;
  border-radius: var(--seo-radius-lg);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.seo-cta-banner h2 {
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
}

.seo-cta-banner p {
  color: #cbd5e1;
  font-size: 0.94rem;
  max-width: 640px;
}

.seo-cta-banner code {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.25);
  color: #93c5fd;
}

/* Related Links */
.seo-related-box {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  background-color: var(--seo-bg-card);
  border: 1px solid var(--seo-border);
  border-radius: var(--seo-radius-md);
  padding: 1.5rem;
}

.seo-related-col h3 {
  font-size: 0.95rem;
  font-weight: 800;
  margin-bottom: 0.65rem;
}

.seo-related-col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.88rem;
}

/* Footer */
.seo-footer {
  background-color: var(--seo-bg-card);
  border-top: 1px solid var(--seo-border);
  padding: 2.5rem 0 1.5rem;
  margin-top: auto;
  font-size: 0.84rem;
  color: var(--seo-text-muted);
}

.seo-footer-grid {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.seo-footer-col {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.seo-footer-col strong {
  color: var(--seo-text-main);
  font-size: 0.9rem;
}

.seo-footer-col ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.seo-footer-links-inline {
  margin-top: 0.35rem;
}

.seo-footer-bottom {
  border-top: 1px solid var(--seo-border);
  padding-top: 1.15rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.78rem;
}

@media (max-width: 820px) {
  .seo-hero {
    padding: 1.5rem;
  }
  .seo-hero h1 {
    font-size: 1.5rem;
  }
  .seo-section {
    padding: 1.25rem;
  }
  .seo-footer-grid {
    grid-template-columns: 1fr;
  }
}
`;
}

function countVisibleWords(html) {
  const withoutScriptsAndStyles = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header class="seo-navbar"[\s\S]*?<\/header>/gi, ' ');
  const textOnly = withoutScriptsAndStyles
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!textOnly) return 0;
  return textOnly.split(' ').length;
}

function writePageFile(slug, htmlContent) {
  const dirPath = path.join(publicDir, slug);
  fs.mkdirSync(dirPath, { recursive: true });
  const filePath = path.join(dirPath, 'index.html');
  fs.writeFileSync(filePath, htmlContent, 'utf-8');
  const wordCount = countVisibleWords(htmlContent);
  return { slug, url: `${SITE_ORIGIN}/${slug}/`, filePath, wordCount };
}

function buildSitemapXml(urls) {
  const urlEntries = urls
    .map(
      (u) => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${TODAY_ISO}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

function main() {
  fs.mkdirSync(publicDir, { recursive: true });

  // 1. Write shared CSS
  const cssPath = path.join(publicDir, 'seo.css');
  fs.writeFileSync(cssPath, buildSeoCss(), 'utf-8');

  const generatedPages = [];

  // 2. Write Hubs + Pricing
  generatedPages.push({
    ...writePageFile('layouts-de-importacao-erp', buildLayoutsHubHtml()),
    priority: '0.9',
    changefreq: 'weekly',
  });
  generatedPages.push({
    ...writePageFile('regras-de-validacao-csv', buildRulesHubHtml()),
    priority: '0.9',
    changefreq: 'weekly',
  });
  generatedPages.push({
    ...writePageFile('precos', buildPricingPageHtml()),
    priority: '0.9',
    changefreq: 'weekly',
  });
  generatedPages.push({
    ...writePageFile('termos', buildTermsPageHtml()),
    priority: '0.5',
    changefreq: 'monthly',
  });
  generatedPages.push({
    ...writePageFile('privacidade', buildPrivacyPageHtml()),
    priority: '0.5',
    changefreq: 'monthly',
  });

  // 3. Write 10 ERP Preset pages
  for (const erpPage of ERP_SEO_PAGES) {
    generatedPages.push({
      ...writePageFile(erpPage.slug, buildErpPageHtml(erpPage)),
      priority: '0.8',
      changefreq: 'monthly',
    });
  }

  // 4. Write 8 Validation Rule pages
  for (const rulePage of RULE_SEO_PAGES) {
    generatedPages.push({
      ...writePageFile(rulePage.slug, buildRulePageHtml(rulePage)),
      priority: '0.8',
      changefreq: 'monthly',
    });
  }

  // 5. Write sitemap.xml
  const sitemapUrls = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: '1.0' },
    ...generatedPages.map((p) => ({
      loc: p.url,
      changefreq: p.changefreq,
      priority: p.priority,
    })),
  ];
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, buildSitemapXml(sitemapUrls), 'utf-8');

  // 6. Write robots.txt
  const robotsPath = path.join(publicDir, 'robots.txt');
  fs.writeFileSync(robotsPath, buildRobotsTxt(), 'utf-8');

  console.log(`✓ SEO estático gerado com sucesso (${generatedPages.length} páginas + sitemap.xml + robots.txt + seo.css):`);
  for (const page of generatedPages) {
    console.log(`  - /${page.slug}/ (${page.wordCount} palavras no corpo principal)`);
    if (page.wordCount < 500 || page.wordCount > 900) {
      console.warn(`  ! ATENÇÃO: /${page.slug}/ fora da faixa de 500-900 palavras (${page.wordCount})`);
    }
  }
}

main();
