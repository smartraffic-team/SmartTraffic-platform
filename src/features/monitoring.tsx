import { useEffect, useState } from 'react';
import { Activity, Pause, Play, RadioTower, VideoOff } from 'lucide-react';
import { PageHeader } from '../app/Layout';
import { SectionTitle, Status, TrafficLight } from '../components/common';
import { phaseLabels } from '../lib/labels';
import { Button, Card, Select } from '../components/ui';
import { useIntersections } from '../hooks/useData';
import { dateTime } from '../lib/utils';
import { useApp } from '../stores/app';
import type { Scenario } from '../types';
const scenarios: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Trânsito normal' },
  { value: 'peak', label: 'Horário de pico' },
  { value: 'reduced', label: 'Tráfego reduzido' },
  { value: 'offline', label: 'Dispositivo offline' },
  { value: 'camera-failure', label: 'Falha na câmera' },
];
export function MonitoringPage() {
  const intersections = useIntersections();
  const [selected, setSelected] = useState('int-01');
  const {
    scenario,
    paused,
    telemetry,
    setScenario,
    setPaused,
    advance,
    preferences,
    devices,
  } = useApp();
  useEffect(() => {
    const id = window.setInterval(advance, preferences.interval * 1000);
    return () => clearInterval(id);
  }, [advance, preferences.interval]);
  const intersection = intersections.data?.find((i) => i.id === selected);
  const edge = devices.find(
    (d) => d.intersectionId === selected && d.type === 'edge',
  );
  const controller = devices.find(
    (d) => d.intersectionId === selected && d.type === 'controller',
  );
  const offline = scenario === 'offline' || intersection?.status === 'offline';
  const effective = offline
    ? {
        ...telemetry,
        phase: 'unknown' as const,
        count: 0,
        edgeStatus: 'offline' as const,
        controllerStatus: 'offline' as const,
        cameraStatus: 'offline' as const,
        fps: undefined,
        latency: undefined,
        remainingSeconds: undefined,
      }
    : telemetry;
  return (
    <>
      <PageHeader
        eyebrow="ACOMPANHAMENTO OPERACIONAL"
        title="Monitoramento"
        description="Telemetria simulada atualizada em intervalos regulares. Sem conexão com equipamentos reais."
        action={
          <Button
            variant={paused ? 'primary' : 'secondary'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}{' '}
            {paused ? 'Retomar' : 'Pausar'} simulação
          </Button>
        }
      />
      <div className="toolbar">
        <Select
          label="Cruzamento"
          value={selected}
          onChange={setSelected}
          options={(intersections.data || []).map((i) => ({
            value: i.id,
            label: i.code,
          }))}
        />
        <Select
          label="Cenário demonstrativo"
          value={scenario}
          onChange={(v) => setScenario(v as Scenario)}
          options={scenarios}
        />
      </div>
      <div className="monitoring-status">
        <span className={paused ? 'paused' : ''} />
        {paused ? 'Simulação pausada' : 'Simulação em andamento'}
        <small>
          Última atualização:{' '}
          {dateTime(
            effective.timestamp,
            preferences.timeZone,
            preferences.dateFormat === 'short',
          )}
        </small>
      </div>
      <div className="monitor-grid">
        <Card className="signal-panel">
          <SectionTitle title="Fase semafórica informada" />
          <p className="chart-caption">
            Estado demonstrativo predefinido · sem envio de comandos
          </p>
          <div className="signal-display">
            <TrafficLight phase={effective.phase} />
            <div>
              <span>Fase atual</span>
              <strong>{phaseLabels[effective.phase]}</strong>
              <small>
                {effective.remainingSeconds === undefined
                  ? 'Tempo restante indisponível'
                  : `${effective.remainingSeconds} s restantes no exemplo`}
              </small>
            </div>
          </div>
          <div className="approach-mini">
            {intersection?.approaches.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </Card>
        <Card className="telemetry-panel">
          <SectionTitle title="Telemetria recente" />
          <div className="telemetry-grid">
            <div>
              <Activity />
              <span>Veículos no ciclo</span>
              <strong>{effective.count}</strong>
            </div>
            <div>
              <RadioTower />
              <span>Latência</span>
              <strong>
                {effective.latency === undefined
                  ? '—'
                  : `${effective.latency} ms`}
              </strong>
            </div>
            <div>
              <VideoOff />
              <span>Processamento</span>
              <strong>
                {effective.fps === undefined ? '—' : `${effective.fps} FPS`}
              </strong>
            </div>
          </div>
          <p className="subtle">
            Contagem simulada por intervalo; não representa veículos únicos.
          </p>
        </Card>
      </div>
      <div className="status-grid">
        <Card>
          <span>Unidade Edge {edge && `· ${edge.id}`}</span>
          <Status status={offline ? 'offline' : effective.edgeStatus} />
        </Card>
        <Card>
          <span>Controlador {controller && `· ${controller.id}`}</span>
          <Status status={offline ? 'offline' : effective.controllerStatus} />
        </Card>
        <Card>
          <span>Câmera</span>
          <Status status={effective.cameraStatus} />
        </Card>
        <Card>
          <span>Comunicação do cruzamento</span>
          <Status
            status={offline ? 'offline' : intersection?.status || 'warning'}
          />
        </Card>
      </div>
      {(offline || scenario === 'camera-failure') && (
        <Card className="incident-note">
          {offline
            ? 'Comunicação indisponível neste cenário. A fase e as métricas atuais não são conhecidas.'
            : 'Falha de câmera demonstrativa: FPS indisponível; verifique o dispositivo no inventário.'}
        </Card>
      )}
    </>
  );
}
