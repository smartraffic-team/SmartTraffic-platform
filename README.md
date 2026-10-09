# SmartTraffic Dashboard

Frontend demonstrativo para monitoramento de cruzamentos, dispositivos IoT e fluxo veicular do projeto acadêmico SmartTraffic. A pesquisa inicial ocorreu em Registro, SP. A interface usa **dados fictícios** e não envia comandos para semáforos ou equipamentos.

## Tecnologias

React 19, Vite 7, TypeScript strict, Tailwind CSS 4, componentes no padrão shadcn/ui com Radix UI, React Router, TanStack Query, Zustand, Recharts, Lucide, React Hook Form, Zod e date-fns. Vitest e Testing Library cobrem os comportamentos centrais. ESLint e Prettier estão configurados.

## Executar

Requer Node.js 20.19+ ou 22.12+ e npm.

```bash
npm install
npm run dev
```

O Vite informa o endereço local, normalmente `http://localhost:5173`.

```bash
npm run build
npm run lint
npm run test
```

## Funcionalidades

- Login demonstrativo com perfis ADMIN, OPERATOR e VIEWER. As permissões são apenas de interface.
- Visão geral com seis indicadores calculados, gráficos, status da rede e alertas recentes.
- Listagem, filtros, paginação e detalhes de cruzamentos; representação visual da fase informada.
- Inventário e detalhes de dispositivos; criação, edição e exclusão locais com validação.
- Análise de tráfego por período, cruzamento, categoria e aproximação.
- Monitoramento simulado com cenários, pausa e retomada. Os estados são predefinidos e não controlam sinais reais.
- Alertas filtráveis com reconhecimento e resolução simulada. Reconhecer um alerta não resolve uma falha técnica.
- Relatórios demonstrativos, CSV gerado no navegador e impressão.
- Preferências persistidas de tema, fuso horário, formato de data, intervalo da simulação, notificações e gráficos.

## Estrutura

`src/app` contém o layout e rotas; `src/features` contém as telas; `src/components` reúne elementos reutilizáveis; `src/types` define os contratos; `src/mocks` contém os dados; `src/services` fornece o contrato `DataProvider` e seu mock; `src/hooks` usa TanStack Query; `src/stores` mantém sessão, preferências e simulação; `src/test` contém testes.

## Dados e identidade visual

As fixtures de `src/mocks/fixtures.ts` contêm cinco cruzamentos e medições coerentes por categoria. O provider aplica uma pequena latência para demonstrar carregamento. Edições de dispositivos, alertas e preferências ficam no `localStorage` deste navegador. Restaurar os dados está em **Configurações**.

O Vite usa `/imgs` como pasta pública. O logotipo original é servido sem alteração. As cores oficiais fornecidas em `imgs/PALETA DE CORES.png` foram centralizadas em `src/styles.css`: `#EBEAEB`, `#181C2B` e `#FBC117`. Para trocar recursos, substitua os arquivos em `/imgs` e atualize as variáveis CSS e referências do logo.

## Integração futura

Substitua `mockProvider` em `src/services/provider.ts` por um provider HTTP que implemente `DataProvider`, preservando os tipos em `src/types`. A API futura será desenvolvida com **NestJS e Prisma** e utilizará **MySQL**. A autenticação demonstrativa deverá ser substituída por uma sessão validada pelo backend com JWT e autorização no servidor. Telemetria, histórico de fases e disponibilidade deverão vir de eventos reais da API.

## Limitações e próximas etapas

Esta versão não possui backend, banco de dados, streaming de câmeras, autenticação segura ou controle de hardware. Números e estados são fictícios e não constituem resultados científicos nem telemetria de campo. A disponibilidade exibida em relatórios é o estado atual dos mocks; não é uma taxa histórica. O histórico de fases aparece como estado vazio até existir uma fonte de eventos. As próximas etapas são integrar a API, coletar séries temporais reais, especificar segurança operacional e ampliar testes de interface.
