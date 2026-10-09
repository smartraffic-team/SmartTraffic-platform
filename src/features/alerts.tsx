import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, CheckCheck } from 'lucide-react';
import { PageHeader, PermissionNote } from '../app/Layout';
import { can } from '../lib/permissions';
import { SectionTitle } from '../components/common';
import { Badge, Button, Card, Empty, Modal, Select } from '../components/ui';
import { useIntersections } from '../hooks/useData';
import { dateTime } from '../lib/utils';
import { useApp } from '../stores/app';
import type { Alert } from '../types';
export function AlertsPage() {
  const [params, setParams] = useSearchParams();
  const [severity, setSeverity] = useState('all');
  const [intersection, setIntersection] = useState('all');
  const [status, setStatus] = useState('all');
  const alerts = useApp((s) => s.alerts);
  const update = useApp((s) => s.updateAlert);
  const user = useApp((s) => s.user);
  const prefs = useApp((s) => s.preferences);
  const intersections = useIntersections();
  const selected = alerts.find((a) => a.id === params.get('selected'));
  const rows = alerts
    .filter((a) => severity === 'all' || a.severity === severity)
    .filter((a) => intersection === 'all' || a.intersectionId === intersection)
    .filter((a) => status === 'all' || a.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const label = (a: Alert) =>
    a.status === 'active'
      ? 'Ativo'
      : a.status === 'acknowledged'
        ? 'Reconhecido'
        : 'Resolvido';
  return (
    <>
      <PageHeader
        eyebrow="EVENTOS OPERACIONAIS"
        title="Alertas"
        description="Acompanhe ocorrências dos dados simulados e registre o tratamento local."
      />
      <div className="toolbar">
        <Select
          label="Severidade"
          value={severity}
          onChange={setSeverity}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'info', label: 'Informativo' },
            { value: 'warning', label: 'Atenção' },
            { value: 'critical', label: 'Crítico' },
          ]}
        />
        <Select
          label="Cruzamento"
          value={intersection}
          onChange={setIntersection}
          options={[
            { value: 'all', label: 'Todos' },
            ...(intersections.data || []).map((i) => ({
              value: i.id,
              label: i.code,
            })),
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'acknowledged', label: 'Reconhecidos' },
            { value: 'resolved', label: 'Resolvidos' },
          ]}
        />
      </div>
      <Card className="table-card">
        <SectionTitle title={`${rows.length} ocorrências`} />
        {rows.length ? (
          <div className="alerts-full">
            {rows.map((a) => (
              <button
                className="alert-full-row"
                key={a.id}
                onClick={() => setParams({ selected: a.id })}
              >
                <span className={`alert-indicator ${a.severity}`} />
                <span>
                  <strong>{a.title}</strong>
                  <small>
                    {a.category} ·{' '}
                    {intersections.data?.find((i) => i.id === a.intersectionId)
                      ?.code || a.intersectionId}{' '}
                    ·{' '}
                    {dateTime(
                      a.createdAt,
                      prefs.timeZone,
                      prefs.dateFormat === 'short',
                    )}
                  </small>
                </span>
                <Badge
                  tone={
                    a.status === 'resolved'
                      ? 'success'
                      : a.status === 'acknowledged'
                        ? 'info'
                        : 'warning'
                  }
                >
                  {label(a)}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <Empty />
        )}
      </Card>
      <Modal
        open={!!selected}
        onOpenChange={(open) => !open && setParams({})}
        title={selected?.title || 'Detalhes do alerta'}
      >
        {selected && (
          <>
            <div className="alert-detail">
              <p>{selected.description}</p>
              <dl className="info-list">
                <div>
                  <dt>Categoria</dt>
                  <dd>{selected.category}</dd>
                </div>
                <div>
                  <dt>Severidade</dt>
                  <dd>{selected.severity}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{label(selected)}</dd>
                </div>
                <div>
                  <dt>Gerado em</dt>
                  <dd>
                    {dateTime(
                      selected.createdAt,
                      prefs.timeZone,
                      prefs.dateFormat === 'short',
                    )}
                  </dd>
                </div>
                {selected.resolvedAt && (
                  <div>
                    <dt>Resolvido em</dt>
                    <dd>
                      {dateTime(
                        selected.resolvedAt,
                        prefs.timeZone,
                        prefs.dateFormat === 'short',
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            {user &&
              can(user.role, 'manageAlerts') &&
              selected.status !== 'resolved' && (
                <>
                  <PermissionNote />
                  <div className="form-actions">
                    {selected.status === 'active' && (
                      <Button
                        variant="secondary"
                        onClick={() => update(selected.id, 'acknowledged')}
                      >
                        <Check size={16} /> Reconhecer
                      </Button>
                    )}
                    <Button onClick={() => update(selected.id, 'resolved')}>
                      <CheckCheck size={16} /> Registrar resolução
                    </Button>
                  </div>
                </>
              )}
          </>
        )}
      </Modal>
    </>
  );
}
