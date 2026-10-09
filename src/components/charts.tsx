import {
  CartesianGrid,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, Empty } from './ui';
import { SectionTitle } from './common';
import { categories, dateLabel, totalOf } from '../lib/utils';
import { useApp } from '../stores/app';
import type { TrafficMeasurement } from '../types';
export type Period = 'hour' | 'day' | 'week' | 'month';
const labels: Record<Period, string> = {
  hour: 'Por hora',
  day: 'Diário',
  week: 'Semanal',
  month: 'Mensal',
};
const bucket = (m: TrafficMeasurement, period: Period) => {
  const date = new Date(m.timestamp);
  if (period === 'hour')
    return `${dateLabel(m.timestamp)} ${String(date.getHours()).padStart(2, '0')}h`;
  if (period === 'day') return dateLabel(m.timestamp);
  if (period === 'week') return `Semana ${Math.ceil(date.getDate() / 7)}`;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date);
};
export function FlowChart({
  rows,
  title = 'Fluxo de veículos',
  period = 'day',
}: {
  rows: TrafficMeasurement[];
  title?: string;
  period?: Period;
}) {
  const grid = useApp((s) => s.preferences.chartGrid);
  const grouped = new Map<string, number>();
  rows.forEach((m) =>
    grouped.set(
      bucket(m, period),
      (grouped.get(bucket(m, period)) || 0) + totalOf(m),
    ),
  );
  const data = [...grouped].map(([name, value]) => ({ name, value })).reverse();
  return (
    <Card className="chart-card">
      <SectionTitle title={title} />
      <p className="chart-caption">
        Detecções de veículos · {labels[period]} · dados demonstrativos
      </p>
      {data.length ? (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 16, left: -18, bottom: 0 }}
            >
              {grid && (
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              )}
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
              />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [`${value} detecções`, 'Volume']}
              />
              <Legend />
              <Line
                type="monotone"
                name="Detecções"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}
export function CategoryChart({ rows }: { rows: TrafficMeasurement[] }) {
  const data = categories
    .map((cat) => ({
      name: cat.label,
      value: rows.reduce((sum, m) => sum + m[cat.key], 0),
      color: cat.color,
    }))
    .filter((item) => item.value);
  return (
    <Card className="chart-card">
      <SectionTitle title="Categorias detectadas" />
      <p className="chart-caption">
        Distribuição por tipo · dados demonstrativos
      </p>
      {data.length ? (
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value} detecções`, 'Quantidade']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}
export function VolumeChart({
  rows,
  names,
}: {
  rows: TrafficMeasurement[];
  names: Record<string, string>;
}) {
  const data = Object.entries(names).map(([id, name]) => ({
    name: name.split(' × ')[0],
    value: rows
      .filter((m) => m.intersectionId === id)
      .reduce((sum, m) => sum + totalOf(m), 0),
  }));
  return (
    <Card className="chart-card">
      <SectionTitle title="Volume por cruzamento" />
      <p className="chart-caption">
        Detecções no período · dados demonstrativos
      </p>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 34, right: 14 }}
          >
            <XAxis
              type="number"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <Tooltip formatter={(value) => [`${value} detecções`, 'Volume']} />
            <Bar
              dataKey="value"
              name="Detecções"
              fill="var(--accent)"
              radius={[0, 5, 5, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
