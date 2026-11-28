-- Vários veículos, passo 1 de 3 ("expandir"): o banco passa a conhecer carros, SEM quebrar o app que está no ar.
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.) Tudo roda numa transação: se algo falhar, nada muda.
--
-- Por que "expandir e depois contrair": entre você rodar este SQL e a Vercel publicar o app novo, o app ANTIGO continua
-- inserindo gastos sem carro. Por isso `car_id` nasce permitindo vazio e um gatilho preenche com o carro da pessoa.
-- Enquanto o gatilho existir, um insert sem carro cai no carro mais antigo SEM aviso: por isso a fase "expandir" deve durar pouco
-- (aba antiga do app ou importação gravariam no carro errado depois que houver mais de um). Só depois que o app novo estiver no ar vem o passo 3 ("contrair"): `car_id` vira obrigatório e o gatilho sai.
--
-- O que muda:
--  1) tabela `cars` (cada usuário só enxerga os próprios carros; nunca fica sem nenhum, nem por apagamentos simultâneos);
--  2) `car_id` em gastos e planejados, com chave estrangeira composta (user_id, car_id): impede apontar para carro de outra conta;
--  3) um carro "Meu carro" para cada usuário que já existe, e os gastos/planejados atuais passam para ele;
--  4) gatilho que preenche `car_id` quando não vier informado; usuário novo já nasce com um carro;
--  5) `complete_planned` copia o carro do planejado para o gasto (o cliente não escolhe, o gasto nunca cai em outro carro).
--
-- Conferir depois (só leitura): select (select count(*) from cars) as carros,
--   (select count(*) from expenses where car_id is null) as gastos_sem_carro,
--   (select count(*) from planned_expenses where car_id is null) as planejados_sem_carro;   -- os dois últimos devem dar 0

begin;

-- 1) Carros
create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  model text,
  year integer check (year between 1900 and 2100),
  created_at timestamptz not null default now(),
  constraint cars_name_len check (char_length(name) <= 100),
  constraint cars_model_len check (char_length(model) <= 100)
);
create unique index if not exists cars_user_name_idx on public.cars (user_id, lower(name));
-- alvo das chaves compostas (gastos e planejados → carro)
create unique index if not exists cars_user_id_id_idx on public.cars (user_id, id);

alter table public.cars enable row level security;
drop policy if exists "own rows select" on public.cars;
drop policy if exists "own rows insert" on public.cars;
drop policy if exists "own rows update" on public.cars;
drop policy if exists "own rows delete" on public.cars;
create policy "own rows select" on public.cars for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows insert" on public.cars for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows update" on public.cars for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- o último carro não sai (gatilho `keep_last_car`, mais abaixo); carro com gastos ou planejados também não: a chave estrangeira
-- abaixo recusa (`no action`).
create policy "own rows delete" on public.cars for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) Um carro para cada usuário que já existe e passagem dos dados atuais para ele
insert into public.cars (user_id, name)
select u.id, 'Meu carro'
from auth.users u
where not exists (select 1 from public.cars x where x.user_id = u.id);

alter table public.expenses add column if not exists car_id uuid;
alter table public.planned_expenses add column if not exists car_id uuid;

update public.expenses e
set car_id = (select c.id from public.cars c where c.user_id = e.user_id order by c.created_at, c.id limit 1)
where e.car_id is null;
update public.planned_expenses p
set car_id = (select c.id from public.cars c where c.user_id = p.user_id order by c.created_at, c.id limit 1)
where p.car_id is null;

-- 3) Chaves estrangeiras compostas e índices (apagar um carro procura quem ainda o usa).
--    `no action` (e não `restrict`): também recusa apagar carro em uso, mas só confere no FIM do comando, então apagar a conta
--    (cascade de auth.users para carros e gastos, em qualquer ordem) continua funcionando.
alter table public.expenses drop constraint if exists expenses_user_car_fk;
alter table public.expenses add constraint expenses_user_car_fk
  foreign key (user_id, car_id) references public.cars (user_id, id) on delete no action;
