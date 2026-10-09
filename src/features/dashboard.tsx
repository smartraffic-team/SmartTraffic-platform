import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Cpu,
  RadioTower,
  TrafficCone,
  TriangleAlert,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '../app/Layout';
import {
  AlertsList,
  IntersectionTable,
  SectionTitle,
  StatCard,
} from '../components/common';
import { CategoryChart, FlowChart, type Period } from '../components/charts';
import { Button, Card, ErrorState, Select, Skeleton } from '../components/ui';
import {
  useAlerts,
  useIntersections,
  useSummary,
  useTraffic,
} from '../hooks/useData';
import { useApp } from '../stores/app';
export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [intersection, setIntersection] = useState('all');
  const devices = useApp((s) => s.devices);
  const alertsState = useApp((s) => s.alerts);
  const summary = useSummary(
    devices.length + alertsState.filter((a) => a.status !== 'resolved').length,
  );
  const intersections = useIntersections();
  const traffic = useTraffic();
  const alerts = useAlerts(
    alertsState.map((a) => `${a.id}:${a.status}`).join('|'),
  );
  const rows = (traffic.data || []).filter(
    (m) => intersection === 'all' || m.intersectionId === intersection,
  );
  if (
    summary.isError ||
    intersections.isError ||
    traffic.isError ||
    alerts.isError
  )
    return <ErrorState />;
  return (
    <>
      <PageHeader
        eyebrow="CENTRO DE OPERAÇÕES"
        title="Visão geral da rede"
        description="Acompanhe o estado dos cruzamentos e o fluxo detectado nos dados simulados."
        action={
          <Link to="/reports">
            <Button variant="secondary">
              Ver relatórios <ArrowUpRight size={16} />
            </Button>
          </Link>
        }
      />
      <div className="stats-grid">
        {summary.data ? (
          <>
            <StatCard
              title="Cruzamentos"
              value={summary.data.intersections}
              detail="Pontos cadastrados"
              icon={<TrafficCone />}
            />
            <StatCard
              title="Dispositivos online"
              value={summary.data.devicesOnline}
              detail="Comunicação ativa"
              icon={<RadioTower />}
            />
            <StatCard
              title="Dispositivos offline"
              value={summary.data.devicesOffline}
              detail="Requerem atenção"
              icon={<WifiOff />}
            />
            <StatCard
              title="Detecções"
              value={summary.data.vehicleDetections}
              detail="Registros dos últimos 7 dias"
              icon={<Activity />}
            />
            <StatCard
              title="Alertas ativos"
              value={summary.data.activeAlerts}
              detail="Inclui reconhecidos"
              icon={<TriangleAlert />}
            />
            <StatCard
              title="Modo adaptativo"
              value={summary.data.adaptiveIntersections}
              detail="Cruzamentos configurados"
              icon={<Cpu />}
            />
          </>
        ) : (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} />)
        )}
      </div>
      <div className="toolbar">
        <Select
          label="Cruzamento"
          value={intersection}
          onChange={setIntersection}
          options={[
            { value: 'all', label: 'Todos os cruzamentos' },
            ...(intersections.data || []).map((i) => ({
              value: i.id,
              label: i.code,
            })),
          ]}
        />
        <Select
          label="Agrupamento"
          value={period}
          onChange={(value) => setPeriod(value as Period)}
          options={[
            { value: 'hour', label: 'Por hora' },
            { value: 'day', label: 'Diário' },
            { value: 'week', label: 'Semanal' },
            { value: 'month', label: 'Mensal' },
          ]}
        />
      </div>
      <div className="chart-grid">
        <FlowChart rows={rows} period={period} />
        <CategoryChart rows={rows} />
      </div>
      <div className="detail-grid">
        <Card className="table-card">
          <SectionTitle
            title="Status dos cruzamentos"
            action={
              <Link to="/intersections" className="text-link">
                Ver todos <ArrowUpRight size={15} />
              </Link>
            }
          />
          {intersections.data ? (
            <IntersectionTable rows={intersections.data} />
          ) : (
            <Skeleton />
          )}
        </Card>
        <Card className="alerts-card">
          <SectionTitle
            title="Alertas recentes"
            action={
              <Link to="/alerts" className="text-link">
                Ver todos <ArrowUpRight size={15} />
              </Link>
            }
          />
          {alerts.data ? (
            <AlertsList
              alerts={[...alerts.data]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 4)}
              compact
            />
          ) : (
            <Skeleton />
          )}
        </Card>
      </div>
    </>
  );
}
