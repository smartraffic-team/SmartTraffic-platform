# SmartTraffic Platform

Painel React/Vite conectado à API REST em `../api`. Usa os registros reais do banco V2.1: um cruzamento, vias A e B, dispositivos, leituras, alertas, telemetria e fases informadas. Não envia comandos aos semáforos.

## Executar localmente

Inicie o MySQL do repositório `database/` e a API conforme `../api/README.md`. Crie o primeiro administrador pela CLI da API. Em `api/.env`, configure `CORS_ORIGINS=http://localhost:5173` (adicione a origem pública do frontend, separada por vírgula, quando publicar).

```powershell
cd SmartTraffic-platform
Copy-Item .env.example .env
npm.cmd ci
npm.cmd run dev
```

`VITE_API_URL` deve apontar para a API incluindo `/api/v1`. O navegador só recebe essa URL pública. Nunca coloque `DATABASE_URL`, `JWT_SECRET` ou `INGESTION_KEY` em variáveis `VITE_*`.

Abra a URL exibida pelo Vite (normalmente `http://localhost:5173`) e entre com e-mail e senha de um usuário ativo cadastrado na API. A sessão JWT fica no `sessionStorage` da aba, é validada com `/auth/me` na recarga e expira conforme o tempo informado pela API (uma hora). Não há renovação automática: após expirar, entre novamente. O login é real; perfis são `ADMINISTRADOR`, `OPERADOR` e `VISUALIZADOR`.

## Origem dos dados

| Tela | Rotas da API |
|---|---|
| Visão geral | `/dashboard/resumo`, `/cruzamento`, `/vias`, `/semaforos`, `/leituras`, `/alertas` |
| Cruzamento | `/cruzamento`, `/vias`, `/semaforos`, `/dispositivos`, `/historico-fases` |
| Dispositivos | `/dispositivos`, `/dispositivos/:id`, `/telemetria`, `/alertas` |
| Fluxo | `/leituras` com tipo, via, período e paginação |
| Monitoramento | `/semaforos`, `/dispositivos`, `/telemetria`, `/historico-fases` |
| Alertas | `/alertas`, `PATCH /alertas/:id/reconhecer`, `PATCH /alertas/:id/resolver` |
| Relatórios | `/leituras`, `/alertas`, `/historico-fases`, `/dispositivos` |

O frontend envia `Authorization: Bearer` nas consultas. Ações de dispositivo e alerta seguem as permissões do backend. Não há exclusão de dispositivo na API. As preferências de tema e fuso ficam somente no navegador.

## Limitações dos dados

- `leiturasRegistradas` conta registros, não veículos. Leituras `QUADRO` e `AGREGADA` aparecem separadas; o painel não soma ambas.
- Gráficos e CSV de leituras usam somente a página carregada (até 50 registros no fluxo e relatórios; 100 na visão geral). O total de registros do filtro vem da API. Para totais e séries completos em períodos grandes, a API precisa de endpoints agregados.
- Telemetria e alertas relacionados a um dispositivo são procurados entre os 100 registros recentes carregados; podem existir registros mais antigos fora desse recorte.
- Fases exibidas são estados informados à API; não comprovam acionamento físico. Não há tempo restante de fase no contrato atual.
- A API não mede motos, ônibus ou caminhões separadamente. Campos de telemetria nulos aparecem como indisponíveis. O relatório de dispositivos mostra status atual, não uma taxa histórica de disponibilidade.
- A API ainda não aceita filtro de situação em `/alertas`; esse filtro atua somente na página carregada.

## Verificação

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```
