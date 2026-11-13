import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize2, Minimize2 } from 'lucide-react';
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
import type { Alert, Crossing, Device, Page, Reading, Road, Signal } from '../types';

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
  tone,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'navy' | 'yellow' | 'green' | 'red' | 'blue' | 'violet';
}) {
  return (
    <Card className={`stat-card${tone ? ` stat-card--${tone}` : ''}`}>
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
  if (rows[0]?.tipoLeitura === 'QUADRO') {
    const samples = rows
      .slice()
      .reverse()
      .slice(-20)
      .map((row) => ({
        horario: dateTime(row.registradoEm),
        carros: row.carrosDetectados,
        pedestres: row.pedestresDetectados,
      }));
    return (
      <Card className="chart-card">
        <h3>Contagem por quadro</h3>
        <p className="chart-caption">
          Até 20 amostras recentes; o mesmo objeto pode aparecer em vários quadros.
        </p>
        {samples.length ? (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={samples}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="horario" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="carros" name="Carros neste quadro" fill="#FBC117" />
                <Bar dataKey="pedestres" name="Pessoas neste quadro" fill="#181C2B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty />
        )}
      </Card>
    );
  }
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
  const tone =
    value === 'ONLINE' || value === 'RESOLVIDO' || value === 'VERDE'
      ? 'success'
      : value === 'OFFLINE' || value === 'CRITICO' || value === 'VERMELHO'
        ? 'danger'
        : value === 'DESCONHECIDA'
          ? 'neutral'
          : value === 'AMARELO'
            ? 'warning'
            : value === 'ADAPTATIVO' || value === 'FIXO' || value === 'MANUAL'
              ? 'info'
              : 'warning';
  return (
    <Badge tone={tone}>{value}</Badge>
  );
}

function CrossingSignalPanel({
  crossing,
  roads,
  signals,
}: {
  crossing?: Crossing;
  roads: Road[];
  signals: Signal[];
}) {
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 2000);
    return () => window.clearInterval(interval);
  }, []);
  const signalByRoad = new Map(signals.map((signal) => [signal.viaId, signal]));
  return (
    <Card className="crossing-signal-panel">
      <div className="crossing-panel-heading">
        <div>
          <span className="crossing-kicker">ESTADO DOS SEMÁFOROS</span>
          <h3>{crossing?.codigo || 'Cruzamento'} · {crossing?.nome || 'Aguardando cadastro'}</h3>
        </div>
        <Badge tone={crossing?.ativo ? 'success' : 'warning'}>
          {crossing?.ativo ? 'ATIVO' : 'SEM ESTADO'}
        </Badge>
      </div>
      <div className="crossing-signals-grid">
        {roads.map((road) => {
          const signal = signalByRoad.get(road.id);
          const age = signal ? clock - Date.parse(signal.atualizadoEm) : Infinity;
          const fresh = age >= 0 && age <= 45000 && signal?.corAtual !== 'DESCONHECIDA';
          const color = fresh ? signal!.corAtual.toLowerCase() : 'indisponivel';
          return (
            <article className="crossing-signal-card" key={road.id}>
              <div className="traffic-light-visual" aria-label={fresh ? `Sinal ${color}` : 'Estado indisponível'}>
                {(['vermelho', 'amarelo', 'verde'] as const).map((lamp) => (
                  <span key={lamp} className={`traffic-light-lamp traffic-light-lamp--${lamp}${color === lamp ? ' is-on' : ''}`} />
                ))}
              </div>
              <div className="crossing-signal-copy">
                <span className="crossing-kicker">SEMÁFORO {road.codigo}</span>
                <h4>{road.nome || `Via ${road.codigo}`}</h4>
                <Status value={fresh ? signal!.corAtual : 'DESCONHECIDA'} />
                <small>{signal ? `Atualizado ${dateTime(signal.atualizadoEm)}` : 'Aguardando estado do controlador'}</small>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [periodAnchor, setPeriodAnchor] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setPeriodAnchor(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  const inicio = useMemo(
    () => new Date(periodAnchor - 86400000).toISOString(),
    [periodAnchor],
  );
  const summary = useSummary({ inicio });
  const crossing = useCrossing();
  const roads = useRoads();
  const signals = useSignals();
  const devices = useDevices();
  const telemetry = useTelemetry({ pagina: 1, limite: 100, inicio });
  const latestA = useReadings(
    { via: 'A', tipoLeitura: 'QUADRO', pagina: 1, limite: 1 }, 1200,
  );
  const latestB = useReadings(
    { via: 'B', tipoLeitura: 'QUADRO', pagina: 1, limite: 1 }, 1200,
  );
  const alerts = useAlerts({ pagina: 1, limite: 5, inicio });
  const latestTelemetry = new Map<
    string,
    NonNullable<typeof telemetry.data>['dados'][number]
  >();
  for (const item of telemetry.data?.dados || [])
    if (!latestTelemetry.has(item.dispositivoId))
      latestTelemetry.set(item.dispositivoId, item);
  const latestReadingByRoad = new Map<string, Reading | undefined>([
    ['A', latestA.data?.dados[0]],
    ['B', latestB.data?.dados[0]],
  ]);
  const now = Date.now();
  return (
    <>
      <PageHeader
        eyebrow="CENTRO DE OPERAÇÕES"
        title="Visão geral"
        description="Registros do cruzamento SmartTraffic e estado informado pela API."
        action={<Badge tone="info">ÚLTIMAS 24 HORAS</Badge>}
      />
      <State
        loading={summary.isLoading || crossing.isLoading}
        error={summary.error || crossing.error}
      >
        <div className="stats-grid dashboard-stat-grid">
          <Metric
            label="Cruzamentos cadastrados"
            value={crossing.data ? 1 : 0}
            tone="navy"
          />
          <Metric
            label="Dispositivos online"
            value={summary.data?.dispositivosOnline ?? '—'}
            tone="green"
          />
          <Metric
            label="Dispositivos offline"
            value={summary.data?.dispositivosOffline ?? '—'}
            tone="red"
          />
          <Metric
            label="Leituras registradas"
            value={summary.data?.leiturasRegistradas ?? '—'}
            detail="Recebidas nas últimas 24 horas"
            tone="yellow"
          />
          <Metric
            label="Alertas ativos"
            value={summary.data?.alertasAtivos ?? '—'}
            tone="violet"
          />
          <Metric
            label="Semáforos cadastrados"
            value={summary.data?.semaforos.length ?? '—'}
            tone="blue"
          />
        </div>
      </State>
      <State
        loading={roads.isLoading || devices.isLoading || telemetry.isLoading || latestA.isLoading || latestB.isLoading}
        error={roads.error || devices.error || telemetry.error || latestA.error || latestB.error}
      >
        <Card className="table-card">
          <h3>Últimas medições por via</h3>
          <p className="chart-caption">
            Leituras instantâneas. Um valor antigo ou sem atualização não representa o fluxo atual.
          </p>
          <div className="live-road-grid">
            {(roads.data || []).map((road) => {
              const reading = latestReadingByRoad.get(road.codigo);
              const camera = devices.data?.find(
                (device) => device.tipo === 'CAMERA' && device.viaId === road.id,
              );
              const cameraTelemetry = camera ? latestTelemetry.get(camera.id) : undefined;
              const readingAge = reading ? now - Date.parse(reading.registradoEm) : Infinity;
              const telemetryAge = cameraTelemetry ? now - Date.parse(cameraTelemetry.registradoEm) : Infinity;
              const readingRecent = readingAge >= 0 && readingAge <= 5000;
              const telemetryRecent = telemetryAge >= 0 && telemetryAge <= 45000;
              const live = Boolean(readingRecent && telemetryRecent && cameraTelemetry?.status === 'ONLINE');
              let state = 'Sem medição';
              if (!camera) state = 'Sem câmera associada';
              else if (!telemetryRecent) state = 'Estado da câmera desatualizado';
              else if (cameraTelemetry?.status === 'OFFLINE') state = 'Câmera offline';
              else if (cameraTelemetry?.status === 'ALERTA') state = 'Detecção indisponível';
              else if (live) state = 'Atualizada';
              else if (reading) state = 'Última leitura antiga';
              const stateTone = live ? 'success' : cameraTelemetry?.status === 'OFFLINE' ? 'danger' : 'warning';
              return (
                <div className="live-road-card" key={road.id}>
                  <div className="section-title">
                    <h4>Via {road.codigo}</h4>
                    <Badge tone={stateTone}>{state}</Badge>
                  </div>
                  <p className="live-counts">
                    Carros: {live && reading ? number(reading.carrosDetectados) : '—'}
                    {' · '}Pessoas: {live && reading ? number(reading.pedestresDetectados) : '—'}
                  </p>
                  <small>
                    {reading ? `Último quadro: ${dateTime(reading.registradoEm)}` : 'Nenhuma leitura recebida desta via.'}
                    {camera && <> · Câmera: {camera.nome}</>}
                  </small>
                </div>
              );
            })}
          </div>
        </Card>
      </State>
      <State loading={crossing.isLoading || roads.isLoading || signals.isLoading}
        error={crossing.error || roads.error || signals.error}>
        <CrossingSignalPanel crossing={crossing.data} roads={roads.data || []} signals={signals.data || []} />
      </State>
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
    </>
  );
}

export function CameraPage() {
  const [streamReady, setStreamReady] = useState({ A: false, B: false });
  const [fullscreen, setFullscreen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const readingA = useReadings({ via: 'A', tipoLeitura: 'QUADRO', pagina: 1, limite: 1 }, 1200);
  const readingB = useReadings({ via: 'B', tipoLeitura: 'QUADRO', pagina: 1, limite: 1 }, 1200);
  const roads = useRoads();
  const devices = useDevices();
  const telemetry = useTelemetry({ pagina: 1, limite: 100 });
  const streamBase = import.meta.env.VITE_CAMERA_STREAM_URL || 'http://localhost:5000/video_feed';
  const streamUrls = { A: streamBase.replace(/\/$/, '') + '/A', B: streamBase.replace(/\/$/, '') + '/B' };
  const roadMap = new Map((roads.data || []).map((road) => [road.codigo, road]));
  const readings = { A: readingA.data?.dados[0], B: readingB.data?.dados[0] };
  const cameras = {
    A: devices.data?.find((item) => item.tipo === 'CAMERA' && item.viaId === roadMap.get('A')?.id),
    B: devices.data?.find((item) => item.tipo === 'CAMERA' && item.viaId === roadMap.get('B')?.id),
  };
  const now = Date.now();
  return (
    <section className="camera-monitor-page" ref={pageRef}>
      <header className="camera-monitor-header">
        <div className="camera-monitor-brand"><span className="camera-monitor-mark">ST</span><div><strong>SmartTraffic</strong><small>MONITORAMENTO AO VIVO</small></div></div>
        <div className="camera-monitor-location"><span>CRUZAMENTO</span><strong>Vias A e B</strong></div>
        <button className="camera-fullscreen-button" onClick={() => fullscreen ? document.exitFullscreen() : pageRef.current?.requestFullscreen()}>
          {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
      </header>
      <div className="camera-monitor-grid">
        {(['A', 'B'] as const).map((road) => {
          const latest = readings[road];
          const age = latest ? now - Date.parse(latest.registradoEm) : Infinity;
          const fresh = age >= 0 && age <= 5000;
          const camera = cameras[road];
          const cameraTelemetry = telemetry.data?.dados.find((item) => item.dispositivoId === camera?.id);
          const ready = streamReady[road];
          const streamLabel = !ready ? 'SEM SINAL'
            : cameraTelemetry?.status === 'OFFLINE' ? 'CAMERA OFFLINE'
              : cameraTelemetry?.status === 'ALERTA' ? 'DETECCAO INDISPONIVEL'
                : 'STREAM CONECTADO';
          const streamOnline = ready && cameraTelemetry?.status !== 'OFFLINE';
          const readQuery = road === 'A' ? readingA : readingB;
          return (
            <div className="camera-monitor-feed" key={road}>
              <img src={streamUrls[road]} alt={'Camera ao vivo da Via ' + road} onLoad={() => setStreamReady((current) => ({ ...current, [road]: true }))} onError={() => setStreamReady((current) => ({ ...current, [road]: false }))} />
              {!ready && <div className="camera-feed-placeholder">Stream indisponivel. Confira a camera da Via {road} e o Flask.</div>}
              <div className="camera-feed-live"><span className={streamOnline ? 'camera-live-dot' : 'camera-live-dot offline'} />{streamLabel}<span className="camera-feed-via">VIA {road}</span></div>
              <div className="camera-feed-name">{camera?.nome || 'Camera Via ' + road}{cameraTelemetry?.status ? ' · ' + cameraTelemetry.status : ''}</div>
              <div className="camera-count-overlay">
                <div><span>VEICULOS</span><strong>{fresh && latest ? number(latest.carrosDetectados) : '--'}</strong></div>
                <i />
                <div><span>PEDESTRES</span><strong>{fresh && latest ? number(latest.pedestresDetectados) : '--'}</strong></div>
                <div className="camera-reading-state"><span className={fresh ? 'camera-live-dot' : 'camera-live-dot offline'} />{readQuery.isError ? 'API indisponivel' : fresh ? 'ATUALIZADO ' + dateTime(latest!.registradoEm) : 'AGUARDANDO LEITURA'}</div>
              </div>
            </div>
          );
        })}
      </div>
      <footer className="camera-monitor-footer"><span>Deteccoes e confianca exibidas pelo modelo em cada stream</span><span>Leituras consultadas da API</span></footer>
    </section>
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
        description="Identificação do local, vias e estado atual dos semáforos."
      />
      <State
        loading={crossing.isLoading || roads.isLoading || signals.isLoading}
        error={crossing.error || roads.error || signals.error}
      >
        <div className="intersection-overview-grid">
          <Card className="intersection-profile-card">
            <span className="crossing-kicker">LOCAL DE OPERAÇÃO</span>
            <h3>{crossing.data?.nome || 'Cruzamento'}</h3>
            <p>{crossing.data?.descricao || 'Cruzamento monitorado pelo SmartTraffic.'}</p>
            <div className="intersection-meta-grid">
              <div><span>CÓDIGO</span><strong>{crossing.data?.codigo || '—'}</strong></div>
              <div><span>AMBIENTE</span><strong>{crossing.data?.ambiente || '—'}</strong></div>
              <div><span>VIAS MONITORADAS</span><strong>{roads.data?.length ?? 0}</strong></div>
              <div><span>CADASTRO</span><strong>{crossing.data?.ativo ? 'Ativo' : 'Inativo'}</strong></div>
            </div>
            <Link className="btn btn-primary intersection-details-link" to={`/intersections/${crossing.data?.id}`}>
              Abrir detalhes do cruzamento
            </Link>
          </Card>
          <CrossingSignalPanel crossing={crossing.data} roads={roads.data || []} signals={signals.data || []} />
        </div>
        <section className="intersection-roads-section">
          <div className="section-title"><h2>Vias deste cruzamento</h2><span>{roads.data?.length ?? 0} vias</span></div>
          <div className="intersection-road-grid">
            {(roads.data || []).map((road) => (
              <article className="intersection-road-card" key={road.id}>
                <span className="intersection-road-code">{road.codigo}</span>
                <div><h3>Via {road.codigo}</h3><p>{road.nome}</p></div>
                <Badge tone={road.ativa ? 'success' : 'neutral'}>{road.ativa ? 'ATIVA' : 'INATIVA'}</Badge>
              </article>
            ))}
          </div>
        </section>
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
        description="Semáforos, vias e dispositivos associados a este local."
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
        <CrossingSignalPanel crossing={crossing.data} roads={roads.data || []} signals={signals.data || []} />
        <div className="detail-grid">
          <Card className="intersection-detail-card">
            <div className="section-title"><h2>Dispositivos</h2><span>{devices.data?.length ?? 0} cadastrados</span></div>
            {devices.data?.length ? (
              <div className="intersection-device-list">
                {devices.data.map((device) => (
                  <Link className="intersection-device-row" to={`/devices/${device.id}`} key={device.id}>
                    <span className="intersection-device-mark">{device.tipo.slice(0, 1)}</span>
                    <span><strong>{device.nome}</strong><small>{device.tipo} · {device.codigo}</small></span>
                    <Status value={device.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty message="Nenhum dispositivo cadastrado neste cruzamento." />
            )}
          </Card>
        </div>
        <Card className="table-card intersection-history-card">
          <div className="section-title"><h2>Histórico de alterações dos semáforos</h2><span>20 registros recentes</span></div>
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
            label={kind === 'QUADRO' ? 'Soma das detecções em quadros' : 'Carros detectados nesta página'}
            value={number(
              rows.reduce((sum, row) => sum + row.carrosDetectados, 0),
            )}
          />
          <Metric
            label={kind === 'QUADRO' ? 'Soma das pessoas em quadros' : 'Pedestres detectados nesta página'}
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
        Totais e gráfico consideram apenas esta página de {kind}. Para QUADRO, cada leitura é uma amostra instantânea; os mesmos objetos podem aparecer em várias linhas. A API informa{' '}
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
