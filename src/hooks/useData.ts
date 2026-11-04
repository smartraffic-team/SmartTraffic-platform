import { useQuery } from '@tanstack/react-query';
import { api } from '../services/provider';
import type { PeriodQuery } from '../types';
export const useSummary = (params: PeriodQuery = {}) =>
  useQuery({
    queryKey: ['summary', params],
    queryFn: () => api.summary(params),
  });
export const useCrossing = () =>
  useQuery({ queryKey: ['crossing'], queryFn: api.crossing });
export const useRoads = () =>
  useQuery({ queryKey: ['roads'], queryFn: api.roads });
export const useSignals = () =>
  useQuery({
    queryKey: ['signals'],
    queryFn: api.signals,
    refetchInterval: 10000,
  });
export const useDevices = () =>
  useQuery({
    queryKey: ['devices'],
    queryFn: api.devices,
    refetchInterval: 15000,
  });
export const useReadings = (
  params: PeriodQuery & {
    via?: string;
    tipoLeitura?: string;
    dispositivoId?: string;
  } = {},
) =>
  useQuery({
    queryKey: ['readings', params],
    queryFn: () => api.readings(params),
  });
export const useAlerts = (params: PeriodQuery = {}) =>
  useQuery({
    queryKey: ['alerts', params],
    queryFn: () => api.alerts(params),
    refetchInterval: 15000,
  });
export const useTelemetry = (params: PeriodQuery = {}) =>
  useQuery({
    queryKey: ['telemetry', params],
    queryFn: () => api.telemetry(params),
    refetchInterval: 10000,
  });
export const usePhases = (params: PeriodQuery = {}) =>
  useQuery({
    queryKey: ['phases', params],
    queryFn: () => api.phases(params),
    refetchInterval: 10000,
  });
