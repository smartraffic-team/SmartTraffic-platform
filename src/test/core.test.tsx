import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { calculateSummary, mockProvider } from '../services/provider';
import { initialAlerts, initialDevices, measurements } from '../mocks/fixtures';
import { totalOf, downloadCsv } from '../lib/utils';
import { can } from '../lib/permissions';
import { TrafficLight } from '../components/common';
import { useApp } from '../stores/app';
describe('dados demonstrativos', () => {
  it('mantém categorias e indicadores consistentes', () => {
    const summary = calculateSummary(
      initialDevices,
      initialAlerts,
      measurements,
    );
    expect(summary.intersections).toBe(5);
    expect(
      summary.devicesOnline +
        summary.devicesOffline +
        initialDevices.filter((d) => d.status === 'warning').length,
    ).toBe(initialDevices.length);
    expect(summary.vehicleDetections).toBe(
      measurements.reduce((sum, m) => sum + totalOf(m), 0),
    );
  });
  it('provider retorna relações válidas', async () => {
    const devices = await mockProvider.getDevices();
    const intersections = await mockProvider.getIntersections();
    expect(
      devices.every((d) =>
        intersections.some((i) => i.id === d.intersectionId),
      ),
    ).toBe(true);
    expect(await mockProvider.getIntersectionById('missing')).toBeUndefined();
  });
  it('aplica permissões demonstrativas', () => {
    expect(can('ADMIN', 'manageDevices')).toBe(true);
    expect(can('OPERATOR', 'manageAlerts')).toBe(true);
    expect(can('VIEWER', 'manageAlerts')).toBe(false);
  });
  it('simula perda e retorno da comunicação em estado centralizado', () => {
    const state = useApp.getState();
    state.setScenario('offline');
    expect(useApp.getState().telemetry.edgeStatus).toBe('offline');
    expect(useApp.getState().telemetry.phase).toBe('unknown');
    state.setScenario('normal');
    expect(useApp.getState().telemetry.edgeStatus).toBe('online');
  });
  it('representa fase desconhecida para falha de comunicação', () => {
    render(
      <MemoryRouter>
        <TrafficLight phase="unknown" />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('img', { name: 'Semáforo: Desconhecida' }),
    ).toBeInTheDocument();
  });
  it('gera download CSV no navegador', () => {
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    downloadCsv('teste.csv', [
      ['Nome', 'Volume'],
      ['Centro', 12],
    ]);
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
