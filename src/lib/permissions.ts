import type { UserRole } from '../types';
export const can = (
  role: UserRole,
  action: 'manageDevices' | 'manageAlerts' | 'settings',
) => role === 'ADMINISTRADOR' || (role === 'OPERADOR' && action !== 'settings');
