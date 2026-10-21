-- Carlog — esquema do banco (Supabase / Postgres)
-- Rode UMA vez: Supabase → SQL Editor → New query → cole tudo → Run.

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

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  type text not null check (type in ('maintenance', 'upgrade', 'routine')),
  odometer integer check (odometer >= 0),
  notes text,
  attachments text[] not null default '{}', -- ids das fotos no Storage
  created_at timestamptz not null default now()
);
create index expenses_user_date_idx on public.expenses (user_id, date desc);

create table public.planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  estimated_amount numeric(12, 2) not null check (estimated_amount > 0),
  estimated_max numeric(12, 2) check (estimated_max >= estimated_amount),
  category_id uuid not null references public.categories (id) on delete restrict,
  type text not null check (type in ('maintenance', 'upgrade', 'routine')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  notes text,
  status text not null default 'planned' check (status in ('planned', 'done')),
  expense_id uuid references public.expenses (id) on delete set null,
  created_at timestamptz not null default now()
);
create index planned_user_idx on public.planned_expenses (user_id);

-- ============ Segurança: cada usuário só enxerga as próprias linhas ============

alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.planned_expenses enable row level security;

create policy "own rows" on public.categories for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.planned_expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

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
