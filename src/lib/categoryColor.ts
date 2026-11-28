// Cada categoria ganha uma cor fixa (as categorias são da pessoa, então a cor sai de um cálculo sobre o nome, não de uma lista).
// As seis classes `cat-0`…`cat-5` ficam em index.css e trocam o tom do texto no tema escuro.

export const CATEGORY_COLORS = 6

/** Índice estável (0 a 5) para uma categoria, sem diferenciar maiúsculas e acentos. */
export function categoryColorIndex(name: string): number {
  const key = name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return h % CATEGORY_COLORS
}

export const categoryColorClass = (name: string): string => `cat-${categoryColorIndex(name)}`
