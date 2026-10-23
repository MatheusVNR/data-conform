const puppeteer = require('../frontend/node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, 'screenshots', 'persona_qa');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runQa() {
  console.log('🚀 Iniciando Homologação Automatizada com Olhos da Persona (Carlos Eduardo)...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
    defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 1.5 },
  });

  const page = await browser.newPage();
  const baseUrl = 'https://dataconform.com.br';

  try {
    console.log('1. Acessando Landing Page em https://dataconform.com.br...');
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await page.screenshot({ path: path.join(screenshotDir, '01_landing_hero.png') });
    console.log('✓ 01_landing_hero.png');

    console.log('2. Testando Simulador Interativo (Sandbox Zero-Click)...');
    const sandboxTabs = await page.$$('.sandbox-tab-btn');
    if (sandboxTabs.length > 1) {
      await sandboxTabs[1].click(); // Clica em SAP Business One
      await new Promise(r => setTimeout(r, 600));
    }
    await page.screenshot({ path: path.join(screenshotDir, '02_visitor_sandbox_sap.png') });
    console.log('✓ 02_visitor_sandbox_sap.png');

    console.log('3. Testando abertura de laudo executivo a partir do simulador...');
    const demoReportBtn = await page.$('.sandbox-footer-buttons button');
    if (demoReportBtn) {
      await demoReportBtn.click();
      await page.waitForSelector('.report-modal-card', { timeout: 6000 });
      await new Promise(r => setTimeout(r, 500));
      await page.screenshot({ path: path.join(screenshotDir, '03_simulated_report_modal.png') });
      console.log('✓ 03_simulated_report_modal.png');

      const closeReportBtn = await page.$('.report-modal-card .btn-close');
      if (closeReportBtn) await closeReportBtn.click();
      await new Promise(r => setTimeout(r, 400));
    }

    console.log('4. Abrindo modal de cadastro...');
    const registerCta = await page.$('.visitor-hero-cta-group .btn-primary');
    if (registerCta) await registerCta.click();
    await page.waitForSelector('.auth-modal-dialog', { timeout: 6000 });
    await page.screenshot({ path: path.join(screenshotDir, '04_auth_register_modal.png') });
    console.log('✓ 04_auth_register_modal.png');

    console.log('5. Efetuando cadastro com dados corporativos de consultor...');
    const testEmail = `carlos.eduardo.${Date.now()}@consultoriadados.com.br`;
    await page.type('#auth-name', 'Carlos Eduardo - Lead de Dados');
    await page.type('#auth-ws', 'Alpha ERP Consultoria');
    await page.type('#auth-email', testEmail);
    await page.type('#auth-password', 'Gestao@2026!');
    const submitRegister = await page.$('.auth-modal-dialog button[type="submit"]');
    await submitRegister.click();

    await page.waitForSelector('.workspace-hero-banner', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, '05_authenticated_dashboard.png') });
    console.log('✓ 05_authenticated_dashboard.png');

    console.log('6. Abrindo modal de criação de projeto...');
    const createProjBtn = await page.waitForSelector('.section-header .btn-primary, .empty-state .btn-primary', { timeout: 8000 });
    if (createProjBtn) await createProjBtn.click();
    await page.waitForSelector('.modal-card-form', { timeout: 6000 });
    await page.screenshot({ path: path.join(screenshotDir, '06_create_project_modal.png') });
    console.log('✓ 06_create_project_modal.png');

    console.log('7. Criando projeto para TOTVS Protheus...');
    await page.type('#proj-name', 'Virada Go-Live TOTVS SA1');
    await page.select('#proj-target', 'TOTVS Protheus');
    await page.type('#proj-desc', 'Saneamento preventivo de clientes e cadastros fiscais antes da importação');
    const submitProject = await page.$('.modal-card-form button[type="submit"]');
    await submitProject.click();

    await page.waitForSelector('.file-uploader-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(screenshotDir, '07_project_dashboard_ready.png') });
    console.log('✓ 07_project_dashboard_ready.png');

    console.log('8. Testando 1-clique de Amostra Oficial do ERP...');
    const demoSampleBtn = await page.$('.dropzone-demo-btn');
    if (demoSampleBtn) {
      await demoSampleBtn.click();
      await page.waitForSelector('.data-table tbody tr', { timeout: 15000 });
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(screenshotDir, '08_file_uploaded_in_table.png') });
      console.log('✓ 08_file_uploaded_in_table.png');
    }

    console.log('9. Abrindo modal de parametrização e validação do arquivo...');
    const validateBtn = await page.$('.table-actions .btn-primary');
    if (validateBtn) {
      await validateBtn.click();
      await page.waitForSelector('.column-chips-row', { timeout: 6000 });
      await page.screenshot({ path: path.join(screenshotDir, '09_validate_params_modal.png') });
      console.log('✓ 09_validate_params_modal.png');

      const runAuditBtn = await page.$('.modal-footer .btn-primary');
      if (runAuditBtn) {
        await runAuditBtn.click();
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log('10. Verificando tabela pós-validação...');
    await page.screenshot({ path: path.join(screenshotDir, '10_table_validated_state.png') });
    console.log('✓ 10_table_validated_state.png');

    console.log('11. Abrindo Laudo Técnico de Conformidade...');
    const viewReportBtn = await page.$('.table-actions .btn-secondary');
    if (viewReportBtn) {
      await viewReportBtn.click();
      await page.waitForSelector('.report-modal-card', { timeout: 6000 });
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(screenshotDir, '11_report_modal_with_pdf.png') });
      console.log('✓ 11_report_modal_with_pdf.png');

      const closeReport = await page.$('.report-modal-card .btn-close');
      if (closeReport) await closeReport.click();
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('12. Testando Modal de Exclusão de Arquivo...');
    const deleteBtn = await page.$('.btn-file-delete-trigger');
    if (deleteBtn) {
      await deleteBtn.click();
      await page.waitForSelector('.modal-delete-confirm-card', { timeout: 6000 });
      await page.screenshot({ path: path.join(screenshotDir, '12_delete_confirmation_modal.png') });
      console.log('✓ 12_delete_confirmation_modal.png');

      const cancelDel = await page.$('.modal-delete-confirm-card .btn-secondary');
      if (cancelDel) await cancelDel.click();
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('13. Testando Modal de Planos & Faturamento Corporativo...');
    const planTrigger = await page.$('.btn-plan-trigger');
    if (planTrigger) {
      await planTrigger.click();
      await page.waitForSelector('.plans-grid', { timeout: 6000 });
      const b2bToggle = await page.$('.b2b-billing-header button');
      if (b2bToggle) await b2bToggle.click();
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(screenshotDir, '13_change_plan_b2b_billing.png') });
      console.log('✓ 13_change_plan_b2b_billing.png');

      const closePlan = await page.$('.modal-footer .btn-secondary');
      if (closePlan) await closePlan.click();
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('14. Testando Trilha de Auditoria...');
    const auditBtn = await page.$('.navbar-workspace-controls button[title*="auditoria"]');
    if (auditBtn) {
      await auditBtn.click();
      await page.waitForSelector('.audit-modal-dialog', { timeout: 6000 });
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(screenshotDir, '14_audit_trail_modal.png') });
      console.log('✓ 14_audit_trail_modal.png');

      const closeAudit = await page.$('.audit-modal-dialog .btn-close');
      if (closeAudit) await closeAudit.click();
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('15. Testando Visão Mobile (Galaxy Book / Telas Pequenas 390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, '15_mobile_authenticated_view.png') });
    console.log('✓ 15_mobile_authenticated_view.png');

    const mobileMenuBtn = await page.$('.mobile-menu-toggle');
    if (mobileMenuBtn) {
      await mobileMenuBtn.click();
      await page.waitForSelector('.navbar-mobile-drawer', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 600));
      await page.screenshot({ path: path.join(screenshotDir, '16_mobile_drawer_open.png') });
      console.log('✓ 16_mobile_drawer_open.png');
    }

    console.log('🎉 Homologação automatizada concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante a homologação:', err);
    await page.screenshot({ path: path.join(screenshotDir, 'error_state.png') });
  } finally {
    await browser.close();
  }
}

runQa();
