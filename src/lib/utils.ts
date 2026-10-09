import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TrafficMeasurement, VehicleCategory } from '../types';
export const number = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);
export const dateTime = (
  value: string,
  timeZone = 'America/Sao_Paulo',
  short = false,
) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: short ? 'short' : 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
export const dateLabel = (value: string) =>
  format(new Date(value), 'dd MMM', { locale: ptBR });
export const totalOf = (m: TrafficMeasurement) =>
  m.cars + m.motorcycles + m.buses + m.trucks + m.other;
export const categories: {
  key: VehicleCategory;
  label: string;
  color: string;
}[] = [
  { key: 'cars', label: 'Carros', color: '#FBC117' },
  { key: 'motorcycles', label: 'Motos', color: '#5B8DEF' },
  { key: 'buses', label: 'Ônibus', color: '#35B6A3' },
  { key: 'trucks', label: 'Caminhões', color: '#EF7B6C' },
  { key: 'other', label: 'Outros', color: '#9994B2' },
];
export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const content =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(';'),
      )
      .join('\r\n');
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/csv;charset=utf-8' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
