# Carlog

**Carlog** ("o histórico do seu carro") é um app pessoal para registrar e acompanhar todas as despesas do carro (combustível, manutenção, melhorias etc.), ver quanto já foi gasto e planejar gastos futuros. O nome e o descritivo ficam em `src/config.ts` (`APP_NAME`, `APP_TAGLINE`); o repositório se chama `carlog` e a pasta local ainda `histórico-carro`. Endereço de produção: https://usecarlog.vercel.app.

Idioma: interface, textos e mensagens em **português (pt-BR)**. Valores em **R$** (BRL), datas no formato `dd/mm/aaaa`. Código (nomes de variáveis, funções, tipos) em inglês.

## Stack (padrão, pode ser trocada)

- React + TypeScript + Vite
- Estilo: Tailwind CSS
- Gráficos: Recharts
- Uso em **celular e computador**: o app é um **PWA** (instalável na tela inicial do celular) com layout responsivo.
- Persistência e sincronização: **Supabase** (Postgres + login por e-mail, plano gratuito atende). Os dados ficam na nuvem e aparecem igual nos dois dispositivos. Login simples (e-mail + link mágico ou senha) só para proteger os dados, uso individual. Regras de acesso (RLS) garantem que cada usuário só vê os próprios dados. Chaves estrangeiras compostas `(user_id, id)` (gasto/planejado → categoria, planejado → gasto) impedem referenciar linhas de outro usuário, o que o RLS sozinho não cobre (a checagem de uma FK simples ignora o RLS). Senha mínima de 8 caracteres também no servidor (painel do Supabase: Authentication → Sign In / Providers → Email → Minimum password length), além da checagem do app em `lib/password.ts`. Verificação em duas etapas (MFA) decidida como fora do escopo: o cadastro é fechado e o uso é individual.
- Acesso aos dados isolado em uma camada (`src/storage/`) para poder trocar o provedor (ex.: Firebase) sem mexer nas telas.
- Sem cache local por enquanto: o app carrega tudo do Supabase ao abrir (precisa de internet). Modo offline fica como melhoria futura.
- Esquema do banco, regras de acesso (RLS), categorias padrão e bucket de fotos: `supabase/schema.sql` (rodar uma vez no SQL Editor). Mudanças depois disso vão em `supabase/migrations/AAAA-MM-DD_nome.sql` (o usuário roda no SQL Editor) e também são refletidas no `schema.sql`, para instalações novas.
- Cabeçalhos de segurança e CSP ficam em `vercel.json`. Qualquer origem nova (fonte, imagem, API externa, script) precisa entrar na CSP, senão o navegador bloqueia (a CSP está valendo; para testar uma mudança sem bloquear, usar `Content-Security-Policy-Report-Only` e olhar o console).
- Automação: CI no GitHub Actions (lint, testes, build) e Dependabot semanal; ver `.github/`.
- Fotos: Supabase Storage, bucket privado `receipts`, caminho `<user_id>/<image_id>.jpg`.
- Testes: Vitest (focar em cálculos de totais/filtros)
- Marca: logo "velocímetro" desenhado em código (`src/lib/gauge.ts` + `src/components/Logo.tsx`, versão grossa para tamanhos pequenos e fina para fundos grandes). Ícones do PWA/favicon saem de `design/build-icons.mjs` (ver o cabeçalho do script). Fonte de destaque Space Grotesk 700, hospedada em `public/fonts/` (SIL OFL), usada nos títulos da landing e do login.
- Design no Figma (arquivo do Carlog, "landing e login"): landing e login desenhados lá antes de implementar. A imagem de prévia do link (`public/og-image.png`) sai de `design/build-og-image.mjs`.

## Funcionalidades

### 1. Cadastro de gastos (cards)
Formulário para adicionar um novo gasto, exibido como card. Campos:
- **Descrição** (obrigatório)
- **Valor** (obrigatório, R$)
- **Data** (obrigatório, padrão hoje)
- **Categoria** (obrigatório, ver abaixo)
- **Tipo**: `manutenção` | `valorização` | `rotina` (ver abaixo)
- **Quilometragem** (opcional): útil para registrar em que km foi feita a troca de óleo, o polimento etc.
- **Observações** (opcional)
- **Fotos** (opcional, até 5): nota fiscal da oficina, peça etc. Reduzidas no cliente (máx. 1600px, JPEG) antes de salvar. Ficam no Supabase Storage (`src/storage/images.ts`); o gasto guarda só os ids em `attachments`. As fotos não entram no backup JSON.

Cards podem ser editados e excluídos (com confirmação).

### 2. Categorias
Padrão: Combustível (posto), Manutenção, Peças, Seguro, IPVA/Licenciamento, Estacionamento/Pedágio, Lavagem/Estética, Multas, Acessórios, Outros.
O usuário pode criar, renomear e remover categorias próprias.

