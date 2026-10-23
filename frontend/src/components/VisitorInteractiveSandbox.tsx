import { useState } from 'react';
import type { FC } from 'react';
import type { ValidationReportDto } from '../types';

interface VisitorInteractiveSandboxProps {
  onOpenReportModal: (report: ValidationReportDto, erpName: string) => void;
  onOpenRegister: () => void;
}

interface SandboxErpScenario {
  erpKey: string;
  erpLabel: string;
  moduleTag: string;
  sampleCsvLines: string[];
  simulatedReport: ValidationReportDto;
}

const SANDBOX_SCENARIOS: SandboxErpScenario[] = [
  {
    erpKey: 'TOTVS Protheus',
    erpLabel: 'TOTVS Protheus',
    moduleTag: 'SA1010 (Clientes)',
    sampleCsvLines: [
      'A1_COD,A1_LOJA,A1_NOME,A1_CGC,A1_EMAIL,A1_LC,A1_EST',
      '000101,01,Alpha Tecnologia e Sistemas LTDA,12.345.678/0001-95,fiscal@alphatech.com.br,50000.00,SP',
      '000102,01,Metalurgica Delta Ind SA,12.345.678/0001-00,nfe-sem-dominio,120000.50,PR',
      '000103,01,Comercio Sulista LTDA,11.222.333/0001-81,financeiro@sulista.com.br,-4500.00,SC',
    ],
    simulatedReport: {
      fileId: 'demo-protheus-sa1010-2026',
      originalFileName: 'carga_clientes_protheus_sa1010.csv',
      status: 2,
      totalRows: 3,
      validRows: 1,
      errorRows: 2,
      issues: [
        {
          id: 'iss-protheus-1',
          rowNumber: 2,
          columnName: 'A1_CGC',
          severity: 'Error',
          issueCode: 'INVALID_TAX_ID',
          message: 'CNPJ com dígito verificador matemático inválido (Módulo 11 rejeitado pela SEFAZ/SX3).',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-protheus-2',
          rowNumber: 2,
          columnName: 'A1_EMAIL',
          severity: 'Error',
          issueCode: 'INVALID_EMAIL_FORMAT',
          message: 'E-mail de destino para NF-e fora do padrão RFC 5322 (ausência de domínio @).',
          rawValue: 'nfe-sem-dominio',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-protheus-3',
          rowNumber: 3,
          columnName: 'A1_LC',
          severity: 'Error',
          issueCode: 'NEGATIVE_FINANCIAL_VALUE',
          message: 'Limite de crédito (A1_LC) negativo não permitido pela rotina automática MATA030.',
          rawValue: '-4500.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'SAP Business One',
    erpLabel: 'SAP Business One',
    moduleTag: 'DTW / OCRD',
    sampleCsvLines: [
      'CardCode,CardName,CardType,LicTradNum,E_Mail,CreditLine',
      'C10001,Horizonte Suprimentos Industriais SA,C,12.345.678/0001-95,nfe@horizontesupri.com.br,85000.00',
      'C10002,Vanguarda Metalurgica LTDA,C,99.999.999/0001-99,compras@vanguarda.ind.br,140000.00',
      'C10003,Logistica Express Brasil SA,C,11.222.333/0001-81,contato.invalido.com,-900.00',
    ],
    simulatedReport: {
      fileId: 'demo-sap-b1-ocrd-2026',
      originalFileName: 'dtw_business_partners_ocrd.csv',
      status: 2,
      totalRows: 3,
      validRows: 1,
      errorRows: 2,
      issues: [
        {
          id: 'iss-sapb1-1',
          rowNumber: 2,
          columnName: 'LicTradNum',
          severity: 'Error',
          issueCode: 'INVALID_TAX_ID',
          message: 'Documento fiscal LicTradNum inválido (sequência repetida bloqueada pelo Data Transfer Workbench).',
          rawValue: '99.999.999/0001-99',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sapb1-2',
          rowNumber: 3,
          columnName: 'E_Mail',
          severity: 'Error',
          issueCode: 'INVALID_EMAIL_FORMAT',
          message: 'Formato de endereço eletrônico inválido na coluna E_Mail.',
          rawValue: 'contato.invalido.com',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sapb1-3',
          rowNumber: 3,
          columnName: 'CreditLine',
          severity: 'Error',
          issueCode: 'NEGATIVE_FINANCIAL_VALUE',
          message: 'Valor financeiro negativo detectado no campo CreditLine.',
          rawValue: '-900.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'SAP S/4HANA',
    erpLabel: 'SAP S/4HANA',
    moduleTag: 'Migration Cockpit (BP)',
    sampleCsvLines: [
      'BP_Number,Name1,TaxId0,E_Mail,CreditLine,ValidFrom',
      'BP0010,Atlas Engenharia Corporativa SA,12.345.678/0001-95,tesouraria@atlaseng.com.br,250000.00,2026-01-15',
      'BP0011,Construtora Vale Verde LTDA,12.345.678/0001-00,fiscal@valeverde.com.br,95000.00,2026-15-99',
    ],
    simulatedReport: {
      fileId: 'demo-s4hana-bp-2026',
      originalFileName: 's4hana_migration_cockpit_bp.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-s4-1',
          rowNumber: 2,
          columnName: 'TaxId0',
          severity: 'Error',
          issueCode: 'INVALID_TAX_ID',
          message: 'TaxId0 (CNPJ) com dígito verificador inválido para localização Brasil (BR1).',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-s4-2',
          rowNumber: 2,
          columnName: 'ValidFrom',
          severity: 'Error',
          issueCode: 'INVALID_DATE_FORMAT',
          message: 'Data calendário inexistente (2026-15-99). O SAP S/4HANA exige padrão ISO 8601 válido.',
          rawValue: '2026-15-99',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'Sankhya',
    erpLabel: 'Sankhya Om',
    moduleTag: 'TGFPAR (Parceiros)',
    sampleCsvLines: [
      'CODPARC,NOMEPARC,CGC_CPF,EMAIL,LIMCRED,ATIVO',
      '501,Cerrado Agroindustrial LTDA,12.345.678/0001-95,contabil@cerradoagro.com.br,180000.00,S',
      '502,Distribuidora Centro Oeste SA,12.345.678/0001-00,sem-arroba.com.br,-3000.00,S',
    ],
    simulatedReport: {
      fileId: 'demo-sankhya-tgfpar-2026',
      originalFileName: 'sankhya_parceiros_tgfpar.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-sk-1',
          rowNumber: 2,
          columnName: 'CGC_CPF',
          severity: 'Error',
          issueCode: 'INVALID_TAX_ID',
          message: 'CGC_CPF inválido segundo cálculo oficial da Receita Federal.',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sk-2',
          rowNumber: 2,
          columnName: 'EMAIL',
          severity: 'Error',
          issueCode: 'INVALID_EMAIL_FORMAT',
          message: 'E-mail malformado na coluna EMAIL.',
          rawValue: 'sem-arroba.com.br',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sk-3',
          rowNumber: 2,
          columnName: 'LIMCRED',
          severity: 'Error',
          issueCode: 'NEGATIVE_FINANCIAL_VALUE',
          message: 'Limite de crédito (LIMCRED) não pode ser negativo.',
          rawValue: '-3000.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
];

export const VisitorInteractiveSandbox: FC<VisitorInteractiveSandboxProps> = ({
  onOpenReportModal,
  onOpenRegister,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const scenario: SandboxErpScenario = SANDBOX_SCENARIOS[selectedIndex];
  const report: ValidationReportDto = scenario.simulatedReport;
  const conformityRate: number = Math.round((report.validRows / report.totalRows) * 100);

  return (
    <section className="visitor-sandbox-section">
      <div className="sandbox-header-bar">
        <div>
          <span className="sandbox-eyebrow">⚡ DEMONSTRAÇÃO INTERATIVA (ZERO SETUP)</span>
          <h2>Simulador de Homologação Ao Vivo</h2>
          <p className="section-subtitle">
            Selecione um ERP abaixo para ver como o motor do DataConform intercepta erros fiscais e cadastrais antes que a carga falhe no banco de dados.
          </p>
        </div>

        <div className="sandbox-erp-tabs" role="tablist">
          {SANDBOX_SCENARIOS.map((item: SandboxErpScenario, idx: number) => (
            <button
              key={item.erpKey}
              type="button"
              role="tab"
              aria-selected={selectedIndex === idx}
              className={`sandbox-tab-btn ${selectedIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedIndex(idx)}
            >
              <strong>{item.erpLabel}</strong>
              <span className="sandbox-tab-sub">{item.moduleTag}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sandbox-split-grid">
        {/* Lado Esquerdo: Planilha CSV de Entrada */}
        <div className="sandbox-pane sandbox-input-pane">
          <div className="sandbox-pane-header">
            <span className="pane-step-badge">1. Entrada Bruta (.CSV)</span>
            <code className="pane-filename">{report.originalFileName}</code>
          </div>
          <div className="sandbox-code-box">
            {scenario.sampleCsvLines.map((line: string, lineIdx: number) => {
              const isHeader: boolean = lineIdx === 0;
              const isValidRow: boolean = lineIdx === 1;
              return (
                <div
                  key={`${scenario.erpKey}-line-${lineIdx}`}
                  className={`csv-line ${
                    isHeader ? 'csv-line-header' : isValidRow ? 'csv-line-valid' : 'csv-line-error'
                  }`}
                >
                  <span className="csv-line-num">{isHeader ? 'HDR' : `#${lineIdx}`}</span>
                  <span className="csv-line-text">{line}</span>
                </div>
              );
            })}
          </div>
          <div className="sandbox-input-legend">
            <span className="legend-item"><span className="dot dot-valid" /> Linha #1: Íntegra</span>
            <span className="legend-item"><span className="dot dot-error" /> Demais linhas: Erros ocultos que travariam o {scenario.erpLabel}</span>
          </div>
        </div>

        {/* Lado Direito: Diagnóstico Automático */}
        <div className="sandbox-pane sandbox-output-pane">
          <div className="sandbox-pane-header">
            <span className="pane-step-badge pane-badge-output">2. Laudo Instantâneo DataConform</span>
            <span className="badge badge-failed">{report.issues.length} desvios bloqueados</span>
          </div>

          <div className="sandbox-mini-kpis">
            <div className="mini-kpi">
              <span>Analisados</span>
              <strong>{report.totalRows}</strong>
            </div>
            <div className="mini-kpi mini-kpi-ok">
              <span>Aprovados</span>
              <strong>{report.validRows}</strong>
            </div>
            <div className="mini-kpi mini-kpi-err">
              <span>Com Falha</span>
              <strong>{report.errorRows}</strong>
            </div>
            <div className="mini-kpi mini-kpi-rate">
              <span>Conformidade</span>
              <strong>{conformityRate}%</strong>
            </div>
          </div>

          <div className="sandbox-issues-list">
            {report.issues.map((issue) => (
              <div key={issue.id} className="sandbox-issue-item">
                <div className="sandbox-issue-top">
                  <span className="row-badge">Linha #{issue.rowNumber}</span>
                  <strong className="sandbox-col-name">{issue.columnName}</strong>
                  <code className="issue-code">{issue.issueCode}</code>
                </div>
                <p className="sandbox-issue-msg">{issue.message}</p>
                {issue.rawValue && (
                  <div className="sandbox-issue-raw">
                    Valor rejeitado: <code>{issue.rawValue}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sandbox-footer-cta">
        <div className="sandbox-footer-info">
          <strong>Quer ver o laudo executivo completo ou exportar em PDF agora mesmo?</strong>
          <span>Experimente abrir o relatório interativo desta simulação ou crie sua conta gratuita para validar seus próprios arquivos.</span>
        </div>
        <div className="sandbox-footer-buttons">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenReportModal(report, scenario.erpKey)}
          >
            📄 Abrir Laudo Completo & Testar PDF
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenRegister}
          >
            🚀 Auditar Minhas Planilhas Reais
          </button>
        </div>
      </div>
    </section>
  );
};
