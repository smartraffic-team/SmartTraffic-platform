import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, MapPin, RadioTower } from 'lucide-react';
import { PageHeader, BackButton } from '../app/Layout';
import {
  AlertsList,
  IntersectionTable,
  SectionTitle,
  Status,
  TrafficLight,
} from '../components/common';
import { modeLabels, phaseLabels } from '../lib/labels';
import { FlowChart } from '../components/charts';
import { Card, Empty, Input, Select, Skeleton } from '../components/ui';
import {
  useAlerts,
  useDevices,
  useIntersections,
  useTraffic,
} from '../hooks/useData';
import { dateTime, totalOf } from '../lib/utils';
import { useApp } from '../stores/app';
export function IntersectionsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [mode, setMode] = useState('all');
  const [sort, setSort] = useState('code');
  const [page, setPage] = useState(1);
  const data = useIntersections();
  const devices = useApp((s) => s.devices);
  const rows = useMemo(
    () =>
      (data.data || [])
        .filter(
          (i) =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.code.toLowerCase().includes(search.toLowerCase()),
        )
        .filter((i) => status === 'all' || i.status === status)
        .filter((i) => mode === 'all' || i.mode === mode)
        .sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'updated'
              ? b.updatedAt.localeCompare(a.updatedAt)
              : a.code.localeCompare(b.code),
        ),
    [data.data, search, status, mode, sort],
  );
  const visible = rows.slice((page - 1) * 5, page * 5);
  return (
    <>
      <PageHeader
        eyebrow="INFRAESTRUTURA"
        title="Cruzamentos"
        description="Consulte os pontos de monitoramento da rede demonstrativa."
      />
      <div className="toolbar">
        <label className="field">
          <span>Pesquisar</span>
          <Input
            placeholder="Nome ou código"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <Select
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'online', label: 'Online' },
            { value: 'warning', label: 'Atenção' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
        <Select
          label="Modo"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'adaptive', label: 'Adaptativo' },
            { value: 'fixed', label: 'Fixo' },
          ]}
        />
        <Select
          label="Ordenar"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'code', label: 'Código' },
            { value: 'name', label: 'Nome' },
            { value: 'updated', label: 'Última atualização' },
          ]}
        />
      </div>
      <Card className="table-card">
        {data.isLoading ? (
          <Skeleton />
        ) : (
          <>
            <IntersectionTable
              rows={visible}
              deviceCounts={Object.fromEntries(
                (data.data || []).map((i) => [
                  i.id,
                  devices.filter((d) => d.intersectionId === i.id).length,
                ]),
              )}
            />
            <div className="table-footer">
              <span>
                {rows.length} cruzamentos · {devices.length} dispositivos
                associados
              </span>
              <div>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Anterior
                </button>
                <span>
                  {page} / {Math.max(1, Math.ceil(rows.length / 5))}
                </span>
                <button
                  disabled={page >= Math.ceil(rows.length / 5)}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
export function IntersectionDetailPage() {
  const { id = '' } = useParams();
  const intersections = useIntersections();
  const traffic = useTraffic();
  const devicesState = useApp((s) => s.devices);
  const alertsState = useApp((s) => s.alerts);
  const devices = useDevices(
    devicesState
      .map((d) => `${d.id}:${d.name}:${d.status}:${d.intersectionId}`)
      .join('|'),
  );
  const alerts = useAlerts(
    alertsState.map((a) => `${a.id}:${a.status}`).join('|'),
  );
  const prefs = useApp((s) => s.preferences);
  const item = intersections.data?.find((i) => i.id === id);
  if (intersections.isLoading) return <Skeleton />;
  if (!item) return <Empty message="Cruzamento não encontrado." />;
  const related = (traffic.data || []).filter((m) => m.intersectionId === id);
  const equipment = (devices.data || []).filter((d) => d.intersectionId === id);
  return (
    <>
      <BackButton />
      <PageHeader
        eyebrow={item.code}
        title={item.name}
        description={item.address}
        action={<Status status={item.status} />}
      />
      <div className="detail-metrics">
        <Card>
          <MapPin />
          <span>Modo operacional</span>
          <strong>{modeLabels[item.mode]}</strong>
        </Card>
        <Card>
          <RadioTower />
          <span>Última comunicação</span>
          <strong>
            {dateTime(
              item.updatedAt,
              prefs.timeZone,
              prefs.dateFormat === 'short',
            )}
          </strong>
        </Card>
        <Card>
          <TrafficLight phase={item.phase} />
          <span>Fase informada</span>
          <strong>{phaseLabels[item.phase]}</strong>
        </Card>
        <Card>
          <span>Detecções no histórico</span>
          <strong>
            {related
              .reduce((sum, m) => sum + totalOf(m), 0)
              .toLocaleString('pt-BR')}
          </strong>
        </Card>
      </div>
      <div className="chart-grid">
        <FlowChart rows={related} />
        <Card className="chart-card">
          <SectionTitle title="Aproximações" />
          <p className="chart-caption">
            Representação demonstrativa · sem controle de sinais
          </p>
          <div className="approaches">
            {item.approaches.map((a) => (
              <div key={a}>
                <TrafficLight phase={item.phase} />
                <span>{a}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="detail-grid">
        <Card className="table-card">
          <SectionTitle title="Equipamentos associados" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Tipo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link className="table-link" to={`/devices/${d.id}`}>
                        {d.name} <ArrowUpRight size={13} />
                      </Link>
                    </td>
                    <td>{d.type}</td>
                    <td>
                      <Status status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="alerts-card">
          <SectionTitle title="Alertas relacionados" />
          <AlertsList
            alerts={(alerts.data || []).filter((a) => a.intersectionId === id)}
            compact
          />
        </Card>
      </div>
      <Card className="table-card">
        <SectionTitle title="Histórico de medições" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Aproximação</th>
                <th>Detecções</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {related.slice(0, 8).map((m) => (
                <tr key={m.id}>
                  <td>
                    {dateTime(
                      m.timestamp,
                      prefs.timeZone,
                      prefs.dateFormat === 'short',
                    )}
                  </td>
                  <td>{m.approach}</td>
                  <td>{totalOf(m)}</td>
                  <td>{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="table-card">
        <SectionTitle title="Histórico de fases" />
        <Empty message="O conjunto demonstrativo ainda não contém eventos históricos de mudança de fase para este cruzamento." />
      </Card>
    </>
  );
}
