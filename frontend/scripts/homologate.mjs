import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const screenshotsDir = path.join(__dirname, '..', '..', 'scripts', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function run() {
  console.log('Iniciando homologação automatizada com Microsoft Edge...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
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
    await new Promise((r) => setTimeout(r, 500));
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
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(screenshotsDir, '03-auth-register-form.png') });
    console.log('✓ 03-auth-register-form.png capturado.');

    console.log('4. Enviando cadastro corporativo...');
    const submitRegister = await page.waitForSelector('.auth-modal-dialog button[type="submit"]');
    await submitRegister.click();
    await page.waitForFunction(() => !document.querySelector('.auth-modal-dialog'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotsDir, '04-authenticated-dashboard.png') });
    console.log('✓ 04-authenticated-dashboard.png capturado.');

    console.log('5. Abrindo modal de criação de projeto de importação...');
    const newProjBtn = await page.waitForSelector('.project-section .section-header button');
    await newProjBtn.click();
    await page.waitForSelector('.modal-card', { timeout: 5000 });
    await page.waitForSelector('#proj-name');
    await page.type('#proj-name', 'Migração Clientes SAP Business One');
    await page.select('#proj-target', 'SAP Business One');
    await page.type('#proj-desc', 'Validação cadastral de clientes legados e inconsistências antes da carga no SAP Business One.');
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(screenshotsDir, '05-create-project-modal.png') });
    console.log('✓ 05-create-project-modal.png capturado.');

    console.log('6. Confirmando criação do projeto...');
    const submitProject = await page.waitForSelector('.modal-card .modal-footer .btn-primary');
    await submitProject.click();
    await page.waitForFunction(() => !document.querySelector('.modal-card'), { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '06-project-selected-dashboard.png') });
    console.log('✓ 06-project-selected-dashboard.png capturado.');

    console.log('7. Abrindo modal de gerenciamento de planos...');
    const planTrigger = await page.waitForSelector('.btn-plan-trigger');
    await planTrigger.click();
    await page.waitForSelector('.plan-modal-dialog', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));
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

    console.log('9. Fazendo upload do arquivo CSV com inconsistências propositais...');
    const fileInput = await page.waitForSelector('input[type="file"]');
    const sampleCsvPath = path.join(__dirname, '..', '..', 'scripts', 'sample_clientes_erp.csv');
    await fileInput.uploadFile(sampleCsvPath);
    
    // Aguarda o preview do arquivo aparecer e clica em Fazer Upload
    const uploadBtn = await page.waitForSelector('.file-preview-actions button.btn-primary', { timeout: 5000 });
    await uploadBtn.click();
    
    // Aguarda linha ser renderizada na tabela de arquivos
    await page.waitForSelector('.data-table tbody tr', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotsDir, '09-file-uploaded.png') });
    console.log('✓ 09-file-uploaded.png capturado.');

    console.log('10. Abrindo configuração de validação e executando...');
    const validateBtn = await page.waitForSelector('.table-actions button.btn-primary');
    await validateBtn.click();
    
    // Aguarda modal de regras
    await page.waitForSelector('#req-cols', { timeout: 5000 });
    await page.type('#req-cols', 'Nome,CNPJ_CPF,Email');
    await new Promise((r) => setTimeout(r, 500));
    
    const execValidationBtn = await page.waitForSelector('.modal-card .modal-footer .btn-primary');
    await execValidationBtn.click();
    
    // Aguarda abertura automática do relatório de conformidade
    console.log('Aguardando conclusão do processamento e abertura automática do relatório...');
    await page.waitForSelector('.report-modal-card', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotsDir, '10-validation-report-modal.png') });
    console.log('✓ 10-validation-report-modal.png capturado.');

    console.log('11. Filtrando inconsistências por Erros...');
    const filterErrorBtn = await page.waitForSelector('.filter-group .filter-error');
    await filterErrorBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotsDir, '11-validation-report-filtered.png') });
    console.log('✓ 11-validation-report-filtered.png capturado.');

    console.log('12. Fechando modal de relatório e abrindo auditoria...');
    const closeReportBtn = await page.waitForSelector('.report-modal-card .btn-close');
    await closeReportBtn.click();
    await page.waitForFunction(() => !document.querySelector('.report-modal-card'));
    await new Promise((r) => setTimeout(r, 800));

    const auditBtn = await page.waitForSelector('.btn-audit-trigger');
    await auditBtn.click();
    await page.waitForSelector('.audit-modal-dialog', { timeout: 5000 });
    await page.waitForSelector('.audit-table tbody tr', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotsDir, '12-audit-trail-modal.png') });
    console.log('✓ 12-audit-trail-modal.png capturado.');

    console.log('\n======================================================');
    console.log('🎉 SUCESSO: Todos os 12 cenários foram homologados e capturados com sucesso!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Erro durante a homologação:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png') });
  } finally {
    await browser.close();
  }
}

run();
