import { create } from 'zustand';
import type { Alert, Device, Scenario, Telemetry, User } from '../types';
import { initialAlerts, initialDevices } from '../mocks/fixtures';
type Preferences = {
  theme: 'light' | 'dark';
  timeZone: string;
  dateFormat: 'short' | 'long';
  interval: number;
  notifications: boolean;
  chartGrid: boolean;
};
type State = {
  user: User | null;
  preferences: Preferences;
  devices: Device[];
  alerts: Alert[];
  scenario: Scenario;
  paused: boolean;
  tick: number;
  telemetry: Telemetry;
  toast: string | null;
  clearToast: () => void;
  setUser: (user: User | null) => void;
  setPreferences: (next: Partial<Preferences>) => void;
  saveDevice: (device: Device) => void;
  removeDevice: (id: string) => void;
  updateAlert: (id: string, status: Alert['status']) => void;
  setScenario: (scenario: Scenario) => void;
  setPaused: (paused: boolean) => void;
  advance: () => void;
  reset: () => void;
};
const read = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};
const persist = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));
const defaultPreferences: Preferences = {
  theme: 'light',
  timeZone: 'America/Sao_Paulo',
  dateFormat: 'short',
  interval: 5,
  notifications: true,
  chartGrid: true,
};
const telemetryFor = (scenario: Scenario, tick: number): Telemetry => {
  const offline = scenario === 'offline';
  const base = scenario === 'peak' ? 46 : scenario === 'reduced' ? 8 : 23;
  const phases: Telemetry['phase'][] = [
    'red',
    'red',
    'green',
    'green',
    'yellow',
  ];
  return {
    timestamp: new Date().toISOString(),
    count: offline ? 0 : base + (tick % 5) * 3,
    phase: offline ? 'unknown' : phases[tick % phases.length],
    remainingSeconds: offline ? undefined : 24 - (tick % 4) * 5,
    latency: offline ? undefined : 65 + (tick % 4) * 12,
    fps: offline || scenario === 'camera-failure' ? undefined : 25 - (tick % 3),
    edgeStatus: offline ? 'offline' : 'online',
    controllerStatus: offline ? 'offline' : 'online',
    cameraStatus: offline
      ? 'offline'
      : scenario === 'camera-failure'
        ? 'warning'
        : 'online',
  };
};
export const useApp = create<State>((set, get) => ({
  user: read<User | null>('st-user', null),
  preferences: read('st-preferences', defaultPreferences),
  devices: read('st-devices', initialDevices),
  alerts: read('st-alerts', initialAlerts),
  scenario: 'normal',
  paused: false,
  tick: 0,
  telemetry: telemetryFor('normal', 0),
  toast: null,
  clearToast: () => set({ toast: null }),
  setUser: (user) => {
    persist('st-user', user);
    set({ user });
  },
  setPreferences: (next) => {
    const preferences = { ...get().preferences, ...next };
    persist('st-preferences', preferences);
    set({ preferences });
  },
  saveDevice: (device) => {
    const exists = get().devices.some((item) => item.id === device.id);
    const devices = exists
      ? get().devices.map((item) => (item.id === device.id ? device : item))
      : [...get().devices, device];
    persist('st-devices', devices);
    set({
      devices,
      toast: exists
        ? 'Dispositivo atualizado nos dados locais.'
        : 'Dispositivo adicionado aos dados locais.',
    });
  },
  removeDevice: (id) => {
    const devices = get().devices.filter((device) => device.id !== id);
    persist('st-devices', devices);
    set({ devices, toast: 'Dispositivo removido dos dados locais.' });
  },
  updateAlert: (id, status) => {
    const alerts = get().alerts.map((alert) =>
      alert.id === id
        ? {
            ...alert,
            status,
            resolvedAt:
              status === 'resolved'
                ? new Date().toISOString()
                : alert.resolvedAt,
          }
        : alert,
    );
    persist('st-alerts', alerts);
    set({
      alerts,
      toast:
        status === 'resolved'
          ? 'Resolução simulada registrada.'
          : 'Alerta reconhecido. A falha técnica pode persistir.',
    });
  },
  setScenario: (scenario) =>
    set({ scenario, tick: 0, telemetry: telemetryFor(scenario, 0) }),
  setPaused: (paused) => set({ paused }),
  advance: () => {
    if (get().paused) return;
    const tick = get().tick + 1;
    set({ tick, telemetry: telemetryFor(get().scenario, tick) });
  },
  reset: () => {
    localStorage.removeItem('st-devices');
    localStorage.removeItem('st-alerts');
    set({
      devices: initialDevices,
      alerts: initialAlerts,
      scenario: 'normal',
      tick: 0,
      telemetry: telemetryFor('normal', 0),
      toast: 'Dados demonstrativos restaurados.',
    });
  },
}));
