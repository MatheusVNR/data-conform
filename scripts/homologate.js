import puppeteer from '../frontend/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  console.log('Iniciando homologação automatizada com Edge...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850'],
    defaultViewport: { width: 1366, height: 850, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();

  try {
    console.log('1. Acessando http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForSelector('.navbar', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotsDir, '01-initial-dashboard.png') });
    console.log('✓ 01-initial-dashboard.png capturado.');

    console.log('2. Abrindo modal de autenticação...');
    const authBtn = await page.waitForSelector('.auth-user-section button');
    await authBtn.click();
    await page.waitForSelector('.auth-modal-dialog', { timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotsDir, '02-auth-login-modal.png') });
    console.log('✓ 02-auth-login-modal.png capturado.');

    console.log('3. Alternando para cadastro de organização...');
    const toggleBtn = await page.waitForSelector('.auth-toggle-link button');
    await toggleBtn.click();
    await page.waitForSelector('#auth-name');
    await page.type('#auth-name', 'Matheus Ramos');
    await page.type('#auth-ws', 'Nexus ERP Solutions');
    const uniqueEmail = `matheus.${Date.now()}@nexuserp.com`;
    await page.type('#auth-email', uniqueEmail);
    await page.type('#auth-password', 'senhaSegura123!');
    await page.screenshot({ path: path.join(screenshotsDir, '03-auth-register-form.png') });
    console.log('✓ 03-auth-register-form.png capturado.');

    console.log('4. Enviando cadastro...');
    const submitRegister = await page.waitForSelector('.auth-modal-dialog button[type="submit"]');
    await submitRegister.click();
    await page.waitForFunction(() => !document.querySelector('.auth-modal-dialog'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '04-authenticated-dashboard.png') });
    console.log('✓ 04-authenticated-dashboard.png capturado.');

    console.log('5. Abrindo modal de criação de projeto...');
    const newProjBtn = await page.waitForSelector('.project-list-section button');
    await newProjBtn.click();
    await page.waitForSelector('.modal-dialog');
    await page.type('#project-name', 'Migração Clientes SAP Business One');
    await page.type('#project-desc', 'Validação cadastral de clientes legados antes da carga no SAP Business One');
    await page.type('#project-target', 'SAP Business One');
    await page.screenshot({ path: path.join(screenshotsDir, '05-create-project-modal.png') });
    console.log('✓ 05-create-project-modal.png capturado.');

    console.log('6. Confirmando criação do projeto...');
    const submitProject = await page.waitForSelector('.modal-footer .btn-primary');
    await submitProject.click();
    await page.waitForFunction(() => !document.querySelector('.modal-dialog'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '06-project-selected-dashboard.png') });
    console.log('✓ 06-project-selected-dashboard.png capturado.');

    console.log('7. Abrindo modal de gerenciamento de planos...');
    const planTrigger = await page.waitForSelector('.btn-plan-trigger');
    await planTrigger.click();
    await page.waitForSelector('.plan-modal-dialog', { timeout: 5000 });
    await page.screenshot({ path: path.join(screenshotsDir, '07-change-plan-modal.png') });
    console.log('✓ 07-change-plan-modal.png capturado.');

    console.log('8. Ativando plano Professional...');
    const profCard = await page.waitForSelector('.plan-card-highlight');
    await profCard.click();
    const confirmPlanBtn = await page.waitForSelector('.plan-modal-dialog .modal-footer .btn-primary');
    await confirmPlanBtn.click();
    await page.waitForFunction(() => !document.querySelector('.plan-modal-dialog'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '08-upgraded-dashboard.png') });
    console.log('✓ 08-upgraded-dashboard.png capturado.');

    console.log('9. Fazendo upload do arquivo CSV...');
    const fileInput = await page.waitForSelector('#file-upload-input');
    const sampleCsvPath = path.join(__dirname, 'sample_clientes_erp.csv');
    await fileInput.uploadFile(sampleCsvPath);
    await page.waitForSelector('.files-table tbody tr', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotsDir, '09-file-uploaded.png') });
    console.log('✓ 09-file-uploaded.png capturado.');

    console.log('10. Executando validação do arquivo...');
    const validateBtn = await page.waitForSelector('.btn-validate');
    await validateBtn.click();
    await page.waitForSelector('.report-modal-dialog', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '10-validation-report-modal.png') });
    console.log('✓ 10-validation-report-modal.png capturado.');

    console.log('11. Filtrando inconsistências por Erros...');
    const filterError = await page.waitForSelector('.filter-chip-error');
    await filterError.click();
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(screenshotsDir, '11-validation-report-filtered.png') });
    console.log('✓ 11-validation-report-filtered.png capturado.');

    console.log('12. Fechando modal de relatório e abrindo auditoria...');
    const closeReportBtn = await page.waitForSelector('.report-modal-dialog .btn-close');
    await closeReportBtn.click();
    await page.waitForFunction(() => !document.querySelector('.report-modal-dialog'));

    const auditBtn = await page.waitForSelector('.navbar-workspace-controls button:nth-of-type(3)');
    await auditBtn.click();
    await page.waitForSelector('.audit-modal-dialog', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '12-audit-trail-modal.png') });
    console.log('✓ 12-audit-trail-modal.png capturado.');

    console.log('\nTodos os 12 cenários foram homologados e capturados com sucesso!');
  } catch (err) {
    console.error('Erro durante a homologação:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png') });
  } finally {
    await browser.close();
  }
}

run();