### 3. Tipo do gasto
Separa a natureza do gasto, independente da categoria:
- **Manutenção**: mantém o carro funcionando (troca de óleo, pneus, freios).
- **Valorização**: não é manutenção, mas agrega valor ou conforto (polimento, LED, som, película).
- **Rotina**: custo de uso (combustível, estacionamento, pedágio, seguro, IPVA).

### 4. Aba "Gastos" (total gasto)
- Lista de todos os gastos realizados, mais recentes primeiro
- Filtros: categoria (múltipla), tipo, período (data inicial/final)
- Total gasto reflete os filtros aplicados

### 5. Aba "Visão geral" (dashboard)
- Total gasto no geral, no mês atual e no ano atual
- Gasto por categoria (gráfico de pizza ou barras)
- Gasto por tipo (manutenção x valorização x rotina)
- Evolução mensal (gráfico de barras ou linha)
- Últimos gastos
- Total planejado pendente (vindo da aba Planejados)
- Se houver quilometragem: custo por km

### 6. Aba "Planejados"
Gastos que ainda não aconteceram. Ex.: "trocar farol para LED, média R$ 400".
Campos: descrição, categoria, tipo, **valor estimado** (ou faixa mín–máx), prioridade (baixa/média/alta), observações/link de referência, status (`planejado` | `realizado`).
- Total estimado dos itens planejados
- Ação **"Marcar como realizado"**: converte o item em um gasto real, pré-preenchendo o formulário (o usuário informa o valor real e a data)

### 7. Landing e login (antes de entrar)
Quem não tem sessão vê a **landing** (`src/pages/Landing.tsx`) e, ao clicar em "Entrar", o **login** (`src/pages/Login.tsx`).
- **Landing, 5 seções:** (1) hero escuro em tela cheia com título, 3 checks e botões; (2) "Tudo em um só lugar": uma janela do app que CHEGA EMBAÇADA (com as abas foscas); um cursor de mouse (no celular, um toque) aparece, clica em "Visão geral", a janela entra em foco e o conteúdo acontece (blocos entram em sequência, barras crescem); depois ele clica nas outras abas (Gastos, Planejados, Ajustes), que acendem uma a uma, e no fim a janela embaça de novo e recomeça (loop). É animação por TEMPO, não presa à rolagem, e roda só enquanto a janela está na tela; clicar numa aba assume o controle (tudo nítido e aceso), há botão Pausar/Continuar, e com movimento reduzido nada embaça nem anda sozinho (`FeatureTabs`, telas em `AppScreens`, que são réplicas desenhadas em código e deixam as abas clicáveis por `TabsControlProvider`; no computador a réplica é desenhada em tamanho natural na largura disponível; abaixo de 600 px a janela vira um aparelho de celular, sem reduzir: barra de abas embaixo e telas compactas, modo `compact` de `FitScreen`); (3) "Menos de um minuto por gasto": uma demonstração que se preenche sozinha conforme a rolagem (formulário "Novo gasto" em 4 passos, Descreva, Tipo, Nota e Salve, com um cronômetro ao lado que corre com a rolagem e para no "Gasto salvo"; `FeatureDemo`, `DemoStopwatch`, cenas por `ramp` em `lib/wheel.ts`, tempo em `lib/stopwatch.ts`); (4) "Raio-X do seu carro": a tela de Visão geral aparece inteira como um quadro e uma câmera dá zoom em cada parte (totais e planejado pendente, gráfico do ano, categorias e tipos, últimos gastos); quando a câmera chega, a parte carrega e as outras apagam (`FeatureOverview`, conta da câmera em `lib/camera.ts`); (5) a última seção, "Pronto para testar o Carlog?" (`FinalCta`), que volta ao céu do começo e é o fim da página, com o botão grande do WhatsApp, "Já tenho conta" e o rodapé. As telas de exemplo são desenhadas em código com dados fictícios (`FeatureOverview.tsx` e `AppScreens.tsx`), sem Recharts.
- **Pedir acesso:** o cadastro público fica desativado no Supabase; o botão "Solicitar acesso pelo WhatsApp" abre `wa.me` com mensagem pronta (número e texto em `src/config.ts`, público de propósito). A liberação do acesso é manual no Supabase.
- **Carregamento por pedaços (code splitting):** `Landing`, `Login` e `ResetPassword` são `lazy` em `src/App.tsx` (cada um vira um arquivo à parte, protegido por `ErrorBoundary` e `Suspense`), como já eram as abas do app. Quem tem sessão nunca baixa a landing (o pedaço mais pesado, por causa das animações); quem está na landing baixa o login quando o navegador está ocioso (melhor esforço, não garantido: clicar antes mantém a landing na tela até o login chegar, por `startTransition`); o link de redefinição de senha já começa a baixar o pedaço dele na carga. Para o visitante da landing os bytes totais são os mesmos; o ganho é de quem já está logado. Para ver os tamanhos de cada pedaço, `npm run build`.
- **Mapa da página:** uma "ruazinha" fixa na borda direita (`SectionRail`, conta em `railPosition` de `lib/scroll.ts`) com uma parada por seção (ids `inicio`, `tudo`, `cadastrar`, `raio-x`, `comecar`) e um carrinho (SVG em código) que desce por ela conforme a rolagem. No começo da página o carrinho e o rótulo "Você está aqui" pulsam (o rótulo não troca para "Início" ao começar a rolar; o nome só aparece com o mouse/foco no trilho); o nome da seção aparece por um instante quando a parada muda e, em todas, ao passar o mouse; clicar numa parada leva até a seção. Fundo escurecido e translúcido para valer nas seções claras e escuras; no celular a rua é mais estreita e sem nomes. Seção nova na landing = novo item em `STOPS` e `id` na seção. No pé do hero há um convite leve ("Role para ver como funciona" + seta, sem caixa).
- **Animações ao rolar:** `Reveal`/`RevealItem` (IntersectionObserver, sem dependência) fazem os blocos entrarem em sequência; o título do hero é digitado (`Typewriter`) e, depois dele, as três frases sobem e cada check se desenha (`.check-*`); a saída do hero e as seções 3 e 4 (palco fixo) são ligadas à rolagem (a conta fica em `lib/wheel.ts` e `useWheel`; a do hero é CSS puro, com `animation-timeline: view()`, só onde há suporte); a seção 2 NÃO é ligada à rolagem, anda por tempo. Sempre respeitar `prefers-reduced-motion`.
- **Login:** tela dividida (marca em gradiente + formulário); no celular a marca vira uma faixa no topo.

