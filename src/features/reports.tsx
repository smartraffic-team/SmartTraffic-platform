import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { PageHeader } from '../app/Layout';
import { MeasurementTable, SectionTitle } from '../components/common';
import { CategoryChart, FlowChart } from '../components/charts';
import { Button, Card, Empty, Select } from '../components/ui';
import { useIntersections, useTraffic } from '../hooks/useData';
import { downloadCsv, totalOf } from '../lib/utils';
import { useApp } from '../stores/app';
import type { VehicleCategory } from '../types';
export function ReportsPage() {
  const [kind, setKind] = useState('volume');
  const [days, setDays] = useState('7');
  const [intersection, setIntersection] = useState('all');
  const [category, setCategory] = useState('all');
  const traffic = useTraffic();
  const intersections = useIntersections();
  const devices = useApp((s) => s.devices);
  const alerts = useApp((s) => s.alerts);
  const rows = (traffic.data || [])
    .filter((m) => intersection === 'all' || m.intersectionId === intersection)
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
    );
  const selectedValue = (m: (typeof rows)[number]) =>
    category === 'all' ? totalOf(m) : m[category as VehicleCategory];
  const chartRows = rows.map((m) =>
    category === 'all'
      ? m
      : {
          ...m,
          cars: category === 'cars' ? m.cars : 0,
          motorcycles: category === 'motorcycles' ? m.motorcycles : 0,
          buses: category === 'buses' ? m.buses : 0,
          trucks: category === 'trucks' ? m.trucks : 0,
          other: category === 'other' ? m.other : 0,
        },
  );
  const filteredDevices = devices.filter(
    (d) => intersection === 'all' || d.intersectionId === intersection,
  );
  const filteredAlerts = alerts.filter(
    (a) => intersection === 'all' || a.intersectionId === intersection,
  );
  const exportRows = () => {
    const header = [
      'Data e hora',
      'Cruzamento',
      'Aproximação',
      'Detecções',
      'Carros',
      'Motos',
      'Ônibus',
      'Caminhões',
      'Outros',
      'Fonte',
    ];
    const body = rows.map((m) => [
      m.timestamp,
      m.intersectionId,
      m.approach,
      selectedValue(m),
      m.cars,
      m.motorcycles,
      m.buses,
      m.trucks,
      m.other,
      m.source,
    ]);
    if (kind === 'availability')
      return [
        ['ID', 'Dispositivo', 'Tipo', 'Cruzamento', 'Status', 'Último contato'],
        ...filteredDevices.map((d) => [
          d.id,
          d.name,
          d.type,
          d.intersectionId,
          d.status,
          d.lastSeen,
        ]),
      ];
    if (kind === 'alerts')
      return [
        [
          'ID',
          'Título',
          'Categoria',
          'Cruzamento',
          'Severidade',
          'Status',
          'Data',
        ],
        ...filteredAlerts.map((a) => [
          a.id,
          a.title,
          a.category,
          a.intersectionId,
          a.severity,
          a.status,
          a.createdAt,
        ]),
      ];
    if (kind === 'phases') return [['Data e hora', 'Cruzamento', 'Fase']];
    if (kind === 'hours')
      return [
        ['Horário', 'Detecções'],
        ...topHours.map(([hour, count]) => [hour, count]),
      ];
    return [header, ...body];
  };
  const exportCsv = () => downloadCsv(`smarttraffic-${kind}.csv`, exportRows());
  const topHours = Object.entries(
    rows.reduce<Record<string, number>>((acc, m) => {
      const hour =
        new Date(m.timestamp).getHours().toString().padStart(2, '0') + 'h';
      acc[hour] = (acc[hour] || 0) + selectedValue(m);
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <PageHeader
        eyebrow="DADOS DEMONSTRATIVOS"
        title="Relatórios"
        description="Gere análises locais a partir dos registros simulados."
        action={
          <div className="inline-actions">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Imprimir
            </Button>
            {kind !== 'phases' && (
              <Button onClick={exportCsv}>
                <Download size={16} /> Exportar CSV
              </Button>
            )}
          </div>
        }
      />
      <div className="toolbar print-hide">
        <Select
          label="Tipo de relatório"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'volume', label: 'Volume de veículos' },
            { value: 'category', label: 'Categorias' },
            { value: 'hours', label: 'Horários de maior fluxo' },
            {
              value: 'availability',
              label: 'Disponibilidade dos dispositivos',
            },
            { value: 'alerts', label: 'Histórico de alertas' },
            { value: 'phases', label: 'Histórico de fases' },
          ]}
        />
        {!['availability', 'alerts', 'phases'].includes(kind) && (
          <Select
            label="Período"
            value={days}
            onChange={setDays}
            options={[
              { value: '1', label: '24 horas' },
              { value: '3', label: '3 dias' },
              { value: '7', label: '7 dias' },
            ]}
          />
        )}
        {kind !== 'phases' && (
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
        )}
        {!['availability', 'alerts', 'phases'].includes(kind) && (
          <Select
            label="Categoria"
            value={category}
            onChange={setCategory}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'cars', label: 'Carros' },
              { value: 'motorcycles', label: 'Motos' },
              { value: 'buses', label: 'Ônibus' },
              { value: 'trucks', label: 'Caminhões' },
              { value: 'other', label: 'Outros' },
            ]}
          />
        )}
      </div>
      <div className="report-heading">
        <strong>Relatório demonstrativo</strong>
        <span>
          {kind === 'phases'
            ? 'Sem eventos de fase no mock'
            : kind === 'availability'
              ? `${filteredDevices.length} dispositivos no filtro`
              : kind === 'alerts'
                ? `${filteredAlerts.length} alertas no filtro`
                : `${rows.length} medições · ${rows.reduce((sum, m) => sum + selectedValue(m), 0).toLocaleString('pt-BR')} detecções no filtro`}
        </span>
      </div>
      {kind === 'volume' && (
        <>
          <FlowChart rows={chartRows} />
          <Card className="table-card">
            <SectionTitle title="Registros" />
            <MeasurementTable rows={rows.slice(0, 30)} />
          </Card>
        </>
      )}
      {kind === 'category' && (
        <div className="chart-grid">
          <CategoryChart rows={chartRows} />
          <Card className="chart-card">
            <SectionTitle title="Resumo por categoria" />
            <dl className="info-list">
              {[
                ['Carros', 'cars'],
                ['Motos', 'motorcycles'],
                ['Ônibus', 'buses'],
                ['Caminhões', 'trucks'],
                ['Outros', 'other'],
              ].map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {rows
                      .reduce((sum, m) => sum + m[key as VehicleCategory], 0)
                      .toLocaleString('pt-BR')}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      )}
      {kind === 'hours' && (
        <Card className="table-card">
          <SectionTitle title="Horários de maior fluxo" />
          {topHours.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Detecções</th>
                  </tr>
                </thead>
                <tbody>
                  {topHours.map(([hour, count]) => (
                    <tr key={hour}>
                      <td>{hour}</td>
                      <td>{count.toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      )}
      {kind === 'availability' && (
        <Card className="table-card">
          <SectionTitle title="Disponibilidade atual dos dispositivos" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Dispositivo</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Último contato</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.type}</td>
                    <td>{d.status}</td>
                    <td>{d.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {kind === 'alerts' && (
        <Card className="table-card">
          <SectionTitle title="Histórico de alertas" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Categoria</th>
                  <th>Severidade</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.category}</td>
                    <td>{a.severity}</td>
                    <td>{a.status}</td>
                    <td>{a.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {kind === 'phases' && (
        <Card className="table-card">
          <SectionTitle title="Histórico de fases" />
          <Empty message="O conjunto demonstrativo não contém histórico de mudança de fases. Este relatório estará disponível com a API." />
        </Card>
      )}
    </>
  );
}
