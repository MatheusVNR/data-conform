import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import type { ValidationIssueDto, ValidationReportDto } from '../types';
import { IssueSeverityLabels } from '../types';

interface ValidationReportModalProps {
  report: ValidationReportDto | null;
  onClose: () => void;
}

const isErrorSeverity = (s: unknown): boolean => s === 1 || s === '1' || s === 'Error' || s === 'error';
const isWarningSeverity = (s: unknown): boolean => s === 0 || s === '0' || s === 'Warning' || s === 'warning';

export const ValidationReportModal: FC<ValidationReportModalProps> = ({ report, onClose }) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | '1' | '0'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

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

    const headers: string[] = ['Linha', 'Coluna', 'Severidade', 'Codigo', 'Mensagem', 'Valor Capturado'];
    const rows: string[][] = filteredIssues.map((issue: ValidationIssueDto) => [
      issue.rowNumber ? String(issue.rowNumber) : '',
      issue.columnName ?? 'Geral',
      isErrorSeverity(issue.severity) ? 'Erro' : 'Aviso',
      issue.issueCode,
      `"${(issue.message ?? '').replace(/"/g, '""')}"`,
      `"${(issue.rawValue ?? '').replace(/"/g, '""')}"`,
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
