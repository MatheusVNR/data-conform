import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ImportFileDto } from '../types';
import { FileList } from './FileList';

function buildFiles(count: number): ImportFileDto[] {
  return Array.from({ length: count }, (_: unknown, i: number) => ({
    id: `f${i + 1}`,
    projectId: 'p1',
    originalFileName: `arquivo_${i + 1}.csv`,
    contentType: 'text/csv',
    byteSize: 2048,
    status: 0,
    createdAt: '2026-10-01T10:00:00Z',
  }));
}

const noopAsync = vi.fn().mockResolvedValue(undefined);

describe('FileList', () => {
  it('exibe estado vazio com o nome do ERP de destino', () => {
    render(
      <FileList
        files={[]}
        targetSystem="TOTVS Protheus"
        onValidate={noopAsync}
        onViewReport={vi.fn()}
        validatingFileId={null}
      />
    );
    expect(screen.getByText(/Nenhum arquivo anexado/i)).toBeInTheDocument();
    expect(screen.getByText(/TOTVS Protheus/)).toBeInTheDocument();
  });

  it('pagina em blocos de 8 arquivos e navega para a próxima página', async () => {
    render(
      <FileList files={buildFiles(10)} onValidate={noopAsync} onViewReport={vi.fn()} validatingFileId={null} />
    );

    expect(screen.getByText('arquivo_1.csv')).toBeInTheDocument();
    expect(screen.queryByText('arquivo_9.csv')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Próxima/i }));

    expect(screen.getByText('arquivo_9.csv')).toBeInTheDocument();
    expect(screen.queryByText('arquivo_1.csv')).not.toBeInTheDocument();
  });

  it('ajusta a página automaticamente quando a lista encolhe (sem setState em effect)', async () => {
    const { rerender } = render(
      <FileList files={buildFiles(10)} onValidate={noopAsync} onViewReport={vi.fn()} validatingFileId={null} />
    );
    await userEvent.click(screen.getByRole('button', { name: /Próxima/i }));

    rerender(
      <FileList files={buildFiles(3)} onValidate={noopAsync} onViewReport={vi.fn()} validatingFileId={null} />
    );

    expect(screen.getByText('arquivo_1.csv')).toBeInTheDocument();
    expect(screen.getByText('arquivo_3.csv')).toBeInTheDocument();
  });

  it('só mostra "Ver Laudo" para arquivos concluídos', () => {
    const files: ImportFileDto[] = [
      { ...buildFiles(1)[0], status: 2 },
      { ...buildFiles(2)[1], status: 0 },
    ];
    render(<FileList files={files} onValidate={noopAsync} onViewReport={vi.fn()} validatingFileId={null} />);

    expect(screen.getAllByRole('button', { name: /Ver Laudo/i })).toHaveLength(1);
  });
});
