import type { UserRole } from '../types';
export const can = (
  role: UserRole,
  action: 'manageDevices' | 'manageAlerts' | 'settings',
) =>
  (
    ({
      ADMIN: ['manageDevices', 'manageAlerts', 'settings'],
      OPERATOR: ['manageAlerts'],
      VIEWER: [],
    })[role] as string[]
  ).includes(action);