alter table public.planned_expenses drop constraint if exists planned_user_car_fk;
alter table public.planned_expenses add constraint planned_user_car_fk
  foreign key (user_id, car_id) references public.cars (user_id, id) on delete no action;
create index if not exists expenses_user_car_idx on public.expenses (user_id, car_id);
create index if not exists planned_user_car_idx on public.planned_expenses (user_id, car_id);

-- 3b) O último carro não pode ser apagado, nem por dois apagamentos simultâneos (um gatilho com trava, não só a política).
create or replace function public.keep_last_car()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- apagar a CONTA (cascade de auth.users) leva todos os carros: aí a linha do usuário já não existe e tudo bem
  if not exists (select 1 from auth.users where id = old.user_id) then
    return old;
  end if;
  -- trava os carros do usuário: dois apagamentos ao mesmo tempo esperam um pelo outro e o segundo já enxerga o resultado do primeiro
  perform 1 from public.cars where user_id = old.user_id for update;
  if not exists (select 1 from public.cars where user_id = old.user_id and id <> old.id) then
    raise exception 'O último carro não pode ser removido.' using errcode = 'P0002';
  end if;
  return old;
end;
$$;
drop trigger if exists cars_keep_last on public.cars;
create trigger cars_keep_last before delete on public.cars for each row execute function public.keep_last_car();

-- 4) Gatilho: sem `car_id` informado, usa o carro mais antigo da pessoa (some no passo 3, quando `car_id` virar obrigatório).
--    `security invoker`: lê `cars` com os direitos de quem insere, então o RLS continua valendo.
create or replace function public.fill_car_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.car_id is null then
    select c.id into new.car_id from public.cars c where c.user_id = new.user_id order by c.created_at, c.id limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists expenses_fill_car on public.expenses;
create trigger expenses_fill_car before insert on public.expenses for each row execute function public.fill_car_id();
drop trigger if exists planned_fill_car on public.planned_expenses;
create trigger planned_fill_car before insert on public.planned_expenses for each row execute function public.fill_car_id();

-- Usuário novo: categorias padrão (como antes) + o primeiro carro.
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, is_fallback) values
    (new.id, 'Combustível', false),
    (new.id, 'Manutenção', false),
    (new.id, 'Peças', false),
    (new.id, 'Seguro', false),
    (new.id, 'IPVA/Licenciamento', false),
    (new.id, 'Estacionamento/Pedágio', false),
    (new.id, 'Lavagem/Estética', false),
    (new.id, 'Multas', false),
    (new.id, 'Acessórios', false),
    (new.id, 'Outros', true);
  insert into public.cars (user_id, name) values (new.id, 'Meu carro');
  return new;
end;
$$;

-- 5) Marcar um planejado como realizado: o gasto herda o carro do planejado (mesma assinatura de antes: o app antigo continua funcionando).
create or replace function public.complete_planned(
  p_planned_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_date date,
  p_category_id uuid,
  p_type text,
  p_odometer integer,
  p_notes text,
  p_attachments text[],
  p_created_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_car uuid;
begin
  -- repetir a chamada (resposta perdida) não é erro: se este mesmo gasto já foi ligado ao planejado, não há o que fazer
  perform 1 from public.planned_expenses where id = p_planned_id and status = 'done' and expense_id = p_expense_id;
  if found then
    return;
  end if;

  -- trava a linha do planejado: duas chamadas ao mesmo tempo não criam dois gastos
  select car_id into v_car from public.planned_expenses where id = p_planned_id and status = 'planned' for update;
  if not found then
    raise exception 'Planejado não encontrado ou já realizado.' using errcode = 'P0002';
  end if;

  insert into public.expenses (id, description, amount, date, category_id, type, odometer, notes, attachments, created_at, car_id)
  values (p_expense_id, p_description, p_amount, p_date, p_category_id, p_type, p_odometer, p_notes, coalesce(p_attachments, '{}'), p_created_at, v_car);

  update public.planned_expenses set status = 'done', expense_id = p_expense_id where id = p_planned_id;
end;
$$;

commit;
