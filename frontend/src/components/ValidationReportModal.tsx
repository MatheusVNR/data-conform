import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import type { ValidationIssueDto, ValidationReportDto } from '../types';
import { IssueSeverityLabels } from '../types';

interface ValidationReportModalProps {
  report: ValidationReportDto | null;
  projectName?: string | null;
  targetSystem?: string | null;
  workspaceName?: string | null;
  onClose: () => void;
}

const isErrorSeverity = (s: unknown): boolean => s === 1 || s === '1' || s === 'Error' || s === 'error';
const isWarningSeverity = (s: unknown): boolean => s === 0 || s === '0' || s === 'Warning' || s === 'warning';

export const ValidationReportModal: FC<ValidationReportModalProps> = ({
  report,
  projectName,
  targetSystem,
  workspaceName,
  onClose,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | '1' | '0'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

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

    const headers: string[] = ['Linha', 'Coluna', 'Severidade', 'Codigo', 'Mensagem', 'Valor Capturado'];
    const rows: string[][] = filteredIssues.map((issue: ValidationIssueDto) => [
      issue.rowNumber ? String(issue.rowNumber) : '',
      issue.columnName ?? 'Geral',
      isErrorSeverity(issue.severity) ? 'Erro' : 'Aviso',
      sanitizeCsvCell(issue.issueCode),
      sanitizeCsvCell(issue.message),
      sanitizeCsvCell(issue.rawValue),
    ]);

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
      `📊 LAUDO TÉCNICO DE HOMOLOGAÇÃO — DATACONFORM`,
      `Arquivo: ${report.originalFileName}`,
      `Total de Registros: ${report.totalRows} | Válidos: ${report.validRows} | Com Inconsistência: ${report.errorRows}`,
      `Taxa de Conformidade: ${conformityRate}% (${errorCount} erros, ${warningCount} avisos)`,
      ``,
      `Principais Apontamentos:`,
      topIssues,
      filteredIssues.length > 10 ? `\n(...e mais ${filteredIssues.length - 10} apontamentos no relatório completo)` : '',
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
      ? 'HOMOLOGADO — APTO PARA CARGA NO ERP'
      : 'REPROVADO PARA CARGA DIRETA — SANEAMENTO REQUERIDO';
    const statusColor: string = isApproved ? '#059669' : '#DC2626';
    const statusBg: string = isApproved ? '#ECFDF5' : '#FEF2F2';

    const rowsHtml: string =
      filteredIssues.length === 0
        ? `<tr><td colspan="6" style="text-align:center; padding: 24px; color: #059669; font-weight: 600;">Nenhuma inconsistência detectada. Lote 100% em conformidade com as regras do dicionário ERP.</td></tr>`
        : filteredIssues
            .map((issue: ValidationIssueDto) => {
              const isErr: boolean = isErrorSeverity(issue.severity);
              const sevBadge: string = isErr
                ? `<span style="background:#FEE2E2;color:#B91C1C;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">ERRO</span>`
                : `<span style="background:#FEF3C7;color:#B45309;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">AVISO</span>`;
              return `
                <tr>
                  <td style="font-family:monospace;font-weight:700;">#${issue.rowNumber ?? 'Geral'}</td>
                  <td><strong>${escapeHtml(issue.columnName ?? 'Geral')}</strong></td>
                  <td>${sevBadge}</td>
                  <td style="font-family:monospace;font-size:11px;color:#1E40AF;">${escapeHtml(issue.issueCode)}</td>
                  <td>${escapeHtml(issue.message)}</td>
                  <td style="font-family:monospace;font-size:11px;color:#475569;">${escapeHtml(issue.rawValue)}</td>
                </tr>
              `;
            })
            .join('');

    const htmlDocument: string = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Laudo Executivo DataConform - ${escapeHtml(report.originalFileName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 32px;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin: 0;
    }
    .brand-sub {
      font-size: 12px;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .protocol-box {
      text-align: right;
      font-size: 12px;
      color: #334155;
    }
    .protocol-hash {
      font-family: monospace;
      font-weight: 700;
      font-size: 13px;
      color: #1D4ED8;
      background: #EFF6FF;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #BFDBFE;
      display: inline-block;
      margin-bottom: 4px;
    }
    .status-banner {
      background: ${statusBg};
      border: 1.5px solid ${statusColor};
      color: ${statusColor};
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 24px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .meta-item span {
      color: #64748B;
      font-size: 12px;
    }
    .meta-item strong {
      color: #0F172A;
      margin-left: 6px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-box {
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .kpi-box .label {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 700;
      display: block;
      margin-bottom: 4px;
    }
    .kpi-box .val {
      font-size: 20px;
      font-weight: 800;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
      font-size: 12px;
    }
    th {
      background: #F1F5F9;
      color: #334155;
      text-align: left;
      padding: 9px 10px;
      border-bottom: 2px solid #CBD5E1;
      font-size: 11px;
      text-transform: uppercase;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      margin-top: 44px;
      padding-top: 20px;
    }
    .sign-line {
      border-top: 1px solid #334155;
      padding-top: 8px;
      text-align: center;
      font-size: 12px;
      color: #475569;
    }
    .footer-note {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #64748B;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-row">
      <div>
        <h1 class="brand-title">DataConform — Laudo Técnico de Homologação ERP</h1>
        <p class="brand-sub">Auditoria Preventiva de Qualidade Cadastral, Fiscal e Estrutural de Dados</p>
      </div>
    </div>
    <div class="protocol-box">
      <div class="protocol-hash">PROTOCOLO: ${protocolHash}</div>
      <div>Emitido em: <strong>${nowFormatted}</strong></div>
    </div>
  </div>

  <div class="status-banner">
    <span>PARECER TÉCNICO: ${statusLabel}</span>
    <span>Conformidade: ${conformityRate}%</span>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span>Organização:</span><strong>${escapeHtml(workspaceName ?? 'Ambiente Corporativo')}</strong></div>
    <div class="meta-item"><span>Projeto de Carga:</span><strong>${escapeHtml(projectName ?? 'Homologação de Dados')}</strong></div>
    <div class="meta-item"><span>Sistema / ERP Destino:</span><strong>${escapeHtml(targetSystem ?? 'Padrão Homologado')}</strong></div>
    <div class="meta-item"><span>Arquivo Auditado:</span><strong>${escapeHtml(report.originalFileName)}</strong></div>
  </div>

  <div class="kpi-row">
    <div class="kpi-box">
      <span class="label">Total de Linhas</span>
      <span class="val">${report.totalRows}</span>
    </div>
    <div class="kpi-box">
      <span class="label">Registros Íntegros</span>
      <span class="val" style="color:#059669;">${report.validRows}</span>
    </div>
    <div class="kpi-box">
      <span class="label">Registros c/ Falha</span>
      <span class="val" style="color:#DC2626;">${report.errorRows}</span>
    </div>
    <div class="kpi-box">
      <span class="label">Apontamentos</span>
      <span class="val" style="color:#1D4ED8;">${report.issues.length}</span>
    </div>
  </div>

  <h3 style="margin: 0 0 10px 0; font-size: 14px;">Detalhamento Técnico de Apontamentos (${filteredIssues.length} registros listados)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:65px;">Linha</th>
        <th style="width:110px;">Coluna</th>
        <th style="width:80px;">Severidade</th>
        <th style="width:155px;">Código Regra</th>
        <th>Diagnóstico Técnico</th>
        <th style="width:130px;">Valor Capturado</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="sign-grid">
    <div class="sign-line">
      <strong>Responsável Técnico / Consultor de Implantação</strong><br/>
      Conferência de Layout e Saneamento
    </div>
    <div class="sign-line">
      <strong>Homologador da Área de Negócio (Cliente)</strong><br/>
      Ciência e Aprovação Cadastral / Fiscal
    </div>
  </div>

  <div class="footer-note">
    <span>Gerado eletronicamente por DataConform (https://dataconform.com.br)</span>
    <span>Protocolo de Auditoria: ${protocolHash}</span>
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
                onClick={() => setSeverityFilter('all')}
              >
                Todas ({report.issues.length})
              </button>
              <button
                type="button"
                className={`filter-btn filter-error ${severityFilter === '1' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('1')}
              >
                Erros ({errorCount})
              </button>
              <button
                type="button"
                className={`filter-btn filter-warning ${severityFilter === '0' ? 'active' : ''}`}
                onClick={() => setSeverityFilter('0')}
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  {filteredIssues.map((issue: ValidationIssueDto) => (
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
