import {
  initialAlerts,
  intersections,
  measurements,
} from '../mocks/fixtures';
import { totalOf } from '../lib/utils';
import { useApp } from '../stores/app';
import type {
  Alert,
  DashboardSummary,
  Device,
  DeviceHeartbeat,
  Intersection,
  TrafficMeasurement,
  Telemetry,
} from '../types';
export interface DataProvider {
  getDashboardSummary(): Promise<DashboardSummary>;
  getIntersections(): Promise<Intersection[]>;
  getIntersectionById(id: string): Promise<Intersection | undefined>;
  getDevices(): Promise<Device[]>;
  getDeviceById(id: string): Promise<Device | undefined>;
  getTrafficMeasurements(): Promise<TrafficMeasurement[]>;
  getAlerts(): Promise<Alert[]>;
  getDeviceTelemetry(id: string): Promise<Telemetry | undefined>;
  getDeviceHeartbeats(id: string): Promise<DeviceHeartbeat[]>;
}
const delay = () => new Promise((resolve) => setTimeout(resolve, 240));
export const calculateSummary = (
  devices: Device[],
  alerts: Alert[],
  traffic: TrafficMeasurement[],
): DashboardSummary => ({
  intersections: intersections.length,
  devicesOnline: devices.filter((d) => d.status === 'online').length,
  devicesOffline: devices.filter((d) => d.status === 'offline').length,
  vehicleDetections: traffic.reduce((sum, m) => sum + totalOf(m), 0),
  activeAlerts: alerts.filter((a) => a.status !== 'resolved').length,
  adaptiveIntersections: intersections.filter((i) => i.mode === 'adaptive')
    .length,
});
export const mockProvider: DataProvider = {
  async getDashboardSummary() {
    await delay();
    const state = useApp.getState();
    return calculateSummary(state.devices, state.alerts, measurements);
  },
  async getIntersections() {
    await delay();
    return intersections;
  },
  async getIntersectionById(id) {
    await delay();
    return intersections.find((i) => i.id === id);
  },
  async getDevices() {
    await delay();
    return useApp.getState().devices;
  },
  async getDeviceById(id) {
    await delay();
    return useApp.getState().devices.find((d) => d.id === id);
  },
  async getTrafficMeasurements() {
    await delay();
    return measurements;
  },
  async getAlerts() {
    await delay();
    return useApp.getState().alerts;
  },
  async getDeviceTelemetry(id) {
    await delay();
    return useApp.getState().devices.some((d) => d.id === id)
      ? useApp.getState().telemetry
      : undefined;
  },
  async getDeviceHeartbeats(id) {
    await delay();
    const device = useApp.getState().devices.find((d) => d.id === id);
    return device
      ? Array.from({ length: 8 }, (_, n) => ({
          deviceId: id,
          timestamp: new Date(Date.now() - n * 3600000).toISOString(),
          status:
            n === 7 && device.status === 'offline' ? 'warning' : device.status,
          latency: device.latency,
        }))
      : [];
  },
};
export const dataProvider: DataProvider = mockProvider;
export const services = {
  dashboard: () => dataProvider.getDashboardSummary(),
  intersections: () => dataProvider.getIntersections(),
  intersection: (id: string) => dataProvider.getIntersectionById(id),
  devices: () => dataProvider.getDevices(),
  device: (id: string) => dataProvider.getDeviceById(id),
  traffic: () => dataProvider.getTrafficMeasurements(),
  alerts: () => dataProvider.getAlerts(),
  telemetry: (id: string) => dataProvider.getDeviceTelemetry(id),
  heartbeats: (id: string) => dataProvider.getDeviceHeartbeats(id),
};
export const seed = { intersections, measurements, alerts: initialAlerts };
