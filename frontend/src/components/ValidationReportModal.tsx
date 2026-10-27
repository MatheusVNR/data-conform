import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import type { PlanTier, ValidationIssueDto, ValidationReportDto } from '../types';
import { IssueSeverityLabels, PlanTierLabels } from '../types';

interface ValidationReportModalProps {
  report: ValidationReportDto | null;
  projectName?: string | null;
  targetSystem?: string | null;
  workspaceName?: string | null;
  workspacePlan?: PlanTier | null;
  onClose: () => void;
}

const isErrorSeverity = (s: unknown): boolean => s === 1 || s === '1' || s === 'Error' || s === 'error';
const isWarningSeverity = (s: unknown): boolean => s === 0 || s === '0' || s === 'Warning' || s === 'warning';

export const ValidationReportModal: FC<ValidationReportModalProps> = ({
  report,
  projectName,
  targetSystem,
  workspaceName,
  workspacePlan = 'Starter',
  onClose,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | '1' | '0'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize: number = 50;

  const resolvedPlanLabel: string = workspacePlan
    ? (PlanTierLabels[String(workspacePlan)] ?? 'Starter')
    : 'Starter';
  const isStarterPlan: boolean = resolvedPlanLabel === 'Starter';
  const starterCsvCap: number = 10;
  const starterPdfCap: number = 15;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (report) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [report, onClose]);

  const handleCopyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => {
        setCopiedText((curr: string | null) => (curr === text ? null : curr));
      }, 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const filteredIssues: ValidationIssueDto[] = useMemo(() => {
    if (!report) return [];

    return report.issues.filter((issue: ValidationIssueDto) => {
      const matchesSeverity: boolean =
        severityFilter === 'all' ||
        (severityFilter === '1' && isErrorSeverity(issue.severity)) ||
        (severityFilter === '0' && isWarningSeverity(issue.severity));

      const matchesSearch: boolean =
        !searchTerm.trim() ||
        (issue.columnName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        issue.issueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.message.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSeverity && matchesSearch;
    });
  }, [report, severityFilter, searchTerm]);

  const totalIssues: number = filteredIssues.length;
  const totalPages: number = Math.max(1, Math.ceil(totalIssues / pageSize));
  const safeCurrentPage: number = Math.min(currentPage, totalPages);
  const startIndex: number = (safeCurrentPage - 1) * pageSize;
  const displayedIssues: ValidationIssueDto[] = filteredIssues.slice(startIndex, startIndex + pageSize);
  const endIndex: number = Math.min(startIndex + pageSize, totalIssues);

  const handleExportCsv = (): void => {
    if (!report || filteredIssues.length === 0) return;

    const sanitizeCsvCell = (val: string | null | undefined): string => {
      if (!val) return '""';
      let safe: string = val;
      if (/^[=+\-@\t\r]/.test(safe)) {
        safe = `'${safe}`;
      }
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const exportedSlice: ValidationIssueDto[] = isStarterPlan
      ? filteredIssues.slice(0, starterCsvCap)
      : filteredIssues;

    const headers: string[] = ['Linha', 'Coluna', 'Severidade', 'Codigo', 'Mensagem', 'Valor Capturado'];
    const rows: string[][] = exportedSlice.map((issue: ValidationIssueDto) => [
      issue.rowNumber ? String(issue.rowNumber) : '',
      issue.columnName ?? 'Geral',
      isErrorSeverity(issue.severity) ? 'Erro' : 'Aviso',
      sanitizeCsvCell(issue.issueCode),
      sanitizeCsvCell(issue.message),
      sanitizeCsvCell(issue.rawValue),
    ]);

    if (isStarterPlan && filteredIssues.length > starterCsvCap) {
      rows.push([
        '',
        'NOTA_ESCALA_PLANO',
        'Aviso',
        '"STARTER_EXPORT_CAP"',
        sanitizeCsvCell(
          `Exportacao preliminar limitada as ${starterCsvCap} primeiras ocorrencias (de ${filteredIssues.length}) no plano gratuito Starter. Para exportar a planilha integral, utilize o plano Professional em https://dataconform.com.br`
        ),
        '""',
      ]);
    }

    const csvContent: string =
      '\uFEFF' + [headers.join(';'), ...rows.map((r: string[]) => r.join(';'))].join('\r\n');
    const blob: Blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url: string = URL.createObjectURL(blob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `data_conform_${report.originalFileName.replace(/\.[^/.]+$/, '')}_inconsistencias.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  const conformityRate: number =
    report.totalRows > 0
      ? Math.round((report.validRows / report.totalRows) * 100)
      : 100;

  const errorCount: number = report.issues.filter((i: ValidationIssueDto) => isErrorSeverity(i.severity)).length;
  const warningCount: number = report.issues.filter((i: ValidationIssueDto) => isWarningSeverity(i.severity)).length;

  const handleCopySummary = async (): Promise<void> => {
    const topIssues: string =
      filteredIssues.length === 0
        ? 'Nenhuma inconsistência detectada (100% em conformidade).'
        : filteredIssues
            .slice(0, 10)
            .map(
              (issue: ValidationIssueDto) =>
                `- [Linha #${issue.rowNumber ?? 'Geral'} | ${issue.columnName ?? 'Geral'}] ${issue.issueCode}: ${issue.message}${issue.rawValue ? ` (Valor: "${issue.rawValue}")` : ''}`
            )
            .join('\n');

    const summaryText: string = [
      `LAUDO TÉCNICO DE HOMOLOGAÇÃO — DATACONFORM`,
      `Arquivo: ${report.originalFileName}`,
      `Total de Registros: ${report.totalRows} | Válidos: ${report.validRows} | Com Inconsistência: ${report.errorRows}`,
      `Taxa de Conformidade: ${conformityRate}% (${errorCount} erros, ${warningCount} avisos)`,
      ``,
      `Principais Apontamentos:`,
      topIssues,
      filteredIssues.length > 10 ? `\n(...e mais ${filteredIssues.length - 10} apontamentos no relatório completo — https://dataconform.com.br)` : '',
    ]
      .filter((line: string) => line !== '')
      .join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => {
        setCopiedSummary(false);
      }, 2500);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const escapeHtml = (val: string | null | undefined): string => {
    if (!val) return '—';
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const handleExportPdf = (): void => {
    const protocolHash: string = `DC-${report.fileId.substring(0, 8).toUpperCase()}-${report.totalRows}R`;
    const nowFormatted: string = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const isApproved: boolean = errorCount === 0;
    const statusLabel: string = isApproved
      ? 'HOMOLOGADO — APTO PARA CARGA DEFINITIVA NO ERP'
      : 'RETIDO EM HOMOLOGAÇÃO — SANEAMENTO PRÉVIO REQUERIDO';
    const statusColor: string = isApproved ? '#065F46' : '#991B1B';
    const statusBg: string = isApproved ? '#F0FDF4' : '#FEF2F2';
    const statusBorder: string = isApproved ? '#059669' : '#DC2626';

    const pdfIssuesSlice: ValidationIssueDto[] = isStarterPlan
      ? filteredIssues.slice(0, starterPdfCap)
      : filteredIssues;

    const omittedIssuesCount: number = Math.max(0, filteredIssues.length - pdfIssuesSlice.length);

    const rowsHtml: string =
      pdfIssuesSlice.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #065F46; font-weight: 600;">Nenhuma restrição ou inconsistência técnica detectada. Lote 100% aderente às especificações do layout.</td></tr>`
        : pdfIssuesSlice
            .map((issue: ValidationIssueDto) => {
              const isErr: boolean = isErrorSeverity(issue.severity);
              const sevTag: string = isErr
                ? `<span style="display:inline-block;border:1px solid #B91C1C;color:#991B1B;background:#FEF2F2;padding:1px 6px;font-size:10px;font-weight:700;letter-spacing:0.04em;">IMPEDITIVO</span>`
                : `<span style="display:inline-block;border:1px solid #B45309;color:#92400E;background:#FFFBEB;padding:1px 6px;font-size:10px;font-weight:700;letter-spacing:0.04em;">ALERTA</span>`;
              return `
                <tr>
                  <td style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-weight:600;color:#0F172A;">${issue.rowNumber ?? 'GERAL'}</td>
                  <td style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-weight:700;color:#0F172A;">${escapeHtml(issue.columnName ?? 'GERAL')}</td>
                  <td>${sevTag}</td>
                  <td style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:10.5px;color:#1E3A8A;">${escapeHtml(issue.issueCode)}</td>
                  <td style="color:#1E293B;">${escapeHtml(issue.message)}</td>
                  <td style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:10.5px;color:#334155;word-break:break-all;">${escapeHtml(issue.rawValue)}</td>
                </tr>
              `;
            })
            .join('') +
          (omittedIssuesCount > 0
            ? `<tr>
                <td colspan="6" style="background:#F8FAFC;border-top:1.5px solid #0F172A;padding:12px 14px;font-size:11px;color:#0F172A;">
                  <strong>NOTA DE ESCOPO (CONTA GRATUITA STARTER):</strong> Exibindo os <strong>${starterPdfCap} primeiros apontamentos</strong> de um total de <strong>${filteredIssues.length} ocorrências</strong> identificadas neste lote (${omittedIssuesCount} ocorrências omitidas na visualização gratuita). Para emitir o Laudo Técnico Oficial completo, sem marca d'água e com Termo de Aceite Formal, utilize o plano <strong>Professional</strong> em <a href="https://dataconform.com.br?utm_source=laudo_pdf" style="color:#1D4ED8;text-decoration:underline;font-weight:700;">dataconform.com.br</a>.
                </td>
              </tr>`
            : '');

    const inlineBrandSvg: string = `<svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="60" height="60" rx="12" fill="#0B132B" />
      <rect x="3" y="3" width="58" height="58" rx="11" stroke="#1E293B" stroke-width="1.5" />
      <rect x="13" y="16" width="11" height="8" rx="1.5" fill="#2563EB" />
      <rect x="13" y="28" width="11" height="8" rx="1.5" fill="#3B82F6" />
      <rect x="13" y="40" width="11" height="8" rx="1.5" fill="#60A5FA" />
      <path d="M27 16H33C41.8366 16 49 23.1634 49 32C49 40.8366 41.8366 48 33 48H27V41.5H33C38.2467 41.5 42.5 37.2467 42.5 32C42.5 26.7533 38.2467 22.5 33 22.5H27V16Z" fill="#F8FAFC" />
      <path d="M31 33L36.5 38.5L50.5 24.5" stroke="#0B132B" stroke-width="9.5" stroke-linecap="square" stroke-linejoin="miter" />
      <path d="M31 33L36.5 38.5L50.5 24.5" stroke="#10B981" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter" />
    </svg>`;

    const watermarkHtml: string = isStarterPlan
      ? `<div class="watermark-layer" aria-hidden="true">
          <div class="watermark-stamp">
            <div class="watermark-logo">${inlineBrandSvg}</div>
            <div class="watermark-text">
              HOMOLOGAÇÃO PRELIMINAR — CONTA GRATUITA<br/>
              <span>DATACONFORM.COM.BR • SEM VALIDADE DE ACEITE FORMAL</span>
            </div>
          </div>
        </div>`
      : '';

    const clearanceFooterHtml: string = isStarterPlan
      ? `<div class="section-label">QUADRO 4 — CONDIÇÃO DE VALIDADE DOCUMENTAL</div>
         <div class="starter-clearance-notice">
           <strong>DOCUMENTO PRELIMINAR DE DIAGNÓSTICO TÉCNICO (SEM QUADRO DE ASSINATURA DE ACEITE FORMAL)</strong>
           <p>Este relatório foi gerado em ambiente de avaliação gratuita (Plano Starter). O Termo de Homologação com campos de assinatura formal do Consultor Técnico e do Homologador do Cliente para aceite de projeto é exclusivo das organizações licenciadas nos planos <strong>Professional</strong> e <strong>Enterprise</strong> (<a href="https://dataconform.com.br?utm_source=laudo_pdf" style="color:#0F172A;font-weight:700;">https://dataconform.com.br</a>).</p>
         </div>`
      : `<div class="section-label">QUADRO 4 — TERMO DE HOMOLOGAÇÃO E ACEITE TÉCNICO DE CARGA</div>
         <table class="sign-table">
           <tbody>
             <tr>
               <td>
                 <div class="sign-role">RESPONSÁVEL TÉCNICO / ENGENHARIA DE DADOS / IMPLANTAÇÃO</div>
                 <div class="sign-Desc">Atesto a execução da auditoria estrutural e semântica sobre o arquivo identificado no protocolo ${protocolHash}.</div>
                 <div class="sign-line-space">Assinatura / Identificação e Data: ____________________________________________________</div>
               </td>
               <td>
                 <div class="sign-role">HOMOLOGADOR RESPONSÁVEL / REPRESENTANTE DO CLIENTE</div>
                 <div class="sign-Desc">Declaro ciência do parecer técnico acima e das adequações cadastrais/fiscais requeridas antes da carga definitiva.</div>
                 <div class="sign-line-space">Assinatura / Cargo e Data: ___________________________________________________________</div>
               </td>
             </tr>
           </tbody>
         </table>`;

    const htmlDocument: string = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Laudo Técnico ${protocolHash} - ${escapeHtml(report.originalFileName)}</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: A4 portrait;
      margin: 14mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 24px 28px;
      background: #FFFFFF;
      font-size: 11.5px;
      line-height: 1.4;
      position: relative;
      font-variant-numeric: tabular-nums;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .watermark-layer {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 999;
    }
    .watermark-stamp {
      transform: rotate(-30deg);
      border: 3px solid rgba(15, 23, 42, 0.08);
      padding: 18px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
      opacity: 0.085;
      text-align: left;
      white-space: nowrap;
    }
    .watermark-logo svg {
      width: 54px;
      height: 54px;
    }
    .watermark-text {
      font-size: 21px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #0F172A;
      line-height: 1.25;
    }
    .watermark-text span {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      border: 1.5px solid #0F172A;
      margin-bottom: 16px;
    }
    .doc-brand-col {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      flex: 1;
    }
    .doc-brand-text h1 {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #0F172A;
      margin: 0;
    }
    .doc-brand-text p {
      font-size: 10.5px;
      color: #475569;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    .doc-meta-col {
      border-left: 1.5px solid #0F172A;
      background: #F8FAFC;
      padding: 10px 14px;
      min-width: 245px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      font-size: 10.5px;
    }
    .doc-meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 1.5px 0;
    }
    .doc-meta-row span {
      color: #475569;
      text-transform: uppercase;
      font-weight: 600;
    }
    .doc-meta-row strong {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      color: #0F172A;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #334155;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-bottom: none;
      padding: 5px 10px;
    }
    .spec-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #CBD5E1;
    }
    .spec-table td {
      border: 1px solid #CBD5E1;
      padding: 6px 10px;
      font-size: 11px;
      width: 50%;
    }
    .spec-table td .lbl {
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .spec-table td .val {
      font-weight: 700;
      color: #0F172A;
    }
    .verdict-row {
      background: ${statusBg};
      border: 1.5px solid ${statusBorder};
      color: ${statusColor};
      padding: 9px 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }
    .kpi-matrix {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #CBD5E1;
    }
    .kpi-matrix td {
      border: 1px solid #CBD5E1;
      padding: 8px 12px;
      width: 25%;
      background: #FFFFFF;
    }
    .kpi-matrix .k-lbl {
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748B;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .kpi-matrix .k-val {
      font-size: 17px;
      font-weight: 800;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    .issues-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      border: 1px solid #CBD5E1;
      font-size: 10.5px;
    }
    .issues-grid th {
      background: #0F172A;
      color: #F8FAFC;
      text-align: left;
      padding: 6px 8px;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid #0F172A;
    }
    .issues-grid td {
      padding: 5.5px 8px;
      border: 1px solid #CBD5E1;
      vertical-align: top;
    }
    .issues-grid tbody tr:nth-child(even) {
      background: #F8FAFC;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #CBD5E1;
      margin-bottom: 14px;
    }
    .sign-table td {
      width: 50%;
      border: 1px solid #CBD5E1;
      padding: 10px 12px;
      vertical-align: top;
    }
    .sign-role {
      font-size: 10px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .sign-Desc {
      font-size: 10px;
      color: #475569;
      margin-bottom: 22px;
    }
    .sign-line-space {
      font-size: 10px;
      color: #334155;
      font-weight: 600;
    }
    .starter-clearance-notice {
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
      color: #334155;
    }
    .starter-clearance-notice strong {
      display: block;
      color: #0F172A;
      margin-bottom: 3px;
      font-size: 10px;
      letter-spacing: 0.03em;
    }
    .starter-clearance-notice p {
      margin: 0;
    }
    .doc-footer {
      padding-top: 8px;
      border-top: 1px solid #CBD5E1;
      font-size: 9.5px;
      color: #475569;
      display: flex;
      justify-content: space-between;
    }
    .doc-footer a {
      color: #0F172A;
      text-decoration: none;
      font-weight: 700;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${watermarkHtml}

  <div class="doc-header">
    <div class="doc-brand-col">
      ${inlineBrandSvg}
      <div class="doc-brand-text">
        <h1>Laudo Técnico de Homologação de Dados ERP</h1>
        <p>${
          isStarterPlan
            ? 'DataConform • Relatório Preliminar de Inspeção Estrutural e Fiscal (RFC 4180)'
            : `Ambiente Corporativo Licenciado • ${escapeHtml(workspaceName ?? 'Organização Homologada')}`
        }</p>
      </div>
    </div>
    <div class="doc-meta-col">
      <div class="doc-meta-row"><span>Protocolo:</span><strong>${protocolHash}</strong></div>
      <div class="doc-meta-row"><span>Emissão:</span><strong>${nowFormatted}</strong></div>
      <div class="doc-meta-row"><span>Escopo:</span><strong>${isStarterPlan ? 'PRELIMINAR (STARTER)' : `OFICIAL (${resolvedPlanLabel.toUpperCase()})`}</strong></div>
    </div>
  </div>

  <div class="verdict-row">
    <span>PARECER DE ENGENHARIA: ${statusLabel}</span>
    <span>ÍNDICE DE CONFORMIDADE: ${conformityRate}%</span>
  </div>

  <div class="section-label">QUADRO 1 — IDENTIFICAÇÃO DO AMBIENTE E ARQUIVO AUDITADO</div>
  <table class="spec-table">
    <tbody>
      <tr>
        <td>
          <span class="lbl">Organização / Locatário</span>
          <span class="val">${escapeHtml(workspaceName ?? 'Ambiente Corporativo')}</span>
        </td>
        <td>
          <span class="lbl">Projeto de Migração / Carga</span>
          <span class="val">${escapeHtml(projectName ?? 'Homologação de Dados')}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">Sistema / Tabela de Destino (ERP)</span>
          <span class="val">${escapeHtml(targetSystem ?? 'Layout Padrão RFC 4180')}</span>
        </td>
        <td>
          <span class="lbl">Arquivo Submetido</span>
          <span class="val" style="font-family:monospace;">${escapeHtml(report.originalFileName)}</span>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-label">QUADRO 2 — SUMÁRIO VOLUMÉTRICO DO LOTE</div>
  <table class="kpi-matrix">
    <tbody>
      <tr>
        <td>
          <span class="k-lbl">Registros Inspecionados</span>
          <span class="k-val" style="color:#0F172A;">${report.totalRows}</span>
        </td>
        <td>
          <span class="k-lbl">Registros Íntegros</span>
          <span class="k-val" style="color:#065F46;">${report.validRows}</span>
        </td>
        <td>
          <span class="k-lbl">Registros com Restrição</span>
          <span class="k-val" style="color:#991B1B;">${report.errorRows}</span>
        </td>
        <td>
          <span class="k-lbl">Total de Apontamentos</span>
          <span class="k-val" style="color:#1E3A8A;">${report.issues.length}</span>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="section-label">QUADRO 3 — REGISTRO TÉCNICO DE APONTAMENTOS (${pdfIssuesSlice.length} DE ${filteredIssues.length} LISTADOS)</div>
  <table class="issues-grid">
    <thead>
      <tr>
        <th style="width:58px;">Linha</th>
        <th style="width:110px;">Coluna / Campo</th>
        <th style="width:82px;">Natureza</th>
        <th style="width:155px;">Regra Violada</th>
        <th>Diagnóstico Técnico</th>
        <th style="width:130px;">Valor Auditado</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${clearanceFooterHtml}

  <div class="doc-footer">
    <span>Motor de Auditoria Preventiva para ERPs — <a href="https://dataconform.com.br?utm_source=laudo_pdf">https://dataconform.com.br</a></span>
    <span>Autenticação Técnica: ${protocolHash} • Norma RFC 4180 / SEFAZ Módulo 11</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    const printWindow: Window | null = window.open('', '_blank', 'width=1024,height=800');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlDocument);
      printWindow.document.close();
    }
  };

  return (
    <div
      className="modal-backdrop report-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card report-modal-card">
        <div className="modal-header">
          <div>
            <h3>Relatório de Conformidade de Dados</h3>
            <span className="modal-subtitle">
              Arquivo: <strong>{report.originalFileName}</strong>
            </span>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body report-modal-body">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total de Registros</span>
              <span className="kpi-value">{report.totalRows}</span>
            </div>

            <div className="kpi-card kpi-success">
              <span className="kpi-label">Registros Válidos</span>
              <span className="kpi-value">{report.validRows}</span>
            </div>

            <div className="kpi-card kpi-error">
              <span className="kpi-label">Registros c/ Inconsistência</span>
              <span className="kpi-value">{report.errorRows}</span>
            </div>

            <div className="kpi-card kpi-info">
              <span className="kpi-label">Taxa de Conformidade</span>
              <span className="kpi-value">{conformityRate}%</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="report-filter-bar">
            <div className="filter-group">
              <button
                type="button"
                className={`filter-btn ${severityFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setSeverityFilter('all');
                  setCurrentPage(1);
                }}
              >
                Todas ({report.issues.length})
              </button>
              <button
                type="button"
                className={`filter-btn filter-error ${severityFilter === '1' ? 'active' : ''}`}
                onClick={() => {
                  setSeverityFilter('1');
                  setCurrentPage(1);
                }}
              >
                Erros ({errorCount})
              </button>
              <button
                type="button"
                className={`filter-btn filter-warning ${severityFilter === '0' ? 'active' : ''}`}
                onClick={() => {
                  setSeverityFilter('0');
                  setCurrentPage(1);
                }}
              >
                Avisos ({warningCount})
              </button>
            </div>

            <div className="search-group">
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="Filtrar por coluna, código ou mensagem..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Issues Table */}
          {filteredIssues.length === 0 ? (
            <div className="empty-issues">
              {report.issues.length === 0 ? (
                <div className="success-banner">
                  <span className="banner-icon">✅</span>
                  <div>
                    <h4>Arquivo 100% em Conformidade!</h4>
                    <p>Nenhuma inconsistência ou erro de formato foi detectado no arquivo.</p>
                  </div>
                </div>
              ) : (
                <p>Nenhuma inconsistência encontrada para os filtros aplicados.</p>
              )}
            </div>
          ) : (
            <div className="table-responsive issues-table-container">
              <table className="data-table issues-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Linha</th>
                    <th style={{ width: '130px' }}>Coluna</th>
                    <th style={{ width: '100px' }}>Severidade</th>
                    <th style={{ width: '200px' }}>Código</th>
                    <th>Mensagem de Validação</th>
                    <th>Valor Capturado</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedIssues.map((issue: ValidationIssueDto) => (
                    <tr key={issue.id}>
                      <td>
                        <span className="row-badge">#{issue.rowNumber ?? '—'}</span>
                      </td>
                      <td>
                        <strong>{issue.columnName ?? 'Geral'}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${isErrorSeverity(issue.severity) ? 'badge-failed' : 'badge-warning'}`}
                        >
                          {IssueSeverityLabels[String(issue.severity)] ?? String(issue.severity)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="code-copy-btn"
                          title="Clique para copiar código"
                          onClick={() => handleCopyText(issue.issueCode)}
                        >
                          <code className="issue-code">{issue.issueCode}</code>
                          <span className="copy-indicator">
                            {copiedText === issue.issueCode ? '✓ Copiado' : '📋'}
                          </span>
                        </button>
                      </td>
                      <td>{issue.message}</td>
                      <td>
                        {issue.rawValue ? (
                          <button
                            type="button"
                            className="val-copy-btn"
                            title="Clique para copiar valor"
                            onClick={() => handleCopyText(issue.rawValue!)}
                          >
                            <code className="raw-val-badge">{issue.rawValue}</code>
                            {copiedText === issue.rawValue && (
                              <span className="copy-indicator-inline">✓</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalIssues > pageSize && (
                <div className="table-pagination-bar" style={{ marginTop: '12px' }}>
                  <div className="pagination-info">
                    Mostrando <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> de{' '}
                    <strong>{totalIssues}</strong> inconsistências
                  </div>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                      disabled={safeCurrentPage === 1}
                    >
                      Anterior
                    </button>
                    <span className="pagination-pages" style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                      Página {safeCurrentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                      disabled={safeCurrentPage === totalPages}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer report-modal-footer">
          <button
            type="button"
            className="btn btn-outline btn-copy-summary"
            onClick={handleCopySummary}
            title="Copiar resumo formatado do laudo para colar em chamados, Slack, Teams ou e-mail"
          >
            {copiedSummary ? '✓ Resumo Copiado!' : '📋 Copiar Resumo Técnico'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-export-pdf"
            onClick={handleExportPdf}
            title="Gerar Laudo Técnico Executivo timbrado para impressão ou salvar em PDF"
          >
            📄 Exportar Laudo em PDF
          </button>
          {filteredIssues.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-export-csv"
              onClick={handleExportCsv}
              title="Baixar lista filtrada de inconsistências em formato CSV"
            >
              📥 Exportar CSV ({filteredIssues.length})
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
