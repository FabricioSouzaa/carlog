-- Vários veículos, passo 3 de 3 ("contrair"): `car_id` passa a ser obrigatório e o gatilho de preenchimento sai.
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.) Tudo roda numa transação: se algo falhar, nada muda.
--
-- RODE SÓ DEPOIS de o app novo (que sempre envia o carro) estar no ar na Vercel e de você ter recarregado o app nos aparelhos
-- (é um PWA: uma aba ou instalação ainda no código antigo grava gasto sem carro, e depois deste SQL o banco RECUSA esse gasto).
--
-- O que muda:
--  1) gastos e planejados que ainda estejam sem carro (gravados pelo app antigo depois do passo 1) vão para o carro mais antigo da pessoa;
--  2) `car_id` vira `not null` nas duas tabelas;
--  3) os gatilhos `expenses_fill_car` e `planned_fill_car` e a função `fill_car_id` saem: sem carro informado, o insert é recusado.
--
-- Conferir depois (só leitura): select count(*) from information_schema.columns
--   where table_name in ('expenses', 'planned_expenses') and column_name = 'car_id' and is_nullable = 'NO';   -- deve dar 2

begin;

-- 1) Últimos retardatários do app antigo
update public.expenses e
set car_id = (select c.id from public.cars c where c.user_id = e.user_id order by c.created_at, c.id limit 1)
where e.car_id is null;
update public.planned_expenses p
set car_id = (select c.id from public.cars c where c.user_id = p.user_id order by c.created_at, c.id limit 1)
where p.car_id is null;

-- 2) Obrigatório (falha com erro claro se algum usuário não tiver carro, e então nada muda)
alter table public.expenses alter column car_id set not null;
alter table public.planned_expenses alter column car_id set not null;

-- 3) Sem preenchimento automático
drop trigger if exists expenses_fill_car on public.expenses;
drop trigger if exists planned_fill_car on public.planned_expenses;
drop function if exists public.fill_car_id();

commit;
