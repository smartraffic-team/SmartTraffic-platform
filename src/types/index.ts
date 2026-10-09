export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export interface User {
  id: string;
  name: string;
  role: UserRole;
}
export type DeviceType =
  'camera' | 'edge' | 'microcontroller' | 'controller' | 'gateway';
export type DeviceStatus = 'online' | 'offline' | 'warning';
export type SignalPhase = 'red' | 'yellow' | 'green' | 'unknown';
export type SignalState = 'active' | 'inactive';
export type OperatingMode = 'adaptive' | 'fixed' | 'manual';
export type VehicleCategory =
  'cars' | 'motorcycles' | 'buses' | 'trucks' | 'other';
export interface Intersection {
  id: string;
  code: string;
  name: string;
  address: string;
  status: DeviceStatus;
  mode: OperatingMode;
  phase: SignalPhase;
  updatedAt: string;
  approaches: string[];
}
export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  intersectionId: string;
  status: DeviceStatus;
  lastSeen: string;
  version: string;
  ip?: string;
  cpu?: number;
  memory?: number;
  temperature?: number;
  latency?: number;
  fps?: number;
}
export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: string;
  status: DeviceStatus;
  latency?: number;
}
export interface TrafficMeasurement {
  id: string;
  intersectionId: string;
  timestamp: string;
  approach: string;
  cars: number;
  motorcycles: number;
  buses: number;
  trucks: number;
  other: number;
  source: string;
}
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export interface Alert {
  id: string;
  intersectionId: string;
  deviceId?: string;
  category: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
}
export interface DashboardSummary {
  intersections: number;
  devicesOnline: number;
  devicesOffline: number;
  vehicleDetections: number;
  activeAlerts: number;
  adaptiveIntersections: number;
}
export type Scenario =
  'normal' | 'peak' | 'reduced' | 'offline' | 'camera-failure';
export interface Telemetry {
  timestamp: string;
  count: number;
  phase: SignalPhase;
  remainingSeconds?: number;
  latency?: number;
  fps?: number;
  edgeStatus: DeviceStatus;
  controllerStatus: DeviceStatus;
  cameraStatus: DeviceStatus;
}
