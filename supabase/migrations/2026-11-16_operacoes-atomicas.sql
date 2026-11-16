-- Operações em vários passos viram funções do banco (atômicas) e a categoria "Outros" fica protegida no servidor.
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.) Tudo roda numa transação: se algo falhar, nada muda.
--
-- Por que: o app fazia 2-3 comandos seguidos (inserir o gasto e depois atualizar o planejado; mover lançamentos e depois
-- apagar a categoria...). Se a rede caísse no meio, os dados ficavam pela metade, e repetir a ação podia duplicar o gasto.
-- Dentro de uma função, o Postgres desfaz tudo se qualquer passo falhar.
--
-- `security invoker`: a função roda com os direitos de quem chamou, então o RLS continua valendo em cada comando
-- (cada usuário só mexe nas próprias linhas).

begin;

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
  perform 1 from public.categories where id = p_id and not is_fallback;
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

-- 4) A categoria "Outros" não pode ser apagada pela API. A política de DELETE separada vale só para chamadas do usuário;
--    apagar a conta (cascade de auth.users) não passa pelo RLS e continua funcionando.
drop policy if exists "own rows" on public.categories;
drop policy if exists "own rows select" on public.categories;
drop policy if exists "own rows insert" on public.categories;
drop policy if exists "own rows update" on public.categories;
drop policy if exists "own rows delete" on public.categories;
create policy "own rows select" on public.categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows insert" on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows update" on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows delete" on public.categories for delete to authenticated
  using (user_id = (select auth.uid()) and not is_fallback);

commit;
