import type { DeviceStatus, SignalPhase } from '../types';
export const statusLabels: Record<DeviceStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Atenção',
};
export const modeLabels = {
  adaptive: 'Adaptativo',
  fixed: 'Fixo',
  manual: 'Manual',
};
export const phaseLabels: Record<SignalPhase, string> = {
  red: 'Vermelho',
  yellow: 'Amarelo',
  green: 'Verde',
  unknown: 'Desconhecida',
};
