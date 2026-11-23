// Limites de tamanho dos dados. Os mesmos números estão no banco (supabase/migrations/2026-11-17_limites-de-campos.sql
// e schema.sql): o app limita na digitação e na importação, o banco é a barreira final (o navegador não é confiável).
export const DESCRIPTION_MAX = 200
export const NOTES_MAX = 2000
export const CATEGORY_NAME_MAX = 100
export const MAX_ATTACHMENTS = 5 // fotos por gasto

// só na importação de backup
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
export const MAX_BACKUP_CATEGORIES = 200
export const MAX_BACKUP_ROWS = 10_000 // gastos, e também planejados
