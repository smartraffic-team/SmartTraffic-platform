import { Link } from 'react-router-dom';
import { Badge, Card, Empty } from './ui';
import { dateTime, number, totalOf } from '../lib/utils';
import { modeLabels, phaseLabels, statusLabels } from '../lib/labels';
import type {
  Alert,
  DeviceStatus,
  Intersection,
  TrafficMeasurement,
} from '../types';
import { useApp } from '../stores/app';
import type { SignalPhase } from '../types';
export function Status({ status }: { status: DeviceStatus }) {
  return (
    <Badge
      tone={
        status === 'online'
          ? 'success'
          : status === 'offline'
            ? 'danger'
            : 'warning'
      }
    >
      <span className="status-dot" />
      {statusLabels[status]}
    </Badge>
  );
}
export function TrafficLight({ phase }: { phase: SignalPhase }) {
  return (
    <div
      className="traffic-light"
      role="img"
      aria-label={`Semáforo: ${phaseLabels[phase]}`}
    >
      <i className={phase === 'red' ? 'lit-red' : ''} />
      <i className={phase === 'yellow' ? 'lit-yellow' : ''} />
      <i className={phase === 'green' ? 'lit-green' : ''} />
    </div>
  );
}
export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}
export function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">
        {typeof value === 'number' ? number(value) : value}
      </div>
      <div className="stat-detail">{detail}</div>
    </Card>
  );
}
export function IntersectionTable({
  rows,
  deviceCounts,
}: {
  rows: Intersection[];
  deviceCounts?: Record<string, number>;
}) {
  const prefs = useApp((s) => s.preferences);
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cruzamento</th>
            <th>Localização</th>
            <th>Comunicação</th>
            {deviceCounts && <th>Dispositivos</th>}
            <th>Modo</th>
            <th>Fase</th>
            <th>Atualização</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <Link className="table-link" to={`/intersections/${item.id}`}>
                  {item.code}
                </Link>
                <small>{item.name}</small>
              </td>
              <td>{item.address}</td>
              <td>
                <Status status={item.status} />
              </td>
              {deviceCounts && <td>{deviceCounts[item.id] || 0}</td>}
              <td>{modeLabels[item.mode]}</td>
              <td>{phaseLabels[item.phase]}</td>
              <td>
                {dateTime(
                  item.updatedAt,
                  prefs.timeZone,
                  prefs.dateFormat === 'short',
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}
export function AlertsList({
  alerts,
  compact = false,
}: {
  alerts: Alert[];
  compact?: boolean;
}) {
  const prefs = useApp((s) => s.preferences);
  return alerts.length ? (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <Link
          to={`/alerts?selected=${alert.id}`}
          className="alert-row"
          key={alert.id}
        >
          <span className={`alert-indicator ${alert.severity}`} />
          <span>
            <strong>{alert.title}</strong>
            <small>
              {alert.category} ·{' '}
              {dateTime(
                alert.createdAt,
                prefs.timeZone,
                prefs.dateFormat === 'short',
              )}
            </small>
            {!compact && <small>{alert.description}</small>}
          </span>
          <Badge
            tone={
              alert.severity === 'critical'
                ? 'danger'
                : alert.severity === 'warning'
                  ? 'warning'
                  : 'info'
            }
          >
            {alert.severity === 'critical'
              ? 'Crítico'
              : alert.severity === 'warning'
                ? 'Atenção'
                : 'Informativo'}
          </Badge>
        </Link>
      ))}
    </div>
  ) : (
    <Empty />
  );
}
export function MeasurementTable({ rows }: { rows: TrafficMeasurement[] }) {
  const prefs = useApp((s) => s.preferences);
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data e hora</th>
            <th>Cruzamento</th>
            <th>Aproximação</th>
            <th>Total</th>
            <th>Carros</th>
            <th>Motos</th>
            <th>Ônibus</th>
            <th>Caminhões</th>
            <th>Outros</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td>
                {dateTime(
                  m.timestamp,
                  prefs.timeZone,
                  prefs.dateFormat === 'short',
                )}
              </td>
              <td>{m.intersectionId.toUpperCase()}</td>
              <td>{m.approach}</td>
              <td>
                <strong>{totalOf(m)}</strong>
              </td>
              <td>{m.cars}</td>
              <td>{m.motorcycles}</td>
              <td>{m.buses}</td>
              <td>{m.trucks}</td>
              <td>{m.other}</td>
              <td>{m.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty />
  );
}
