import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisitorInteractiveSandbox } from './VisitorInteractiveSandbox';

describe('VisitorInteractiveSandbox', () => {
  const originalLocation: Location = window.location;

  afterEach(() => {
    window.history.replaceState({}, '', originalLocation.pathname);
  });

  it('pré-seleciona corretamente o cenário via prop initialErpKey para chaves curtas e nomes de ERP', () => {
    const { unmount } = render(
      <VisitorInteractiveSandbox
        initialErpKey="protheus-sb1"
        onOpenReportModal={vi.fn()}
        onOpenRegister={vi.fn()}
      />
    );
    expect(screen.getByText('layout_totvs_protheus_sb1.csv')).toBeInTheDocument();
    unmount();

    render(
      <VisitorInteractiveSandbox
        initialErpKey="omie-clientes"
        onOpenReportModal={vi.fn()}
        onOpenRegister={vi.fn()}
      />
    );
    expect(screen.getByText('layout_omie_clientes.csv')).toBeInTheDocument();
  });

  it('pré-seleciona o cenário a partir do parâmetro ?erp= na URL e expõe a âncora #sandbox', () => {
    window.history.replaceState({}, '', '/?erp=sankhya-tgfpar#sandbox');

    const { container } = render(
      <VisitorInteractiveSandbox onOpenReportModal={vi.fn()} onOpenRegister={vi.fn()} />
    );

    expect(container.querySelector('#sandbox')).not.toBeNull();
    expect(screen.getByText('sankhya_parceiros_tgfpar.csv')).toBeInTheDocument();
  });
});
