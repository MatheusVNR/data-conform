import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..', '..');
const ogDir = path.join(frontendRoot, 'public', 'og');
const outputPng = path.join(ogDir, 'dataconform-og.png');
const logoSvgPath = path.join(frontendRoot, 'public', 'brand', 'dataconform-logo-vector.svg');

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);

function findBrowserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function buildOgHtml(svgContent) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 88% 18%, rgba(37, 99, 235, 0.32) 0%, transparent 48%),
                  radial-gradient(circle at 12% 88%, rgba(16, 185, 129, 0.18) 0%, transparent 45%),
                  linear-gradient(135deg, #070d19 0%, #0f172a 55%, #111c38 100%);
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 52px 64px;
      position: relative;
    }
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(to right, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 2;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-icon {
      width: 58px;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 8px 16px rgba(37, 99, 235, 0.4));
    }
    .brand-icon svg {
      width: 58px;
      height: 58px;
    }
    .brand-name {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #ffffff;
    }
    .brand-sub {
      font-size: 13px;
      font-weight: 700;
      color: #60a5fa;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2px;
    }
    .domain-pill {
      background: rgba(37, 99, 235, 0.18);
      border: 1px solid rgba(96, 165, 250, 0.4);
      color: #93c5fd;
      padding: 8px 18px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 42px;
      align-items: center;
      z-index: 2;
    }
    .hero-copy h1 {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.14;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin-bottom: 18px;
    }
    .hero-copy h1 span {
      color: #60a5fa;
    }
    .hero-copy p {
      font-size: 20px;
      line-height: 1.45;
      color: #cbd5e1;
      margin-bottom: 24px;
    }
    .erp-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .erp-badge {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.28);
      color: #e2e8f0;
      font-size: 14px;
      font-weight: 700;
      padding: 7px 14px;
      border-radius: 8px;
    }
    .report-card {
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(96, 165, 250, 0.35);
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      padding-bottom: 12px;
    }
    .report-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #93c5fd;
    }
    .report-status {
      background: rgba(239, 68, 68, 0.18);
      border: 1px solid rgba(248, 113, 113, 0.4);
      color: #fca5a5;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .issue-row {
      background: rgba(30, 41, 59, 0.75);
      border-left: 4px solid #ef4444;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .issue-row.ok {
      border-left-color: #10b981;
    }
    .issue-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: Consolas, monospace;
      font-size: 12px;
    }
    .issue-code {
      color: #fca5a5;
      font-weight: 700;
    }
    .issue-row.ok .issue-code {
      color: #6ee7b7;
    }
    .issue-col {
      color: #94a3b8;
    }
    .issue-desc {
      font-size: 13px;
      color: #e2e8f0;
    }
    .bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(148, 163, 184, 0.18);
      padding-top: 18px;
      z-index: 2;
      font-size: 15px;
      color: #94a3b8;
    }
    .bottom-features {
      display: flex;
      gap: 24px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .bottom-features span strong {
      color: #34d399;
    }
    .cta-badge {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 15px;
      padding: 8px 18px;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="grid-overlay"></div>

  <div class="top-bar">
    <div class="brand">
      <div class="brand-icon">${svgContent}</div>
      <div>
        <div class="brand-name">DataConform</div>
        <div class="brand-sub">Auditoria e Pré-Validação de CSV para ERPs</div>
      </div>
    </div>
    <div class="domain-pill">dataconform.com.br</div>
  </div>

  <div class="main-grid">
    <div class="hero-copy">
      <h1>Valide planilhas CSV <span>antes de importar</span> no seu ERP.</h1>
      <p>Intercepte erros de CPF/CNPJ (Módulo 11), NCM, CEP, UF, UTF-8 e colunas obrigatórias linha a linha com laudo técnico em PDF.</p>
      <div class="erp-badges">
        <span class="erp-badge">TOTVS Protheus</span>
        <span class="erp-badge">SAP Business One</span>
        <span class="erp-badge">SAP S/4HANA</span>
        <span class="erp-badge">Senior ERP</span>
        <span class="erp-badge">Sankhya</span>
        <span class="erp-badge">Omie</span>
        <span class="erp-badge">ContaAzul</span>
      </div>
    </div>

    <div class="report-card">
      <div class="report-header">
        <span class="report-title">Laudo de Homologação CSV</span>
        <span class="report-status">3 desvios bloqueados</span>
      </div>
      <div class="issue-row">
        <div class="issue-top">
          <span class="issue-code">INVALID_DOCUMENT_FORMAT</span>
          <span class="issue-col">Linha #24 • A1_CGC</span>
        </div>
        <div class="issue-desc">CNPJ 12.345.678/0001-00 com dígito verificador inválido.</div>
      </div>
      <div class="issue-row">
        <div class="issue-top">
          <span class="issue-code">INVALID_NCM_FORMAT</span>
          <span class="issue-col">Linha #42 • B1_POSIPI</span>
        </div>
        <div class="issue-desc">NCM fiscal 8471.30 deve conter 8 dígitos numéricos.</div>
      </div>
      <div class="issue-row ok">
        <div class="issue-top">
          <span class="issue-code">ENCODING_UTF8_OK • RFC 4180</span>
          <span class="issue-col">Laudo PDF & CSV</span>
        </div>
        <div class="issue-desc">Exportação imediata de inconsistências para saneamento.</div>
      </div>
    </div>
  </div>

  <div class="bottom-bar">
    <div class="bottom-features">
      <span><strong>✓</strong> 17 Regras Fiscais e Estruturais</span>
      <span><strong>✓</strong> Simulador Grátis Sem Cadastro</span>
      <span><strong>✓</strong> Plano Starter R$ 0</span>
    </div>
    <div class="cta-badge">Testar Planilha Grátis →</div>
  </div>
</body>
</html>`;
}

async function generateOgImage() {
  if (!fs.existsSync(ogDir)) {
    fs.mkdirSync(ogDir, { recursive: true });
  }

  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    if (fs.existsSync(outputPng)) {
      console.log('ℹ Browser headless não encontrado, mantendo imagem OG existente em public/og/dataconform-og.png.');
      return;
    }
    throw new Error('Nenhum executável Chrome/Edge encontrado para gerar a imagem OG.');
  }

  const svgContent = fs.readFileSync(logoSvgPath, 'utf-8');
  const html = buildOgHtml(svgContent);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 630, deviceScaleFactor: 1 },
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: outputPng,
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    console.log(`✓ Imagem Open Graph 1200x630 gerada em: ${outputPng}`);
  } finally {
    await browser.close();
  }
}

generateOgImage();
