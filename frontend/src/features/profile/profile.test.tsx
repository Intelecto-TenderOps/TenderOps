import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { Editor, Profile } from './index';
import { definitions } from './schema';
import { http } from '../../shared/api';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function wrapper(children: React.ReactNode): React.ReactElement {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>;
}
describe('Perfil empresarial', () => {
  it('valida el formulario y conserva el valor decimal exacto', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(http, 'post').mockResolvedValue({ data: {} });
    const definition = definitions.find(item => item.kind === 'experience')!;
    render(wrapper(<Editor definition={definition} companyId="company-a" csrf="csrf" onClose={vi.fn()}/>));
    await user.click(screen.getByRole('button', { name: 'Guardar registro' }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Cliente')).toHaveFocus();
    await user.type(screen.getByLabelText('Cliente'), 'Entidad de prueba');
    await user.type(screen.getByLabelText('Objeto contractual'), 'Modernización de plataforma');
    await user.type(screen.getByLabelText('Inicio'), '2025-01-01');
    await user.type(screen.getByLabelText('Finalización'), '2025-12-31');
    await user.type(screen.getByLabelText('Valor original'), '999999999999999999.1234');
    await user.click(screen.getByRole('button', { name: 'Guardar registro' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][1]).toMatchObject({ amount: '999999999999999999.1234', currency: 'COP', status: 'PendingEvidence' });
  });
  it('presenta vacío y oculta edición al lector', async () => {
    vi.spyOn(http, 'get').mockResolvedValue({ data: { items: [], offset: 0, limit: 10, hasMore: false } });
    render(wrapper(<Profile companyId="company-a" kind="capability" permissions={['profile.read']} csrf="csrf"/>));
    expect(await screen.findByText('Aún no hay registros de capacidades.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Añadir registro' })).not.toBeInTheDocument();
  });
  it('muestra error recuperable', async () => {
    vi.spyOn(http, 'get').mockRejectedValue(new Error('offline'));
    render(wrapper(<Profile companyId="company-a" kind="capability" permissions={['profile.read']} csrf="csrf"/>));
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });
});
