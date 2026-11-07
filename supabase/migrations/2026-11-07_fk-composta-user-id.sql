-- FKs compostas (user_id, id): um gasto/planejado só pode apontar para categoria (ou gasto) do MESMO usuário.
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.) Tudo roda numa transação: se algo falhar, nada muda.
--
-- Por que: o RLS impede de LER e ESCREVER linhas de outro usuário, mas a checagem de uma chave estrangeira simples
-- (category_id -> categories.id) é feita pelo banco SEM passar pelo RLS. Quem tem login poderia chamar a API direto e
-- gravar um gasto com category_id de OUTRO usuário: a linha entraria (apontando para dados que não são dela), e a
-- resposta do banco ainda revelaria se aquele id existe. Com a chave composta, o par (user_id, category_id) precisa
-- existir em categories, e user_id é sempre o do próprio dono (o RLS garante). Entre usuários diferentes, o banco recusa.
--
-- Requisitos: Postgres 15+ (`on delete set null (coluna)`); o script confere a versão e para se for mais antiga.

-- Confere a versão do Postgres antes de mexer em qualquer coisa: `on delete set null (coluna)` só existe a partir da 15.
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'Este script precisa do Postgres 15 ou mais novo (versão atual: %).', current_setting('server_version');
  end if;
end $$;

begin;

-- 1) O alvo de uma FK composta precisa ser único: (user_id, id) já é único porque id sozinho já é (chave primária);
--    o índice só existe para o banco aceitar o par como alvo. (Índice único em vez de `unique (...)` da tabela porque
--    `if not exists` deixa o script re-executável; para o banco, os dois servem de alvo.)
create unique index if not exists categories_user_id_id_idx on public.categories (user_id, id);
create unique index if not exists expenses_user_id_id_idx on public.expenses (user_id, id);

-- 2) As novas chaves. O banco confere todas as linhas existentes ao criar: se alguma apontar para outro usuário, falha e desfaz.
alter table public.expenses drop constraint if exists expenses_user_category_fk;
alter table public.expenses
  add constraint expenses_user_category_fk foreign key (user_id, category_id)
  references public.categories (user_id, id) on delete restrict;

alter table public.planned_expenses drop constraint if exists planned_user_category_fk;
alter table public.planned_expenses
  add constraint planned_user_category_fk foreign key (user_id, category_id)
  references public.categories (user_id, id) on delete restrict;

-- set null só na coluna expense_id: um `set null` simples também zeraria user_id, que é obrigatório.
-- Com expense_id vazio a chave não é conferida (MATCH SIMPLE), como antes.
alter table public.planned_expenses drop constraint if exists planned_user_expense_fk;
alter table public.planned_expenses
  add constraint planned_user_expense_fk foreign key (user_id, expense_id)
  references public.expenses (user_id, id) on delete set null (expense_id);

-- 3) Índices nas colunas que APONTAM: ao apagar uma categoria (ou um gasto), o banco procura quem ainda a usa; sem índice,
--    isso varre a tabela inteira. (Uma tabela pequena nem sente, mas é o hábito certo: toda FK pede índice na coluna de origem.)
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
create index if not exists planned_user_category_idx on public.planned_expenses (user_id, category_id);
create index if not exists planned_user_expense_idx on public.planned_expenses (user_id, expense_id);

-- 4) As chaves simples antigas viram redundantes (a composta já garante a existência): saem.
alter table public.expenses drop constraint if exists expenses_category_id_fkey;
alter table public.planned_expenses drop constraint if exists planned_expenses_category_id_fkey;
alter table public.planned_expenses drop constraint if exists planned_expenses_expense_id_fkey;

commit;

-- Conferência (rode depois): deve listar exatamente 3 linhas (as chaves novas) e nenhuma das antigas
-- (expenses_category_id_fkey, planned_expenses_category_id_fkey, planned_expenses_expense_id_fkey).
-- As chaves de user_id -> auth.users ficam de fora do filtro de propósito.
-- select conrelid::regclass as tabela, conname, pg_get_constraintdef(oid) as regra
-- from pg_constraint
-- where contype = 'f'
--   and conrelid in ('public.expenses'::regclass, 'public.planned_expenses'::regclass)
--   and conname not like '%\_user\_id\_fkey'
-- order by 1, 2;
