import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '../app/Layout';
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Skeleton,
} from '../components/ui';
import {
  useAlerts,
  useCrossing,
  useDevices,
  usePhases,
  useReadings,
  useRoads,
  useSignals,
  useSummary,
  useTelemetry,
} from '../hooks/useData';
import { can } from '../lib/permissions';
import { csvDownload, dateTime } from '../lib/utils';
import { session } from '../services/http';
import { api } from '../services/provider';
import type { Alert, Device, Page, Reading } from '../types';

const recent = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Falha ao consultar a API.';
const number = (value: number) => value.toLocaleString('pt-BR');
function State({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (loading) return <Skeleton />;
  if (error)
    return (
      <Card className="empty" role="alert">
        Não foi possível carregar: {message(error)}
      </Card>
    );
  return <>{children}</>;
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="stat-card">
      <span className="stat-title">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </Card>
  );
}
function Pager({
  page,
  setPage,
  total,
  limit,
}: {
  page: number;
  setPage: (page: number) => void;
  total: number;
  limit: number;
}) {
  return (
    <div className="table-footer">
      <span>{number(total)} registros</span>
      <div>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>
          {' '}
          {page} / {Math.max(1, Math.ceil(total / limit))}{' '}
        </span>
        <button
          disabled={page * limit >= total}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
function DateFilter({
  days,
  setDays,
}: {
  days: string;
  setDays: (days: string) => void;
}) {
  return (
    <Select
      label="Período"
      value={days}
      onChange={setDays}
      options={[
        { value: '1', label: '24 horas' },
        { value: '3', label: '3 dias' },
        { value: '7', label: '7 dias' },
        { value: '30', label: '30 dias' },
      ]}
    />
  );
}
function ReadingChart({ rows }: { rows: Reading[] }) {
  const byDay = new Map<
    string,
    { dia: string; carros: number; pedestres: number }
  >();
  for (const row of rows) {
    const day = row.registradoEm.slice(0, 10);
    const item = byDay.get(day) || { dia: day, carros: 0, pedestres: 0 };
    item.carros += row.carrosDetectados;
    item.pedestres += row.pedestresDetectados;
    byDay.set(day, item);
  }
  return (
    <Card className="chart-card">
      <h3>Detecções por dia</h3>
      <p className="chart-caption">
        Somente registros desta página · tipo de leitura selecionado
      </p>
      {rows.length ? (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart
              data={[...byDay.values()].sort((a, b) =>
                a.dia.localeCompare(b.dia),
              )}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="carros" name="Carros detectados" fill="#FBC117" />
              <Bar
                dataKey="pedestres"
                name="Pedestres detectados"
                fill="#181C2B"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}
function ReadingTable({
  rows,
  roads,
}: {
  rows: Reading[];
  roads: Map<string, string>;
}) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Via</th>
            <th>Tipo</th>
            <th>Carros</th>
            <th>Pedestres</th>
            <th>Veículos únicos</th>
            <th>Origem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{dateTime(row.registradoEm)}</td>
              <td>{roads.get(row.viaId) || row.viaId}</td>
              <td>{row.tipoLeitura}</td>
              <td>{number(row.carrosDetectados)}</td>
              <td>{number(row.pedestresDetectados)}</td>
              <td>
                {row.veiculosUnicos == null
                  ? 'Indisponível'
                  : number(row.veiculosUnicos)}
              </td>
              <td>{row.origemLeitura}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty message="Nenhuma leitura no período selecionado." />
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        value === 'ONLINE' || value === 'RESOLVIDO'
          ? 'success'
          : value === 'OFFLINE' || value === 'CRITICO'
            ? 'danger'
            : 'warning'
      }
    >
      {value}
    </Badge>
  );
}

export function DashboardPage() {
  const [days, setDays] = useState('7');
  const inicio = useMemo(() => recent(Number(days)), [days]);
  const summary = useSummary({ inicio });
  const crossing = useCrossing();
  const roads = useRoads();
  const signals = useSignals();
  const readings = useReadings({
    inicio,
    tipoLeitura: 'AGREGADA',
    pagina: 1,
    limite: 100,
  });
  const alerts = useAlerts({ pagina: 1, limite: 5 });
  const roadMap = new Map(
    (roads.data || []).map((road) => [road.id, road.codigo]),
  );
  return (
    <>
      <PageHeader
        eyebrow="CENTRO DE OPERAÇÕES"
        title="Visão geral"
        description="Registros do cruzamento SmartTraffic e estado informado pela API."
        action={<DateFilter days={days} setDays={setDays} />}
      />
      <State
        loading={summary.isLoading || crossing.isLoading}
        error={summary.error || crossing.error}
      >
        <div className="stats-grid">
          <Metric
            label="Cruzamentos cadastrados"
            value={crossing.data ? 1 : 0}
          />
          <Metric
            label="Dispositivos online"
            value={summary.data?.dispositivosOnline ?? '—'}
          />
          <Metric
            label="Dispositivos offline"
            value={summary.data?.dispositivosOffline ?? '—'}
          />
          <Metric
            label="Leituras registradas"
            value={summary.data?.leiturasRegistradas ?? '—'}
            detail={`Últimos ${days} dia(s); QUADRO e AGREGADA`}
          />
          <Metric
            label="Alertas ativos"
            value={summary.data?.alertasAtivos ?? '—'}
          />
          <Metric
            label="Semáforos cadastrados"
            value={summary.data?.semaforos.length ?? '—'}
          />
        </div>
      </State>
      <div className="chart-grid">
        <State loading={readings.isLoading} error={readings.error}>
          <ReadingChart rows={readings.data?.dados || []} />
        </State>
        <Card className="chart-card">
          <h3>Fases informadas</h3>
          <State loading={signals.isLoading} error={signals.error}>
            {signals.data?.length ? (
              <div className="info-list">
                {signals.data.map((signal) => (
                  <div key={signal.id}>
                    <dt>
                      Via{' '}
                      {signal.vias?.codigo ||
                        roadMap.get(signal.viaId) ||
                        signal.viaId}
                    </dt>
                    <dd>
                      <Status value={signal.corAtual} />{' '}
                      <small>{dateTime(signal.atualizadoEm)}</small>
                    </dd>
                  </div>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </State>
          <p className="chart-caption">
            Estado recebido pela API; não confirma acionamento elétrico.
          </p>
        </Card>
      </div>
      <Card className="table-card">
        <h3>Alertas recentes</h3>
        <State loading={alerts.isLoading} error={alerts.error}>
          {alerts.data?.dados.length ? (
            <div className="table-wrap">
              <table>
                <tbody>
                  {alerts.data.dados.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <Link to="/alerts">{alert.titulo}</Link>
                      </td>
                      <td>
                        <Status value={alert.situacao} />
                      </td>
                      <td>{dateTime(alert.ocorridoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </State>
      </Card>
      <p className="subtle">
        O gráfico usa até 100 leituras AGREGADA da primeira página (
        {readings.data?.total ?? 0} no período). Contagens por quadro e
        agregadas não são somadas.
      </p>
    </>
  );
}

export function IntersectionsPage() {
  const crossing = useCrossing();
  const roads = useRoads();
  const signals = useSignals();
  return (
    <>
      <PageHeader
        eyebrow="INFRAESTRUTURA"
        title="Cruzamento"
        description="A base V2.1 registra um cruzamento da maquete e duas vias."
      />
      <State
        loading={crossing.isLoading || roads.isLoading || signals.isLoading}
        error={crossing.error || roads.error || signals.error}
      >
        <Card className="table-card">
          <h3>
            {crossing.data?.nome} · {crossing.data?.codigo}
          </h3>
          <p>{crossing.data?.descricao || 'Sem descrição cadastrada.'}</p>
          <p>
            Ambiente: {crossing.data?.ambiente} ·{' '}
            {crossing.data?.ativo ? 'Ativo' : 'Inativo'}
          </p>
          <Link
            className="text-link"
            to={`/intersections/${crossing.data?.id}`}
          >
            Ver detalhes
          </Link>
        </Card>
        <div className="detail-grid">
          {roads.data?.map((road) => (
            <Card key={road.id}>
              <h3>
                Via {road.codigo} · {road.nome}
              </h3>
              <p>{road.ativa ? 'Ativa' : 'Inativa'}</p>
              {signals.data
                ?.filter((signal) => signal.viaId === road.id)
                .map((signal) => (
                  <p key={signal.id}>
                    Fase informada: <Status value={signal.corAtual} /> ·{' '}
                    {dateTime(signal.atualizadoEm)}
                  </p>
                ))}
            </Card>
          ))}
        </div>
      </State>
    </>
  );
}
export function IntersectionDetailPage() {
  const { id } = useParams();
  const crossing = useCrossing();
  const roads = useRoads();
  const signals = useSignals();
  const devices = useDevices();
  const phases = usePhases({ pagina: 1, limite: 20 });
  if (crossing.data && String(crossing.data.id) !== id)
    return <Empty message="Cruzamento não encontrado." />;
  return (
    <>
      <PageHeader
        eyebrow={crossing.data?.codigo}
        title={crossing.data?.nome || 'Cruzamento'}
        description="Vias, dispositivos e histórico de fases informadas."
      />
      <State
        loading={
          crossing.isLoading ||
          roads.isLoading ||
          signals.isLoading ||
          devices.isLoading ||
          phases.isLoading
        }
        error={
          crossing.error ||
          roads.error ||
          signals.error ||
          devices.error ||
          phases.error
        }
      >
        <div className="detail-grid">
          <Card>
            <h3>Vias e semáforos</h3>
            {roads.data?.map((road) => (
              <p key={road.id}>
                Via {road.codigo} · {road.nome}:{' '}
                {signals.data?.find((signal) => signal.viaId === road.id)
                  ?.corAtual || 'Indisponível'}
              </p>
            ))}
          </Card>
          <Card>
            <h3>Dispositivos</h3>
            {devices.data?.length ? (
              devices.data.map((device) => (
                <p key={device.id}>
                  <Link to={`/devices/${device.id}`}>{device.nome}</Link> ·{' '}
                  <Status value={device.status} />
                </p>
              ))
            ) : (
              <Empty />
            )}
          </Card>
        </div>
        <Card className="table-card">
          <h3>Histórico de fases</h3>
          {phases.data?.dados.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Semáforo</th>
                    <th>Cor</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.data.dados.map((phase) => (
                    <tr key={phase.id}>
                      <td>{dateTime(phase.inicioEm)}</td>
                      <td>{dateTime(phase.fimEm)}</td>
                      <td>{phase.semaforoId}</td>
                      <td>{phase.cor}</td>
                      <td>{phase.origemEstado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Ainda não há fases registradas." />
          )}
        </Card>
      </State>
    </>
  );
}

const deviceTypes = [
  'CAMERA',
  'COMPUTADOR',
  'ARDUINO',
  'CONTROLADOR',
  'GATEWAY',
];
function DeviceForm({ device, close }: { device?: Device; close: () => void }) {
  const client = useQueryClient();
  const roads = useRoads();
  const [codigo, setCodigo] = useState(device?.codigo || '');
  const [nome, setNome] = useState(device?.nome || '');
  const [tipo, setTipo] = useState(device?.tipo || 'CAMERA');
  const [viaId, setViaId] = useState(device?.viaId || '');
  const [modelo, setModelo] = useState(device?.modelo || '');
  const [versaoSoftware, setVersao] = useState(device?.versaoSoftware || '');
  const [enderecoIp, setIp] = useState(device?.enderecoIp || '');
  const mutation = useMutation({
    mutationFn: () =>
      device
        ? api.updateDevice(device.id, {
            nome,
            tipo,
            ...(viaId ? { viaId } : {}),
            modelo,
            versaoSoftware,
            enderecoIp,
          })
        : api.createDevice({
            codigo,
            nome,
            tipo,
            ...(viaId ? { viaId } : {}),
            modelo,
            versaoSoftware,
            enderecoIp,
          }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['devices'] });
      client.invalidateQueries({ queryKey: ['summary'] });
      close();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      {!device && (
        <label className="field">
          <span>Código</span>
          <Input
            maxLength={40}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
          />
        </label>
      )}
      <label className="field">
        <span>Nome</span>
        <Input
          maxLength={120}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </label>
      <Select
        label="Tipo"
        value={tipo}
        onChange={setTipo}
        options={deviceTypes.map((value) => ({ value, label: value }))}
      />
      <Select
        label="Via"
        value={viaId}
        onChange={setViaId}
        options={[
          { value: '', label: 'Não vinculada' },
          ...(roads.data || []).map((road) => ({
            value: road.id,
            label: `Via ${road.codigo}`,
          })),
        ]}
      />
      <label className="field">
        <span>Modelo</span>
        <Input value={modelo} onChange={(e) => setModelo(e.target.value)} />
      </label>
      <label className="field">
        <span>Versão</span>
        <Input
          value={versaoSoftware}
          onChange={(e) => setVersao(e.target.value)}
        />
      </label>
      <label className="field">
        <span>IP</span>
        <Input value={enderecoIp} onChange={(e) => setIp(e.target.value)} />
      </label>
      {mutation.error && (
        <p className="error-text" role="alert">
          {message(mutation.error)}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
export function DevicesPage() {
  const devices = useDevices();
  const roads = useRoads();
  const [form, setForm] = useState<'new' | Device | null>(null);
  const [search, setSearch] = useState('');
  const role = session.get()?.user.nivelAcesso;
  const rows = (devices.data || []).filter((device) =>
    `${device.nome} ${device.codigo}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="EQUIPAMENTOS"
        title="Dispositivos"
        description="Inventário registrado na API."
        action={
          role && can(role, 'manageDevices') ? (
            <Button onClick={() => setForm('new')}>Novo dispositivo</Button>
          ) : undefined
        }
      />
      <div className="toolbar">
        <label className="field">
          <span>Pesquisar</span>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <State loading={devices.isLoading} error={devices.error}>
        <Card className="table-card">
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código / nome</th>
                    <th>Tipo</th>
                    <th>Via</th>
                    <th>Status</th>
                    <th>Último contato</th>
                    <th>Versão</th>
                    {role && can(role, 'manageDevices') && <th>Ação</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <Link to={`/devices/${device.id}`}>
                          {device.codigo}
                        </Link>
                        <small>{device.nome}</small>
                      </td>
                      <td>{device.tipo}</td>
                      <td>
                        {roads.data?.find((road) => road.id === device.viaId)
                          ?.codigo || '—'}
                      </td>
                      <td>
                        <Status value={device.status} />
                      </td>
                      <td>{dateTime(device.ultimoContatoEm)}</td>
                      <td>{device.versaoSoftware || 'Indisponível'}</td>
                      {role && can(role, 'manageDevices') && (
                        <td>
                          <Button
                            variant="secondary"
                            onClick={() => setForm(device)}
                          >
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      </State>
      {form && (
        <Card className="table-card">
          <h3>{form === 'new' ? 'Novo dispositivo' : `Editar ${form.nome}`}</h3>
          <DeviceForm
            device={form === 'new' ? undefined : form}
            close={() => setForm(null)}
          />
        </Card>
      )}
    </>
  );
}
export function DeviceDetailPage() {
  const { id = '' } = useParams();
  const device = useQuery({
    queryKey: ['device', id],
    queryFn: () => api.device(id),
  });
  const inicio = useMemo(() => recent(7), []);
  const telemetry = useTelemetry({ pagina: 1, limite: 100, inicio });
  const alerts = useAlerts({ pagina: 1, limite: 100 });
  const role = session.get()?.user.nivelAcesso;
  const [edit, setEdit] = useState(false);
  const latest = telemetry.data?.dados.find(
    (item) => item.dispositivoId === id,
  );
  const related =
    alerts.data?.dados.filter((item) => item.dispositivoId === id) || [];
  return (
    <>
      <PageHeader
        eyebrow="DISPOSITIVO"
        title={device.data?.nome || 'Dispositivo'}
        description={device.data?.codigo}
        action={
          role && can(role, 'manageDevices') ? (
            <Button onClick={() => setEdit(!edit)}>Editar</Button>
          ) : undefined
        }
      />
      <State
        loading={device.isLoading || telemetry.isLoading || alerts.isLoading}
        error={device.error || telemetry.error || alerts.error}
      >
        <div className="detail-metrics">
          <Metric label="Status" value={device.data?.status || '—'} />
          <Metric
            label="Último contato"
            value={dateTime(device.data?.ultimoContatoEm)}
          />
          <Metric label="Tipo" value={device.data?.tipo || '—'} />
          <Metric
            label="Versão"
            value={device.data?.versaoSoftware || 'Indisponível'}
          />
        </div>
        <div className="detail-grid">
          <Card>
            <h3>Telemetria mais recente no período</h3>
            <p>
              CPU: {latest?.cpuPercentual ?? 'Indisponível'}
              {latest?.cpuPercentual != null && '%'}
            </p>
            <p>
              Memória: {latest?.memoriaPercentual ?? 'Indisponível'}
              {latest?.memoriaPercentual != null && '%'}
            </p>
            <p>
              Temperatura: {latest?.temperaturaC ?? 'Indisponível'}
              {latest?.temperaturaC != null && ' °C'}
            </p>
            <p>FPS: {latest?.fps ?? 'Indisponível'}</p>
            <p>
              Latência: {latest?.latenciaMs ?? 'Indisponível'}
              {latest?.latenciaMs != null && ' ms'}
            </p>
            <small>
              Até 100 registros recentes; medição em{' '}
              {dateTime(latest?.registradoEm)}
            </small>
          </Card>
          <Card>
            <h3>Alertas relacionados</h3>
            {related.length ? (
              related.map((item) => (
                <p key={item.id}>
                  {item.titulo} · <Status value={item.situacao} />
                </p>
              ))
            ) : (
              <Empty />
            )}
          </Card>
        </div>
      </State>
      {edit && device.data && (
        <Card className="table-card">
          <DeviceForm
            device={device.data}
            close={() => {
              setEdit(false);
              device.refetch();
            }}
          />
        </Card>
      )}
    </>
  );
}

export function TrafficPage() {
  const [days, setDays] = useState('7');
  const [via, setVia] = useState('');
  const [kind, setKind] = useState('AGREGADA');
  const [page, setPage] = useState(1);
  const inicio = useMemo(() => recent(Number(days)), [days]);
  const roads = useRoads();
  const readings = useReadings({
    inicio,
    via: via || undefined,
    tipoLeitura: kind,
    pagina: page,
    limite: 50,
  });
  const roadMap = new Map(
    (roads.data || []).map((road) => [road.id, road.codigo]),
  );
  const rows = readings.data?.dados || [];
  return (
    <>
      <PageHeader
        eyebrow="ANÁLISE DE TRÁFEGO"
        title="Fluxo de trânsito"
        description="Carros e pedestres detectados. Contagens por quadro não identificam indivíduos únicos."
      />
      <div className="toolbar">
        <DateFilter
          days={days}
          setDays={(value) => {
            setDays(value);
            setPage(1);
          }}
        />
        <Select
          label="Via"
          value={via}
          onChange={(value) => {
            setVia(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Ambas' },
            { value: 'A', label: 'Via A' },
            { value: 'B', label: 'Via B' },
          ]}
        />
        <Select
          label="Tipo de leitura"
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
          options={[
            { value: 'AGREGADA', label: 'Agregada' },
            { value: 'QUADRO', label: 'Por quadro' },
          ]}
        />
      </div>
      <State loading={readings.isLoading} error={readings.error}>
        <div className="stats-grid compact-stats">
          <Metric label="Leituras nesta página" value={rows.length} />
          <Metric
            label="Carros detectados nesta página"
            value={number(
              rows.reduce((sum, row) => sum + row.carrosDetectados, 0),
            )}
          />
          <Metric
            label="Pedestres detectados nesta página"
            value={number(
              rows.reduce((sum, row) => sum + row.pedestresDetectados, 0),
            )}
          />
        </div>
        <ReadingChart rows={rows} />
        <Card className="table-card">
          <h3>Leituras</h3>
          <ReadingTable rows={rows} roads={roadMap} />
          <Pager
            page={page}
            setPage={setPage}
            total={readings.data?.total || 0}
            limit={50}
          />
        </Card>
      </State>
      <p className="subtle">
        Totais e gráfico consideram apenas esta página de {kind}. A API informa{' '}
        {readings.data?.total ?? 0} registros no filtro.
      </p>
    </>
  );
}
export function MonitoringPage() {
  const inicio = useMemo(() => recent(1), []);
  const signals = useSignals();
  const devices = useDevices();
  const telemetry = useTelemetry({ pagina: 1, limite: 100, inicio });
  const phases = usePhases({ pagina: 1, limite: 20, inicio });
  const latest = new Map<
    string,
    NonNullable<typeof telemetry.data>['dados'][number]
  >();
  for (const item of telemetry.data?.dados || [])
    if (!latest.has(item.dispositivoId)) latest.set(item.dispositivoId, item);
  const updated = Math.max(
    signals.dataUpdatedAt,
    devices.dataUpdatedAt,
    telemetry.dataUpdatedAt,
    phases.dataUpdatedAt,
  );
  return (
    <>
      <PageHeader
        eyebrow="ACOMPANHAMENTO OPERACIONAL"
        title="Monitoramento"
        description="Atualização automática da API. Fases são estados informados, sem comando aos equipamentos."
      />
      <p className="monitoring-status">
        {signals.isError ||
        devices.isError ||
        telemetry.isError ||
        phases.isError
          ? 'Falha na comunicação'
          : signals.isFetching ||
              devices.isFetching ||
              telemetry.isFetching ||
              phases.isFetching
            ? 'Atualizando…'
            : 'Consulta concluída'}{' '}
        · Última consulta:{' '}
        {updated ? dateTime(new Date(updated).toISOString()) : 'Indisponível'}
      </p>
      <div className="detail-grid">
        <Card className="signal-panel">
          <h3>Semáforos</h3>
          <State loading={signals.isLoading} error={signals.error}>
            {signals.data?.length ? (
              signals.data.map((item) => (
                <p key={item.id}>
                  Via {item.vias?.codigo || item.viaId}:{' '}
                  <Status value={item.corAtual} /> · modo {item.modoOperacao} ·{' '}
                  {dateTime(item.atualizadoEm)}
                </p>
              ))
            ) : (
              <Empty />
            )}
          </State>
          <p className="chart-caption">
            Estado reportado; tempo restante indisponível.
          </p>
        </Card>
        <Card className="telemetry-panel">
          <h3>Telemetria recente</h3>
          <State
            loading={devices.isLoading || telemetry.isLoading}
            error={devices.error || telemetry.error}
          >
            {devices.data?.length ? (
              devices.data.map((device) => {
                const item = latest.get(device.id);
                return (
                  <p key={device.id}>
                    <Link to={`/devices/${device.id}`}>{device.nome}</Link>:{' '}
                    <Status value={item?.status || device.status} /> · FPS{' '}
                    {item?.fps ?? 'indisponível'} · latência{' '}
                    {item?.latenciaMs == null
                      ? 'indisponível'
                      : `${item.latenciaMs} ms`}{' '}
                    · {dateTime(item?.registradoEm)}
                  </p>
                );
              })
            ) : (
              <Empty />
            )}
          </State>
          <p className="chart-caption">
            Até 100 medições das últimas 24 horas.
          </p>
        </Card>
      </div>
      <Card className="table-card">
        <h3>Fases recentes</h3>
        <State loading={phases.isLoading} error={phases.error}>
          {phases.data?.dados.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>Semáforo</th>
                    <th>Cor</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.data.dados.map((phase) => (
                    <tr key={phase.id}>
                      <td>{dateTime(phase.inicioEm)}</td>
                      <td>{phase.semaforoId}</td>
                      <td>{phase.cor}</td>
                      <td>{phase.origemEstado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="Sem fases registradas nas últimas 24 horas." />
          )}
        </State>
      </Card>
    </>
  );
}
export function AlertsPage() {
  const [page, setPage] = useState(1);
  const [days, setDays] = useState('30');
  const [status, setStatus] = useState('');
  const inicio = useMemo(() => recent(Number(days)), [days]);
  const alerts = useAlerts({ pagina: page, limite: 20, inicio });
  const client = useQueryClient();
  const role = session.get()?.user.nivelAcesso;
  const mutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'reconhecer' | 'resolver';
    }) => api.transitionAlert(id, action),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['alerts'] });
      client.invalidateQueries({ queryKey: ['summary'] });
    },
  });
  const rows =
    alerts.data?.dados.filter(
      (alert) => !status || alert.situacao === status,
    ) || [];
  return (
    <>
      <PageHeader
        eyebrow="EVENTOS OPERACIONAIS"
        title="Alertas"
        description="Ocorrências registradas na API. Reconhecer ou resolver registra uma transição no servidor."
      />
      <div className="toolbar">
        <DateFilter
          days={days}
          setDays={(value) => {
            setDays(value);
            setPage(1);
          }}
        />
        <Select
          label="Situação nesta página"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'Todas' },
            { value: 'ATIVO', label: 'Ativo' },
            { value: 'RECONHECIDO', label: 'Reconhecido' },
            { value: 'RESOLVIDO', label: 'Resolvido' },
          ]}
        />
      </div>
      {mutation.error && (
        <Card className="empty" role="alert">
          {message(mutation.error)}
        </Card>
      )}
      <State loading={alerts.isLoading} error={alerts.error}>
        <Card className="table-card">
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Gravidade</th>
                    <th>Situação</th>
                    <th>Dispositivo</th>
                    {role && can(role, 'manageAlerts') && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((alert: Alert) => (
                    <tr key={alert.id}>
                      <td>{dateTime(alert.ocorridoEm)}</td>
                      <td>
                        <strong>{alert.titulo}</strong>
                        <small>{alert.descricao}</small>
                      </td>
                      <td>{alert.tipo}</td>
                      <td>
                        <Status value={alert.gravidade} />
                      </td>
                      <td>
                        <Status value={alert.situacao} />
                      </td>
                      <td>{alert.dispositivoId || '—'}</td>
                      {role && can(role, 'manageAlerts') && (
                        <td className="row-actions">
                          {alert.situacao === 'ATIVO' && (
                            <Button
                              variant="secondary"
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({
                                  id: alert.id,
                                  action: 'reconhecer',
                                })
                              }
                            >
                              Reconhecer
                            </Button>
                          )}
                          {alert.situacao !== 'RESOLVIDO' && (
                            <Button
                              disabled={mutation.isPending}
                              onClick={() =>
                                mutation.mutate({
                                  id: alert.id,
                                  action: 'resolver',
                                })
                              }
                            >
                              Resolver
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
          <Pager
            page={page}
            setPage={setPage}
            total={alerts.data?.total || 0}
            limit={20}
          />
        </Card>
      </State>
      {status && (
        <p className="subtle">
          O filtro de situação atua sobre a página carregada; a API ainda não
          oferece filtro de situação.
        </p>
      )}
    </>
  );
}
type ReportKind = 'readings' | 'alerts' | 'phases' | 'devices';
export function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>('readings');
  const [days, setDays] = useState('7');
  const [page, setPage] = useState(1);
  const [readingType, setReadingType] = useState('AGREGADA');
  const inicio = useMemo(() => recent(Number(days)), [days]);
  const params = { pagina: page, limite: 50, inicio };
  const readings = useReadings({ ...params, tipoLeitura: readingType });
  const alerts = useAlerts(params);
  const phases = usePhases(params);
  const devices = useDevices();
  const roads = useRoads();
  const current: Page<unknown> | undefined =
    kind === 'readings'
      ? readings.data
      : kind === 'alerts'
        ? alerts.data
        : kind === 'phases'
          ? phases.data
          : undefined;
  const loading =
    kind === 'readings'
      ? readings.isLoading
      : kind === 'alerts'
        ? alerts.isLoading
        : kind === 'phases'
          ? phases.isLoading
          : devices.isLoading;
  const error =
    kind === 'readings'
      ? readings.error
      : kind === 'alerts'
        ? alerts.error
        : kind === 'phases'
          ? phases.error
          : devices.error;
  const roadMap = new Map(
    (roads.data || []).map((road) => [road.id, road.codigo]),
  );
  function exportCsv() {
    if (kind === 'readings')
      csvDownload('smarttraffic-leituras.csv', [
        [
          'Data',
          'Via',
          'Tipo',
          'Carros detectados',
          'Pedestres detectados',
          'Veículos únicos',
        ],
        ...(readings.data?.dados || []).map((r) => [
          r.registradoEm,
          roadMap.get(r.viaId) || r.viaId,
          r.tipoLeitura,
          r.carrosDetectados,
          r.pedestresDetectados,
          r.veiculosUnicos,
        ]),
      ]);
    if (kind === 'alerts')
      csvDownload('smarttraffic-alertas.csv', [
        ['Data', 'Título', 'Tipo', 'Gravidade', 'Situação'],
        ...(alerts.data?.dados || []).map((a) => [
          a.ocorridoEm,
          a.titulo,
          a.tipo,
          a.gravidade,
          a.situacao,
        ]),
      ]);
    if (kind === 'phases')
      csvDownload('smarttraffic-fases.csv', [
        ['Início', 'Fim', 'Semáforo', 'Cor', 'Origem'],
        ...(phases.data?.dados || []).map((p) => [
          p.inicioEm,
          p.fimEm,
          p.semaforoId,
          p.cor,
          p.origemEstado,
        ]),
      ]);
    if (kind === 'devices')
      csvDownload('smarttraffic-dispositivos.csv', [
        ['Código', 'Nome', 'Tipo', 'Status', 'Último contato'],
        ...(devices.data || []).map((d) => [
          d.codigo,
          d.nome,
          d.tipo,
          d.status,
          d.ultimoContatoEm,
        ]),
      ]);
  }
  return (
    <>
      <PageHeader
        eyebrow="REGISTROS DA API"
        title="Relatórios"
        description="Exportação CSV dos registros carregados; a disponibilidade dos dispositivos mostra apenas o estado atual."
        action={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
            <Button onClick={exportCsv} disabled={loading || !!error}>
              Exportar CSV desta página
            </Button>
          </>
        }
      />
      <div className="toolbar">
        <Select
          label="Relatório"
          value={kind}
          onChange={(value) => {
            setKind(value as ReportKind);
            setPage(1);
          }}
          options={[
            { value: 'readings', label: 'Leituras' },
            { value: 'alerts', label: 'Alertas' },
            { value: 'phases', label: 'Fases' },
            { value: 'devices', label: 'Dispositivos' },
          ]}
        />
        {kind !== 'devices' && (
          <DateFilter
            days={days}
            setDays={(value) => {
              setDays(value);
              setPage(1);
            }}
          />
        )}
        {kind === 'readings' && (
          <Select
            label="Tipo"
            value={readingType}
            onChange={(value) => {
              setReadingType(value);
              setPage(1);
            }}
            options={[
              { value: 'AGREGADA', label: 'Agregada' },
              { value: 'QUADRO', label: 'Por quadro' },
            ]}
          />
        )}
      </div>
      <State loading={loading} error={error}>
        <Card className="table-card">
          {kind === 'readings' && (
            <ReadingTable rows={readings.data?.dados || []} roads={roadMap} />
          )}
          {kind === 'alerts' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Título</th>
                    <th>Gravidade</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.data?.dados.map((a) => (
                    <tr key={a.id}>
                      <td>{dateTime(a.ocorridoEm)}</td>
                      <td>{a.titulo}</td>
                      <td>{a.gravidade}</td>
                      <td>{a.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kind === 'phases' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Início</th>
                    <th>Semáforo</th>
                    <th>Cor</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.data?.dados.map((p) => (
                    <tr key={p.id}>
                      <td>{dateTime(p.inicioEm)}</td>
                      <td>{p.semaforoId}</td>
                      <td>{p.cor}</td>
                      <td>{p.origemEstado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {kind === 'devices' && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Status</th>
                    <th>Último contato</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.data?.map((d) => (
                    <tr key={d.id}>
                      <td>{d.codigo}</td>
                      <td>{d.nome}</td>
                      <td>{d.status}</td>
                      <td>{dateTime(d.ultimoContatoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(current?.dados.length === 0 ||
            (kind === 'devices' && devices.data?.length === 0)) && <Empty />}
          {current && (
            <Pager
              page={page}
              setPage={setPage}
              total={current.total}
              limit={50}
            />
          )}
        </Card>
      </State>
      <p className="subtle">
        {kind === 'devices'
          ? `CSV contém ${devices.data?.length ?? 0} dispositivos atuais.`
          : `CSV contém somente ${current?.dados.length ?? 0} registros desta página; total no filtro: ${current?.total ?? 0}.`}
      </p>
    </>
  );
}
export function SettingsPage() {
  const [timeZone, setTimeZone] = useState(
    localStorage.getItem('st-timezone') || 'America/Sao_Paulo',
  );
  return (
    <>
      <PageHeader
        eyebrow="PREFERÊNCIAS LOCAIS"
        title="Configurações"
        description="Preferências de apresentação neste navegador. Os dados operacionais vêm da API."
      />
      <Card className="settings-wide">
        <h3>Exibição</h3>
        <Select
          label="Fuso horário"
          value={timeZone}
          onChange={(value) => {
            setTimeZone(value);
            localStorage.setItem('st-timezone', value);
          }}
          options={[
            { value: 'America/Sao_Paulo', label: 'São Paulo' },
            { value: 'UTC', label: 'UTC' },
          ]}
        />
        <p className="subtle">
          A API envia datas em UTC. O navegador as apresenta no fuso local.
        </p>
      </Card>
    </>
  );
}
