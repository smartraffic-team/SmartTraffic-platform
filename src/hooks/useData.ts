import { useQuery } from '@tanstack/react-query';
import { services } from '../services/provider';
export const useIntersections = () =>
  useQuery({ queryKey: ['intersections'], queryFn: services.intersections });
export const useTraffic = () =>
  useQuery({ queryKey: ['traffic'], queryFn: services.traffic });
export const useSummary = (revision: number) =>
  useQuery({ queryKey: ['summary', revision], queryFn: services.dashboard });
export const useDevices = (revision: string) =>
  useQuery({ queryKey: ['devices', revision], queryFn: services.devices });
export const useAlerts = (revision: string) =>
  useQuery({ queryKey: ['alerts', revision], queryFn: services.alerts });
