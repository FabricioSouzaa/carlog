-- Limites de tamanho nos textos e nas fotos de cada gasto/planejado (o app já limita; o banco é a barreira final).
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.) Tudo roda numa transação: se algo falhar, nada muda.
--
-- Por que: hoje `description` e `notes` aceitam texto de qualquer tamanho e `attachments` qualquer quantidade de itens.
-- O impacto é só no próprio usuário (erro, lentidão), mas é fácil de fechar. Limites (iguais aos de src/lib/limits.ts):
--   descrição: 200 caracteres · observações: 2000 caracteres · fotos por gasto: 5
--
-- `not valid`: a regra vale para TODA gravação nova (insert e update), mas o banco NÃO confere as linhas que já existem.
-- Assim a migração nunca falha por causa de um registro antigo grande. Consequência: editar um registro antigo que passe
-- do limite só salva depois de encurtá-lo. Para conferir se existe algum assim, rode ANTES (só leitura):
--
--   select 'gastos' as tabela, max(char_length(description)) as max_descricao, max(char_length(notes)) as max_obs,
--          max(cardinality(attachments)) as max_fotos from public.expenses
--   union all
--   select 'planejados', max(char_length(description)), max(char_length(notes)), null from public.planned_expenses;
--
-- Se os máximos estiverem dentro dos limites (200 / 2000 / 5), pode (opcionalmente) validar tudo de uma vez no fim:
--   alter table public.expenses validate constraint expenses_description_len;  (e assim por diante)

begin;

alter table public.expenses drop constraint if exists expenses_description_len;
alter table public.expenses drop constraint if exists expenses_notes_len;
alter table public.expenses drop constraint if exists expenses_attachments_max;
alter table public.planned_expenses drop constraint if exists planned_description_len;
alter table public.planned_expenses drop constraint if exists planned_notes_len;

alter table public.expenses add constraint expenses_description_len check (char_length(description) <= 200) not valid;
alter table public.expenses add constraint expenses_notes_len check (char_length(notes) <= 2000) not valid;
alter table public.expenses add constraint expenses_attachments_max check (cardinality(attachments) <= 5) not valid;
alter table public.planned_expenses add constraint planned_description_len check (char_length(description) <= 200) not valid;
alter table public.planned_expenses add constraint planned_notes_len check (char_length(notes) <= 2000) not valid;

commit;
