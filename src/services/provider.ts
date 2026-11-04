import { request } from './http';
import type {
  Alert,
  Crossing,
  Device,
  Page,
  PeriodQuery,
  Phase,
  Reading,
  Road,
  Signal,
  Summary,
  Telemetry,
} from '../types';

const query = (params: object) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.size ? `?${search}` : '';
};
export const api = {
  summary: (params: PeriodQuery = {}) =>
    request<Summary>(`/dashboard/resumo${query(params)}`),
  crossing: () => request<Crossing>('/cruzamento'),
  roads: () => request<Road[]>('/vias'),
  signals: () => request<Signal[]>('/semaforos'),
  devices: () => request<Device[]>('/dispositivos'),
  device: (id: string) => request<Device>(`/dispositivos/${id}`),
  createDevice: (body: Record<string, unknown>) =>
    request<Device>('/dispositivos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateDevice: (id: string, body: Record<string, unknown>) =>
    request<Device>(`/dispositivos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  readings: (
    params: PeriodQuery & {
      via?: string;
      tipoLeitura?: string;
      dispositivoId?: string;
    } = {},
  ) => request<Page<Reading>>(`/leituras${query(params)}`),
  alerts: (params: PeriodQuery = {}) =>
    request<Page<Alert>>(`/alertas${query(params)}`),
  transitionAlert: (id: string, action: 'reconhecer' | 'resolver') =>
    request<Alert>(`/alertas/${id}/${action}`, { method: 'PATCH' }),
  telemetry: (params: PeriodQuery = {}) =>
    request<Page<Telemetry>>(`/telemetria${query(params)}`),
  phases: (params: PeriodQuery = {}) =>
    request<Page<Phase>>(`/historico-fases${query(params)}`),
  health: () => request<{ status: string }>('/health'),
};
