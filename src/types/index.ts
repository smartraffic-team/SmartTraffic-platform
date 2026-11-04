export type UserRole = 'ADMINISTRADOR' | 'OPERADOR' | 'VISUALIZADOR';
export interface User {
  id: string;
  nome: string;
  email: string;
  nivelAcesso: UserRole;
  ativo: boolean;
}
export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: User;
}
export interface Page<T> {
  dados: T[];
  total: number;
  pagina: number;
  limite: number;
}
export interface PeriodQuery {
  pagina?: number;
  limite?: number;
  inicio?: string;
  fim?: string;
  ordem?: 'asc' | 'desc';
}
export interface Crossing {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ambiente: string;
  ativo: boolean;
  atualizadoEm: string;
}
export interface Road {
  id: string;
  cruzamentoId: number;
  codigo: 'A' | 'B';
  nome: string;
  ativa: boolean;
}
export interface Signal {
  id: string;
  viaId: string;
  nome: string;
  corAtual: string;
  modoOperacao: string;
  ativo: boolean;
  atualizadoEm: string;
  vias: Road;
}
export interface Device {
  id: string;
  cruzamentoId: number;
  viaId: string | null;
  codigo: string;
  nome: string;
  tipo: string;
  modelo: string | null;
  versaoSoftware: string | null;
  enderecoIp: string | null;
  status: string;
  ativo: boolean;
  ultimoContatoEm: string | null;
}
export interface Reading {
  id: string;
  viaId: string;
  dispositivoId: string;
  registradoEm: string;
  tipoLeitura: 'QUADRO' | 'AGREGADA';
  origemLeitura: string;
  carrosDetectados: number;
  pedestresDetectados: number;
  veiculosEmEspera: number | null;
  veiculosUnicos: number | null;
  periodoInicioEm: string | null;
}
export interface Alert {
  id: string;
  dispositivoId: string | null;
  tipo: string;
  titulo: string;
  gravidade: 'INFO' | 'AVISO' | 'CRITICO';
  situacao: 'ATIVO' | 'RECONHECIDO' | 'RESOLVIDO';
  descricao: string;
  ocorridoEm: string;
  reconhecidoEm: string | null;
  resolvidoEm: string | null;
}
export interface Telemetry {
  id: string;
  dispositivoId: string;
  registradoEm: string;
  status: string;
  cpuPercentual: number | null;
  memoriaPercentual: number | null;
  temperaturaC: number | null;
  fps: number | null;
  latenciaMs: number | null;
}
export interface Phase {
  id: string;
  semaforoId: string;
  cor: string;
  inicioEm: string;
  fimEm: string | null;
  origemEstado: string;
  modoOperacao: string | null;
}
export interface Summary {
  dispositivosOnline: number;
  dispositivosOffline: number;
  alertasAtivos: number;
  leiturasRegistradas: number;
  semaforos: Array<
    Pick<Signal, 'id' | 'corAtual' | 'modoOperacao' | 'atualizadoEm'> & {
      vias: Pick<Road, 'codigo'>;
    }
  >;
  ultimosContatos: Array<Pick<Device, 'id' | 'ultimoContatoEm' | 'status'>>;
}