## Modelo de dados

```ts
type ExpenseType = 'maintenance' | 'upgrade' | 'routine';

interface Category { id: string; name: string; }

interface Expense {
  id: string;
  description: string;
  amount: number;        // em reais, 2 casas decimais
  date: string;          // ISO yyyy-mm-dd
  categoryId: string;
  type: ExpenseType;
  odometer?: number;     // km
  notes?: string;
  createdAt: string;
}

interface PlannedExpense {
  id: string;
  description: string;
  estimatedAmount: number;
  estimatedMax?: number; // se for faixa de preço
  categoryId: string;
  type: ExpenseType;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: 'planned' | 'done';
  expenseId?: string;    // preenchido ao virar gasto real
}
```

## Estrutura sugerida

```
src/
  components/    # cards, formulários, gráficos, Logo, Reveal, mocks da landing
  pages/         # Landing, Login, Gastos, VisaoGeral, Planejados, Galeria, Ajustes
  storage/       # única camada que fala com o Supabase (remote.ts), fotos (images.ts), backup/migração
  lib/           # cálculos puros (totais, agrupamentos, filtros, geometria do logo, link do WhatsApp) + testes
  config.ts      # nome do app, WhatsApp de acesso
  types.ts
design/          # arte-fonte do ícone e script que gera os SVGs
public/          # ícones do PWA, favicon, fonte Space Grotesk
```

## Convenções

- Cálculos de totais e agrupamentos ficam em funções puras em `src/lib/`, com testes. Componentes só exibem.
- Formatação de moeda e data centralizada em um único helper (`Intl.NumberFormat` / `Intl.DateTimeFormat` com `pt-BR`).
- Trabalhar valores monetários com cuidado de arredondamento (somar em centavos ou arredondar na exibição).
- Layout responsivo, pensado primeiro para celular (o uso típico é registrar o gasto logo após pagar).
- Não adicionar dependências sem necessidade; manter o projeto simples (por isso fonte hospedada em `public/`, animações em CSS/IntersectionObserver e logo desenhado em código).
- Dados do usuário nunca são apagados sem confirmação. Incluir exportar/importar JSON como backup, mesmo com os dados na nuvem.
- Chaves e URL do Supabase ficam em variáveis de ambiente (`.env.local`, fora do git). Só a chave pública (anon) vai para o front-end; nunca a `service_role`.

## Comandos

Node instalado via Homebrew; se `node`/`npm` não forem encontrados no shell, usar `export PATH="/opt/homebrew/bin:$PATH"`.
- `npm run dev`: servidor de desenvolvimento
- `npm run build`: build de produção (checagem de tipos + PWA)
- `npm test`: testes (Vitest)
- `npm run lint`: lint (oxlint)

## Fora do escopo (por enquanto)

Múltiplos veículos (desejado no futuro, não agora), contas para outros usuários, modo offline completo, controle de consumo (km/l), lembretes de manutenção por km/data, OCR de notas fiscais. Podem virar fases futuras; o modelo de dados deve facilitar adicionar `carId` depois.

## Perguntas em aberto

- ~~Um carro só ou vários?~~ Decidido: um carro por enquanto, com suporte a vários veículos numa fase futura.
- ~~Sincronização?~~ Decidido: celular + computador, via Supabase e PWA.
- ~~Km?~~ Decidido: campo opcional de quilometragem em qualquer gasto. Controle de consumo (km/l) fica fora por ora.
- ~~Provedor?~~ Decidido: Supabase. O usuário vai criar a conta e o projeto (gratuito); o app só é ligado aos dados depois, com a URL e a chave `anon` em `.env.local`.
