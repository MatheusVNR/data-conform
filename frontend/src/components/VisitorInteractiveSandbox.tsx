import { useState } from 'react';
import type { FC } from 'react';
import type { ValidationReportDto } from '../types';

interface VisitorInteractiveSandboxProps {
  initialErpKey?: string | null;
  onOpenReportModal: (report: ValidationReportDto, erpName: string) => void;
  onOpenRegister: () => void;
}

interface SandboxErpScenario {
  erpKey: string;
  erpLabel: string;
  moduleTag: string;
  aliases: string[];
  sampleCsvLines: string[];
  simulatedReport: ValidationReportDto;
}

const SANDBOX_SCENARIOS: SandboxErpScenario[] = [
  {
    erpKey: 'TOTVS Protheus',
    erpLabel: 'TOTVS Protheus',
    moduleTag: 'SA1010 (Clientes)',
    aliases: ['protheus-sa1', 'totvs-protheus', 'totvs-protheus-sa1', 'sa1', 'sa1010'],
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
          issueCode: 'INVALID_DOCUMENT_FORMAT',
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
          message: 'E-mail de destino para NF-e fora do padrão (ausência de domínio @).',
          rawValue: 'nfe-sem-dominio',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-protheus-3',
          rowNumber: 3,
          columnName: 'A1_LC',
          severity: 'Error',
          issueCode: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
          message: 'Limite de crédito (A1_LC) negativo não permitido pela rotina automática MATA030.',
          rawValue: '-4500.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'TOTVS Protheus - Fornecedores',
    erpLabel: 'Protheus SA2',
    moduleTag: 'SA2010 (Fornecedores)',
    aliases: ['protheus-sa2', 'totvs-protheus-sa2', 'totvs-protheus-fornecedores', 'sa2', 'sa2010'],
    sampleCsvLines: [
      'A2_COD,A2_LOJA,A2_NOME,A2_CGC,A2_EMAIL,A2_LC,A2_EST',
      'F00101,01,Industria Metalurgica Vale SA,12.345.678/0001-95,suprimentos@valeind.com.br,200000.00,MG',
      'F00102,01,Fornecedor Doc Invalido LTDA,12.345.678/0001-00,compras-sem-dominio,75000.00,ZZ',
    ],
    simulatedReport: {
      fileId: 'demo-protheus-sa2010-2026',
      originalFileName: 'layout_totvs_protheus_sa2.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-protheus-sa2-1',
          rowNumber: 2,
          columnName: 'A2_CGC',
          severity: 'Error',
          issueCode: 'INVALID_DOCUMENT_FORMAT',
          message: 'Documento fiscal A2_CGC inválido na rotina automática MATA020 (Módulo 11 reprovado).',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-protheus-sa2-2',
          rowNumber: 2,
          columnName: 'A2_EST',
          severity: 'Error',
          issueCode: 'INVALID_UF_CODE',
          message: 'Sigla de UF inválida na coluna A2_EST (esperado uma das 27 UFs do Brasil ou EX).',
          rawValue: 'ZZ',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'TOTVS Protheus - Produtos',
    erpLabel: 'Protheus SB1',
    moduleTag: 'SB1010 (Produtos)',
    aliases: ['protheus-sb1', 'totvs-protheus-sb1', 'totvs-protheus-produtos', 'sb1', 'sb1010'],
    sampleCsvLines: [
      'B1_COD,B1_DESC,B1_TIPO,B1_UM,B1_POSIPI,B1_PRV1',
      'PRD001,Servidor Rack Corporativo Xeon,PA,UN,8471.49.00,18500.00',
      'PRD002,Item Com NCM Truncado Excel,PA,UN,8471.49,-250.00',
    ],
    simulatedReport: {
      fileId: 'demo-protheus-sb1010-2026',
      originalFileName: 'layout_totvs_protheus_sb1.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-protheus-sb1-1',
          rowNumber: 2,
          columnName: 'B1_POSIPI',
          severity: 'Error',
          issueCode: 'INVALID_NCM_FORMAT',
          message: 'Código NCM inválido na coluna B1_POSIPI (deve possuir exatamente 8 dígitos numéricos).',
          rawValue: '8471.49',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-protheus-sb1-2',
          rowNumber: 2,
          columnName: 'B1_PRV1',
          severity: 'Error',
          issueCode: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
          message: 'Preço de venda negativo não permitido na coluna B1_PRV1 (MATA010).',
          rawValue: '-250.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'SAP Business One',
    erpLabel: 'SAP Business One',
    moduleTag: 'DTW / OCRD',
    aliases: ['sap-b1-ocrd', 'sap-business-one', 'ocrd', 'sap-b1'],
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
          issueCode: 'INVALID_DOCUMENT_FORMAT',
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
          issueCode: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
          message: 'Valor financeiro negativo detectado no campo CreditLine.',
          rawValue: '-900.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'SAP Business One - Itens',
    erpLabel: 'SAP B1 OITM',
    moduleTag: 'DTW / OITM (Itens)',
    aliases: ['sap-b1-oitm', 'sap-business-one-itens', 'oitm'],
    sampleCsvLines: [
      'ItemCode,ItemName,SalUnitMsr,Price,NcmCode',
      'ITM001,Monitor Led 27 Polegadas 4K,PC,1650.00,8528.52.20',
      'ITM002,Teclado Com NCM Incompleto,PC,-120.00,8471605',
    ],
    simulatedReport: {
      fileId: 'demo-sap-b1-oitm-2026',
      originalFileName: 'layout_sap_b1_oitm.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-sapb1-oitm-1',
          rowNumber: 2,
          columnName: 'NcmCode',
          severity: 'Error',
          issueCode: 'INVALID_NCM_FORMAT',
          message: 'Código NCM na coluna NcmCode possui 7 dígitos (esperado 8 dígitos numéricos para tabela ONCM).',
          rawValue: '8471605',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sapb1-oitm-2',
          rowNumber: 2,
          columnName: 'Price',
          severity: 'Error',
          issueCode: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
          message: 'Preço unitário negativo não permitido na coluna Price do objeto OITM.',
          rawValue: '-120.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'SAP S/4HANA',
    erpLabel: 'SAP S/4HANA',
    moduleTag: 'Migration Cockpit (BP)',
    aliases: ['sap-s4hana-bp', 'sap-s4hana', 's4hana'],
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
          issueCode: 'INVALID_DOCUMENT_FORMAT',
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
    erpKey: 'Senior ERP',
    erpLabel: 'Senior ERP',
    moduleTag: 'E085CLI (Sapiens)',
    aliases: ['senior-e085cli', 'senior-erp', 'senior', 'e085cli'],
    sampleCsvLines: [
      'CodCli,NomCli,CgcCpf,EmaCli,VlrLim,SitCli,CodEst',
      '2001,SulBrasil Transportes e Logistica SA,12.345.678/0001-95,fiscal@sulbrasil.com.br,95000.00,A,RS',
      '2002,Cliente Senior Doc Invalido LTDA,12.345.678/0001-00,email-quebrado.com,-1200.00,A,ZZ',
    ],
    simulatedReport: {
      fileId: 'demo-senior-e085cli-2026',
      originalFileName: 'layout_senior_erp_e085cli.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-sr-1',
          rowNumber: 2,
          columnName: 'CgcCpf',
          severity: 'Error',
          issueCode: 'INVALID_DOCUMENT_FORMAT',
          message: 'Documento CgcCpf inválido para gravação na tabela E085CLI do Senior ERP.',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-sr-2',
          rowNumber: 2,
          columnName: 'CodEst',
          severity: 'Error',
          issueCode: 'INVALID_UF_CODE',
          message: 'Sigla estadual ZZ inválida na coluna CodEst.',
          rawValue: 'ZZ',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'Sankhya',
    erpLabel: 'Sankhya Om',
    moduleTag: 'TGFPAR (Parceiros)',
    aliases: ['sankhya-tgfpar', 'sankhya', 'tgfpar'],
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
          issueCode: 'INVALID_DOCUMENT_FORMAT',
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
          issueCode: 'NEGATIVE_AMOUNT_NOT_ALLOWED',
          message: 'Limite de crédito (LIMCRED) não pode ser negativo.',
          rawValue: '-3000.00',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'Omie',
    erpLabel: 'Omie ERP',
    moduleTag: 'Planilha Clientes',
    aliases: ['omie-clientes', 'omie'],
    sampleCsvLines: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,estado,cep',
      '1001,Alpha Tecnologia e Servicos LTDA,12.345.678/0001-95,contato@alphatech.com.br,50000.00,SP,01310-100',
      '1002,Invalido Valor Negativo ME,12.345.678/0001-00,email-sem-arroba.com,-4500.00,XX,0000',
    ],
    simulatedReport: {
      fileId: 'demo-omie-clientes-2026',
      originalFileName: 'layout_omie_clientes.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-omie-1',
          rowNumber: 2,
          columnName: 'cnpj_cpf',
          severity: 'Error',
          issueCode: 'INVALID_DOCUMENT_FORMAT',
          message: 'CNPJ inválido na coluna cnpj_cpf (dígito verificador Módulo 11 incorreto).',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-omie-2',
          rowNumber: 2,
          columnName: 'cep',
          severity: 'Error',
          issueCode: 'INVALID_CEP_FORMAT',
          message: 'CEP inválido na coluna cep (esperado 8 dígitos numéricos válidos).',
          rawValue: '0000',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
  {
    erpKey: 'ContaAzul',
    erpLabel: 'ContaAzul',
    moduleTag: 'Carga Cadastral',
    aliases: ['contaazul-clientes', 'contaazul'],
    sampleCsvLines: [
      'codigo_cliente,razao_social,cnpj_cpf,email,valor_limite_credito,data_vencimento,uf',
      'CA01,Nova Era Consultoria Contabil LTDA,12.345.678/0001-95,contato@novaera.cnt.br,45000.00,2026-12-31,SP',
      'CA02,Registro Com Inconsistencias ME,12.345.678/0001-00,email-invalido,-1500.00,data-errada,XX',
    ],
    simulatedReport: {
      fileId: 'demo-contaazul-clientes-2026',
      originalFileName: 'layout_contaazul_clientes.csv',
      status: 2,
      totalRows: 2,
      validRows: 1,
      errorRows: 1,
      issues: [
        {
          id: 'iss-ca-1',
          rowNumber: 2,
          columnName: 'cnpj_cpf',
          severity: 'Error',
          issueCode: 'INVALID_DOCUMENT_FORMAT',
          message: 'Documento cnpj_cpf inválido (dígito verificador Módulo 11 reprovado).',
          rawValue: '12.345.678/0001-00',
          createdAt: '2026-10-22T12:00:00Z',
        },
        {
          id: 'iss-ca-2',
          rowNumber: 2,
          columnName: 'data_vencimento',
          severity: 'Error',
          issueCode: 'INVALID_DATE_FORMAT',
          message: 'Data inválida na coluna data_vencimento (use AAAA-MM-DD ou DD/MM/AAAA).',
          rawValue: 'data-errada',
          createdAt: '2026-10-22T12:00:00Z',
        },
      ],
    },
  },
];

function resolveScenarioIndex(erpQuery?: string | null): number {
  if (!erpQuery) return 0;
  const normalized: string = erpQuery.trim().toLowerCase();
  if (!normalized) return 0;

  const exactIndex: number = SANDBOX_SCENARIOS.findIndex(
    (s: SandboxErpScenario) =>
      s.erpKey.toLowerCase() === normalized ||
      s.erpLabel.toLowerCase() === normalized ||
      s.aliases.some((alias: string) => alias.toLowerCase() === normalized)
  );
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const partialIndex: number = SANDBOX_SCENARIOS.findIndex(
    (s: SandboxErpScenario) =>
      s.erpKey.toLowerCase().includes(normalized) ||
      s.aliases.some((alias: string) => alias.toLowerCase().includes(normalized))
  );
  return partialIndex >= 0 ? partialIndex : 0;
}

export const VisitorInteractiveSandbox: FC<VisitorInteractiveSandboxProps> = ({
  initialErpKey,
  onOpenReportModal,
  onOpenRegister,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    if (initialErpKey) {
      return resolveScenarioIndex(initialErpKey);
    }
    if (typeof window !== 'undefined') {
      const param: string | null = new URLSearchParams(window.location.search).get('erp');
      return resolveScenarioIndex(param);
    }
    return 0;
  });

  const scenario: SandboxErpScenario = SANDBOX_SCENARIOS[selectedIndex] ?? SANDBOX_SCENARIOS[0];
  const report: ValidationReportDto = scenario.simulatedReport;
  const conformityRate: number = Math.round((report.validRows / report.totalRows) * 100);

  return (
    <section id="sandbox" className="visitor-sandbox-section">
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
            <div className="pane-header-title-wrap">
              <span className="pane-step-badge">1. Entrada Bruta (.CSV)</span>
              <span className="pane-mobile-swipe-hint">⟷ Arraste p/ ver colunas</span>
            </div>
            <code className="pane-filename" title={report.originalFileName}>
              {report.originalFileName}
            </code>
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
            <span className="legend-item"><span className="dot dot-error" /> Demais: Erros bloqueados</span>
          </div>
        </div>

        {/* Lado Direito: Diagnóstico Automático */}
        <div className="sandbox-pane sandbox-output-pane">
          <div className="sandbox-pane-header">
            <div className="pane-header-title-wrap">
              <span className="pane-step-badge pane-badge-output">2. Laudo Instantâneo DataConform</span>
            </div>
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
