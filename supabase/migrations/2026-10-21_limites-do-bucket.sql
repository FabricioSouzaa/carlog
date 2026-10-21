-- Limites do bucket de fotos (`receipts`): máx. 3 MB por arquivo e só JPEG.
-- Para PROJETOS JÁ CRIADOS: Supabase → SQL Editor → New query → cole tudo → Run. Pode rodar mais de uma vez.
-- (Projetos novos já recebem isso pelo schema.sql.)
--
-- Por que: o app reduz a foto no navegador (1600 px, JPEG), mas o navegador é território do usuário.
-- Quem tem login poderia chamar a API direto e subir um arquivo de 2 GB. O servidor precisa impor o limite.
update storage.buckets
set file_size_limit = 3145728,            -- 3 MB
    allowed_mime_types = array['image/jpeg']
where id = 'receipts';
