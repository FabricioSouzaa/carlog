# Carlog

**Carlog** ("o histórico do seu carro") é um app pessoal para registrar as despesas e manutenções do carro, ver quanto já foi gasto e planejar gastos futuros. Funciona no celular e no computador (PWA) e guarda tudo na nuvem. Em produção: <https://usecarlog.vercel.app>.

## Funcionalidades

- **Gastos:** cards com descrição, valor, data, categoria, tipo (manutenção, valorização ou rotina), quilometragem opcional e até 5 fotos (ex.: nota fiscal da oficina). Filtros por categoria, tipo e período, com o total acompanhando os filtros.
- **Visão geral:** totais (geral, mês e ano), gráficos por mês, categoria e tipo, últimos gastos e custo por km.
- **Planejados:** gastos que ainda vão acontecer, com valor estimado (ou faixa), prioridade e link. Ao realizar, viram um gasto de verdade.
- **Meu carro:** galeria de fotos do carro (toque no nome do app).
- **Ajustes:** categorias personalizadas, backup em JSON e conta.
- **Landing e login:** quem não está logado vê uma página de apresentação em 5 seções (com animações ao rolar) e um login em tela dividida. O acesso é por pedido: o botão "Solicitar acesso pelo WhatsApp" abre uma conversa com a mensagem pronta.

## Stack

React · TypeScript · Vite (PWA) · Tailwind CSS · Recharts · Supabase (Postgres, Auth e Storage) · Vitest. Fonte de destaque: Space Grotesk (SIL OFL), hospedada no próprio site.

## Como rodar

Requer Node.js 22.12+ e um projeto no [Supabase](https://supabase.com) (plano gratuito).

1. Instale as dependências:
   ```bash
   npm install
   ```
2. No Supabase, abra **SQL Editor** e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Ele cria as tabelas, as regras de acesso (cada usuário só vê os próprios dados), as categorias padrão e o bucket privado das fotos.
3. Copie `.env.local.example` para `.env.local` e preencha com a **Project URL** e a chave **anon public** (*Project Settings → API*). Nunca use a `service_role` no front-end.
4. Em *Authentication → Providers → Email*, desligue **Confirm email** (uso pessoal) e, depois de criar sua conta, desative o cadastro público de novos usuários. O app não tem tela de cadastro: novas contas são criadas por você, no painel do Supabase (*Authentication → Users*).
5. (Opcional) Troque o WhatsApp que recebe os pedidos de acesso em `src/config.ts`.
6. Inicie:
   ```bash
   npm run dev
   ```

## Segurança e automação

- **Os dados são protegidos no banco, não no front-end** (o código do site é público): cada tabela tem RLS ligada e cada usuário só enxerga as próprias linhas; as fotos ficam num bucket privado, em uma pasta por usuário. Veja `supabase/schema.sql`.
- O bucket de fotos aceita só JPEG de até 3 MB. Em projetos criados antes dessa regra, rode `supabase/migrations/2026-10-21_limites-do-bucket.sql` no SQL Editor.
- **CI** (`.github/workflows/ci.yml`): a cada PR roda lint, testes e build no GitHub. **Dependabot** (`.github/dependabot.yml`) abre PRs semanais de atualização.
- **Cabeçalhos de segurança** (`vercel.json`): `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `Cross-Origin-Opener-Policy` já valem. A **CSP** (quais origens o site pode carregar) está em modo `Report-Only`: o navegador só *avisa* no console o que bloquearia, sem bloquear. Depois de usar o app logado sem avisos, troque para `Content-Security-Policy` para valer de verdade. Se um dia o app passar a carregar algo de fora (fonte, imagem, API), a origem precisa entrar na CSP.
- Mudanças no banco depois da primeira instalação entram como arquivos novos em `supabase/migrations/` (o `schema.sql` só é rodado uma vez, no começo).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (checagem de tipos + PWA) |
| `npm test` | testes (Vitest) |
| `npm run lint` | lint (oxlint) |

## Deploy

Qualquer host de sites estáticos serve (Vercel, Netlify, Cloudflare Pages). Defina as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel do host. Hoje o site está na Vercel: cada merge na `main` publica em produção e cada branch enviada ganha um link de prévia.

## Estrutura

```
src/
  components/   cards, formulários, gráficos, logo, animações da landing
  pages/        Landing, Login, Visão geral, Gastos, Planejados, Meu carro, Ajustes
  storage/      única camada que fala com o Supabase (dados, fotos, backup)
  lib/          cálculos puros (totais, filtros, logo, link do WhatsApp) com testes
  config.ts     nome do app e WhatsApp de acesso
design/         arte-fonte do ícone e script que gera os SVGs (`node design/build-icons.mjs`)
public/         ícones do PWA, favicon e fonte
supabase/
  schema.sql    esquema do banco e regras de acesso
```

Detalhes de produto e decisões em [`CLAUDE.md`](CLAUDE.md).

## Licença

[MIT](LICENSE). A fonte Space Grotesk (`public/fonts/`) é distribuída sob a SIL Open Font License 1.1.
