import { useMemo, useState } from 'react';
import { PageHeader } from '../app/Layout';
import { MeasurementTable, SectionTitle, StatCard } from '../components/common';
import {
  CategoryChart,
  FlowChart,
  VolumeChart,
  type Period,
} from '../components/charts';
import { Card, Select, Skeleton } from '../components/ui';
import { useIntersections, useTraffic } from '../hooks/useData';
import { totalOf } from '../lib/utils';
import { Activity, TrendingUp } from 'lucide-react';
export function TrafficPage() {
  const [intersection, setIntersection] = useState('all');
  const [days, setDays] = useState('7');
  const [period, setPeriod] = useState<Period>('day');
  const [page, setPage] = useState(1);
  const traffic = useTraffic();
  const intersections = useIntersections();
  const rows = useMemo(
    () =>
      (traffic.data || [])
        .filter(
          (m) => intersection === 'all' || m.intersectionId === intersection,
        )
        .filter(
          (m) =>
            Math.max(
              0,
              ...(traffic.data || []).map((item) =>
                new Date(item.timestamp).getTime(),
              ),
            ) -
              new Date(m.timestamp).getTime() <=
            Number(days) * 86400000,
        )
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [traffic.data, intersection, days],
  );
  const total = rows.reduce((sum, m) => sum + totalOf(m), 0);
  const peak = rows.reduce<(typeof rows)[number] | undefined>(
    (best, m) => (!best || totalOf(m) > totalOf(best) ? m : best),
    undefined,
  );
  const names = Object.fromEntries(
    (intersections.data || []).map((i) => [i.id, i.code]),
  );
  const midpoint = Math.floor(rows.length / 2);
  const current = rows.slice(0, midpoint).reduce((s, m) => s + totalOf(m), 0);
  const previous = rows.slice(midpoint).reduce((s, m) => s + totalOf(m), 0);
  return (
    <>
      <PageHeader
        eyebrow="ANÁLISE VEICULAR"
        title="Fluxo de trânsito"
        description="Detecções por horário, categoria e cruzamento. Os dados não identificam veículos únicos."
      />
      <div className="toolbar">
        <Select
          label="Cruzamento"
          value={intersection}
          onChange={(v) => {
            setIntersection(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos' },
            ...(intersections.data || []).map((i) => ({
              value: i.id,
              label: i.code,
            })),
          ]}
        />
        <Select
          label="Período"
          value={days}
          onChange={(v) => {
            setDays(v);
            setPage(1);
          }}
          options={[
            { value: '1', label: 'Últimas 24 horas' },
            { value: '3', label: 'Últimos 3 dias' },
            { value: '7', label: 'Últimos 7 dias' },
          ]}
        />
        <Select
          label="Agrupamento"
          value={period}
          onChange={(v) => setPeriod(v as Period)}
          options={[
            { value: 'hour', label: 'Por hora' },
            { value: 'day', label: 'Diário' },
            { value: 'week', label: 'Semanal' },
            { value: 'month', label: 'Mensal' },
          ]}
        />
      </div>
      {traffic.isLoading ? (
        <Skeleton />
      ) : (
        <>
          <div className="stats-grid compact-stats">
            <StatCard
              title="Detecções no filtro"
              value={total}
              detail="Soma das categorias"
              icon={<Activity />}
            />
            <StatCard
              title="Pico observado"
              value={peak ? totalOf(peak) : 0}
              detail={peak ? `Uma medição · ${peak.approach}` : 'Sem medições'}
              icon={<TrendingUp />}
            />
            <StatCard
              title="Medições"
              value={rows.length}
              detail="Registros simulados"
              icon={<Activity />}
            />
          </div>
          <div className="chart-grid">
            <FlowChart rows={rows} period={period} />
            <CategoryChart rows={rows} />
            <VolumeChart rows={rows} names={names} />
            <Card className="chart-card">
              <SectionTitle title="Comparação entre períodos" />
              <p className="chart-caption">
                Primeira e segunda metade das medições filtradas
              </p>
              <div className="comparison">
                <div>
                  <span>Mais recentes</span>
                  <strong>{current.toLocaleString('pt-BR')}</strong>
                  <div
                    className="bar"
                    style={{
                      width: `${Math.max(5, (current / Math.max(current, previous, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div>
                  <span>Anteriores</span>
                  <strong>{previous.toLocaleString('pt-BR')}</strong>
                  <div
                    className="bar secondary"
                    style={{
                      width: `${Math.max(5, (previous / Math.max(current, previous, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>
          <Card className="table-card">
            <SectionTitle title="Medições" />
            <MeasurementTable rows={rows.slice((page - 1) * 10, page * 10)} />
            <div className="table-footer">
              <span>{rows.length} registros</span>
              <div>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </button>
                <span>
                  {page} / {Math.max(1, Math.ceil(rows.length / 10))}
                </span>
                <button
                  disabled={page >= Math.ceil(rows.length / 10)}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
