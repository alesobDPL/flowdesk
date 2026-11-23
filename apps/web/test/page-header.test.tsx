import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PageHeader } from '../src/components/page-header';

afterEach(cleanup);

it('renders a single h1 with the title and the description', () => {
  render(
    <PageHeader
      title={<span>Mis solicitudes</span>}
      description={<span>Consulta el estado de tus accesos.</span>}
    />,
  );

  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Mis solicitudes',
  );
  expect(screen.getByText('Consulta el estado de tus accesos.')).toBeDefined();
});

it('renders actions only when provided', () => {
  const { rerender } = render(<PageHeader title="Mis solicitudes" />);

  expect(screen.queryByRole('button')).toBeNull();
  rerender(
    <PageHeader
      title="Mis solicitudes"
      actions={<button type="button">Nueva solicitud</button>}
    />,
  );
  expect(screen.getByRole('button', { name: 'Nueva solicitud' })).toBeDefined();
});
