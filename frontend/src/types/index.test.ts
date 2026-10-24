import { describe, expect, it } from 'vitest';
import { ERP_PRESETS, getErpPreset, PLAN_LIMITS, PlanTierLabels } from './index';

describe('getErpPreset', () => {
  it('retorna o preset exato quando o sistema existe', () => {
    const preset = getErpPreset('TOTVS Protheus');
    expect(preset.systemName).toBe('TOTVS Protheus');
    expect(preset.requiredColumns).toContain('A1_CGC');
  });

  it('cai no preset genérico para sistema desconhecido, nulo ou indefinido', () => {
    const generic = ERP_PRESETS['Genérico / CSV'];
    expect(getErpPreset('ERP Inexistente')).toBe(generic);
    expect(getErpPreset(null)).toBe(generic);
    expect(getErpPreset(undefined)).toBe(generic);
  });

  it('todo preset possui CSV de exemplo cujo cabeçalho contém as colunas obrigatórias', () => {
    for (const preset of Object.values(ERP_PRESETS)) {
      const header: string[] = preset.sampleCsvContent.split(/\r?\n/)[0].split(',');
      for (const column of preset.requiredColumns) {
        expect(header, `${preset.systemName} sem coluna ${column}`).toContain(column);
      }
    }
  });
});

describe('PLAN_LIMITS', () => {
  it('mantém limites coerentes com o backend (SubscriptionQuotaService)', () => {
    expect(PLAN_LIMITS.Starter.monthlyFilesQuota).toBe(20);
    expect(PLAN_LIMITS.Starter.maxRowsPerFile).toBe(1000);
    expect(PLAN_LIMITS.Professional.monthlyFilesQuota).toBe(500);
    expect(PLAN_LIMITS.Professional.maxRowsPerFile).toBe(50000);
    expect(PLAN_LIMITS.Enterprise.monthlyFilesQuota).toBe(10000);
    expect(PLAN_LIMITS.Enterprise.maxRowsPerFile).toBe(1000000);
  });

  it('rótulos de plano aceitam enum numérico e string', () => {
    expect(PlanTierLabels['0']).toBe('Starter');
    expect(PlanTierLabels['2']).toBe('Enterprise');
    expect(PlanTierLabels.Professional).toBe('Professional');
  });
});
