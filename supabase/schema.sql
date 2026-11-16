-- Carlog — esquema do banco (Supabase / Postgres)
-- Rode UMA vez: Supabase → SQL Editor → New query → cole tudo → Run.

-- Requisito: Postgres 15+ (`on delete set null (coluna)` nas chaves compostas). Confere já aqui, antes de criar qualquer coisa.
-- Confere a versão do Postgres antes de mexer em qualquer coisa: `on delete set null (coluna)` só existe a partir da 15.
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'Este script precisa do Postgres 15 ou mais novo (versão atual: %).', current_setting('server_version');
  end if;
end $$;

-- ============ Tabelas ============

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  is_fallback boolean not null default false, -- "Outros": recebe os lançamentos de categorias removidas
  created_at timestamptz not null default now()
);
create unique index categories_user_name_idx on public.categories (user_id, lower(name));
create unique index categories_one_fallback_idx on public.categories (user_id) where is_fallback;
-- alvo das chaves compostas abaixo (ver migrations/2026-11-07_fk-composta-user-id.sql)
create unique index categories_user_id_id_idx on public.categories (user_id, id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  category_id uuid not null,
  type text not null check (type in ('maintenance', 'upgrade', 'routine')),
  odometer integer check (odometer >= 0),
  notes text,
  attachments text[] not null default '{}', -- ids das fotos no Storage
  created_at timestamptz not null default now(),
  -- chave composta: só aceita categoria do mesmo usuário (o RLS não vale dentro da checagem de uma FK simples)
  constraint expenses_user_category_fk foreign key (user_id, category_id) references public.categories (user_id, id) on delete restrict
);
create unique index expenses_user_id_id_idx on public.expenses (user_id, id);
create index expenses_user_date_idx on public.expenses (user_id, date desc);
-- índices nas colunas que apontam (apagar categoria/gasto procura quem ainda usa)
create index expenses_user_category_idx on public.expenses (user_id, category_id);

create table public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  estimated_amount numeric(12, 2) not null check (estimated_amount > 0),
  estimated_max numeric(12, 2) check (estimated_max >= estimated_amount),
  category_id uuid not null,
  type text not null check (type in ('maintenance', 'upgrade', 'routine')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  notes text,
  status text not null default 'planned' check (status in ('planned', 'done')),
  expense_id uuid,
  created_at timestamptz not null default now(),
  constraint planned_user_category_fk foreign key (user_id, category_id) references public.categories (user_id, id) on delete restrict,
  -- set null só em expense_id: um set null simples também zeraria user_id (obrigatório). Postgres 15+.
  constraint planned_user_expense_fk foreign key (user_id, expense_id) references public.expenses (user_id, id) on delete set null (expense_id)
);
create index planned_user_idx on public.planned_expenses (user_id);
create index planned_user_category_idx on public.planned_expenses (user_id, category_id);
create index planned_user_expense_idx on public.planned_expenses (user_id, expense_id);

-- ============ Segurança: cada usuário só enxerga as próprias linhas ============

alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.planned_expenses enable row level security;

-- categories: DELETE separado para a categoria "Outros" (is_fallback) não poder ser apagada pela API
create policy "own rows select" on public.categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows insert" on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows update" on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows delete" on public.categories for delete to authenticated
  using (user_id = (select auth.uid()) and not is_fallback);
create policy "own rows" on public.expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.planned_expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ Operações em vários passos (atômicas; security invoker mantém o RLS) ============

-- 1) Marcar um planejado como realizado: cria o gasto e liga os dois, de uma vez.
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
begin
  -- repetir a chamada (resposta perdida) não é erro: se este mesmo gasto já foi ligado ao planejado, não há o que fazer
  perform 1 from public.planned_expenses where id = p_planned_id and status = 'done' and expense_id = p_expense_id;
  if found then
    return;
  end if;

  -- trava a linha do planejado: duas chamadas ao mesmo tempo não criam dois gastos
  perform 1 from public.planned_expenses where id = p_planned_id and status = 'planned' for update;
  if not found then
    raise exception 'Planejado não encontrado ou já realizado.' using errcode = 'P0002';
  end if;

  insert into public.expenses (id, description, amount, date, category_id, type, odometer, notes, attachments, created_at)
  values (p_expense_id, p_description, p_amount, p_date, p_category_id, p_type, p_odometer, p_notes, coalesce(p_attachments, '{}'), p_created_at);

  update public.planned_expenses set status = 'done', expense_id = p_expense_id where id = p_planned_id;
end;
$$;

-- 2) Apagar um gasto: o planejado que o originou volta a ficar pendente.
create or replace function public.delete_expense(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.planned_expenses set status = 'planned', expense_id = null where expense_id = p_id;
  delete from public.expenses where id = p_id;
  -- nada apagado (id velho, ou já apagado em outro aparelho): avisa, para o app não apagar as fotos à toa
  if not found then
    raise exception 'Gasto não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

-- 3) Remover categoria: lançamentos e planejados vão para "Outros" (achada pelo banco, não pelo cliente).
create or replace function public.remove_category(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_fallback uuid;
begin
  perform 1 from public.categories where id = p_id and not is_fallback for update;
  if not found then
    raise exception 'Categoria não encontrada ou protegida ("Outros" não pode ser removida).' using errcode = 'P0002';
  end if;

  select id into v_fallback from public.categories where is_fallback;
  if v_fallback is null then
    raise exception 'Categoria "Outros" não encontrada.' using errcode = 'P0002';
  end if;

  update public.expenses set category_id = v_fallback where category_id = p_id;
  update public.planned_expenses set category_id = v_fallback where category_id = p_id;
  delete from public.categories where id = p_id;
end;
$$;

-- Só usuários logados chamam as funções (por padrão o Postgres libera para todos).
revoke execute on function public.complete_planned(uuid, uuid, text, numeric, date, uuid, text, integer, text, text[], timestamptz) from public, anon;
revoke execute on function public.delete_expense(uuid) from public, anon;
revoke execute on function public.remove_category(uuid) from public, anon;
grant execute on function public.complete_planned(uuid, uuid, text, numeric, date, uuid, text, integer, text, text[], timestamptz) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;
grant execute on function public.remove_category(uuid) to authenticated;

-- ============ Categorias padrão para cada novo usuário ============

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_categories();

-- ============ Fotos (notas fiscais): bucket privado, uma pasta por usuário ============

-- Limites impostos pelo servidor (o app já reduz as fotos, mas o navegador não é confiável): 3 MB e só JPEG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 3145728, array['image/jpeg'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "receipts select own" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts update own" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
