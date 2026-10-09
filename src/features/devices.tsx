import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Cpu, Pencil, Plus, Trash2 } from 'lucide-react';
import { BackButton, PageHeader, PermissionNote } from '../app/Layout';
import { can } from '../lib/permissions';
import { AlertsList, SectionTitle, Status } from '../components/common';
import { Button, Card, Empty, Input, Modal, Select } from '../components/ui';
import { useIntersections } from '../hooks/useData';
import { dateTime } from '../lib/utils';
import { useApp } from '../stores/app';
import type { Device, DeviceType } from '../types';
const typeLabels: Record<DeviceType, string> = {
  camera: 'Câmera',
  edge: 'Unidade Edge',
  microcontroller: 'Microcontrolador',
  controller: 'Controlador semafórico',
  gateway: 'Gateway',
};
const schema = z.object({
  name: z.string().min(3, 'Informe pelo menos 3 caracteres'),
  type: z.enum(['camera', 'edge', 'microcontroller', 'controller', 'gateway']),
  intersectionId: z.string().min(1, 'Selecione um cruzamento'),
  version: z.string().min(1, 'Informe a versão'),
  ip: z.union([z.ipv4(), z.literal('')]).optional(),
});
type FormData = z.infer<typeof schema>;
function DeviceForm({
  device,
  onClose,
}: {
  device?: Device;
  onClose: () => void;
}) {
  const intersections = useIntersections();
  const save = useApp((s) => s.saveDevice);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: device?.name || '',
      type: device?.type || 'camera',
      intersectionId: device?.intersectionId || '',
      version: device?.version || '',
      ip: device?.ip || '',
    },
  });
  const submit = (values: FormData) => {
    save({
      ...device,
      id: device?.id || `dev-${crypto.randomUUID()}`,
      name: values.name,
      type: values.type,
      intersectionId: values.intersectionId,
      version: values.version,
      ip: values.ip || undefined,
      status: device?.status || 'offline',
      lastSeen: device?.lastSeen || new Date().toISOString(),
    });
    onClose();
  };
  return (
    <form className="form-grid" onSubmit={handleSubmit(submit)}>
      <label className="field">
        <span>Nome</span>
        <Input {...register('name')} />
        {errors.name && (
          <small className="error-text">{errors.name.message}</small>
        )}
      </label>
      <label className="field">
        <span>Tipo</span>
        <select className="input" {...register('type')}>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Cruzamento</span>
        <select className="input" {...register('intersectionId')}>
          <option value="">Selecione</option>
          {intersections.data?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.code}
            </option>
          ))}
        </select>
        {errors.intersectionId && (
          <small className="error-text">{errors.intersectionId.message}</small>
        )}
      </label>
      <label className="field">
        <span>Versão</span>
        <Input {...register('version')} />
        {errors.version && (
          <small className="error-text">{errors.version.message}</small>
        )}
      </label>
      <label className="field">
        <span>IP local (opcional)</span>
        <Input placeholder="192.168.0.10" {...register('ip')} />
        {errors.ip && (
          <small className="error-text">Endereço IPv4 inválido</small>
        )}
      </label>
      <PermissionNote />
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Salvar dispositivo</Button>
      </div>
    </form>
  );
}
export function DevicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [editing, setEditing] = useState<Device | 'new' | null>(null);
  const [removing, setRemoving] = useState<Device | null>(null);
  const devices = useApp((s) => s.devices);
  const remove = useApp((s) => s.removeDevice);
  const user = useApp((s) => s.user);
  const intersections = useIntersections();
  const prefs = useApp((s) => s.preferences);
  const rows = devices
    .filter((d) => (d.name + d.id).toLowerCase().includes(search.toLowerCase()))
    .filter((d) => status === 'all' || d.status === status)
    .filter((d) => type === 'all' || d.type === type);
  const nameOf = (id: string) =>
    intersections.data?.find((i) => i.id === id)?.code || id;
  return (
    <>
      <PageHeader
        eyebrow="EQUIPAMENTOS"
        title="Dispositivos IoT"
        description="Inventário local dos equipamentos associados aos cruzamentos."
        action={
          user && can(user.role, 'manageDevices') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus size={16} /> Novo dispositivo
            </Button>
          ) : undefined
        }
      />
      <div className="toolbar">
        <label className="field">
          <span>Pesquisar</span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome ou ID"
          />
        </label>
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'online', label: 'Online' },
            { value: 'warning', label: 'Atenção' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
        <Select
          label="Tipo"
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Todos' },
            ...Object.entries(typeLabels).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>
      <Card className="table-card">
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID / Nome</th>
                  <th>Tipo</th>
                  <th>Cruzamento</th>
                  <th>Status</th>
                  <th>Último contato</th>
                  <th>Versão</th>
                  <th>IP local</th>
                  {user && can(user.role, 'manageDevices') && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link className="table-link" to={`/devices/${d.id}`}>
                        {d.id}
                      </Link>
                      <small>{d.name}</small>
                    </td>
                    <td>{typeLabels[d.type]}</td>
                    <td>{nameOf(d.intersectionId)}</td>
                    <td>
                      <Status status={d.status} />
                    </td>
                    <td>
                      {dateTime(
                        d.lastSeen,
                        prefs.timeZone,
                        prefs.dateFormat === 'short',
                      )}
                    </td>
                    <td>{d.version}</td>
                    <td>{d.ip || '—'}</td>
                    {user && can(user.role, 'manageDevices') && (
                      <td className="row-actions">
                        <button
                          aria-label={`Editar ${d.name}`}
                          onClick={() => setEditing(d)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          aria-label={`Remover ${d.name}`}
                          onClick={() => setRemoving(d)}
                        >
                          <Trash2 size={16} />
                        </button>
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
        <div className="table-footer">{rows.length} dispositivos exibidos</div>
      </Card>
      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing === 'new' ? 'Novo dispositivo' : 'Editar dispositivo'}
      >
        {editing && (
          <DeviceForm
            device={editing === 'new' ? undefined : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <Modal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remover dispositivo"
      >
        <p>
          Remover <strong>{removing?.name}</strong> dos dados locais da
          demonstração?
        </p>
        <PermissionNote />
        <div className="form-actions">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (removing) remove(removing.id);
              setRemoving(null);
            }}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function DeviceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const device = useApp((s) => s.devices.find((d) => d.id === id));
  const alerts = useApp((s) => s.alerts);
  const intersections = useIntersections();
  const prefs = useApp((s) => s.preferences);
  const user = useApp((s) => s.user);
  const [editing, setEditing] = useState(false);
  if (!device) return <Empty message="Dispositivo não encontrado." />;
  const intersection = intersections.data?.find(
    (i) => i.id === device.intersectionId,
  );
  return (
    <>
      <BackButton />
      <PageHeader
        eyebrow={device.id}
        title={device.name}
        description={typeLabels[device.type]}
        action={
          user && can(user.role, 'manageDevices') ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} /> Editar
            </Button>
          ) : undefined
        }
      />
      <div className="detail-metrics">
        <Card>
          <Cpu />
          <span>Estado</span>
          <strong>
            <Status status={device.status} />
          </strong>
        </Card>
        <Card>
          <span>Último heartbeat</span>
          <strong>
            {dateTime(
              device.lastSeen,
              prefs.timeZone,
              prefs.dateFormat === 'short',
            )}
          </strong>
        </Card>
        <Card>
          <span>Versão</span>
          <strong>{device.version}</strong>
        </Card>
        <Card>
          <span>IP local</span>
          <strong>{device.ip || 'Não informado'}</strong>
        </Card>
      </div>
      <div className="detail-grid">
        <Card className="table-card">
          <SectionTitle title="Informações técnicas" />
          <dl className="info-list">
            <div>
              <dt>Cruzamento</dt>
              <dd>
                <button
                  className="text-link"
                  onClick={() =>
                    navigate(`/intersections/${device.intersectionId}`)
                  }
                >
                  {intersection?.code || device.intersectionId}
                </button>
              </dd>
            </div>
            {[
              ['CPU', device.cpu, '%'],
              ['Memória', device.memory, '%'],
              ['Temperatura', device.temperature, '°C'],
              ['Latência', device.latency, 'ms'],
              ['FPS', device.fps, 'fps'],
            ]
              .filter(([, value]) => value !== undefined)
              .map(([label, value, unit]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {value} {unit}
                  </dd>
                </div>
              ))}
          </dl>
        </Card>
        <Card className="alerts-card">
          <SectionTitle title="Alertas relacionados" />
          <AlertsList
            alerts={alerts.filter((a) => a.deviceId === id)}
            compact
          />
        </Card>
      </div>
      <Card className="table-card">
        <SectionTitle title="Histórico de conectividade" />
        <p className="subtle">
          O mock registra o último contato e o estado atual. Um histórico
          completo estará disponível após a integração da API.
        </p>
        <div className="timeline-item">
          <Status status={device.status} />
          <span>
            {dateTime(
              device.lastSeen,
              prefs.timeZone,
              prefs.dateFormat === 'short',
            )}
          </span>
        </div>
      </Card>
      <Modal
        open={editing}
        onOpenChange={setEditing}
        title="Editar dispositivo"
      >
        <DeviceForm device={device} onClose={() => setEditing(false)} />
      </Modal>
    </>
  );
}
