import type { ScreenKey } from './AppScreens'

/** As cinco telas do app, na ordem da seção "Tudo em um só lugar" (textos curtos de propósito). */
export const FEATURES: { title: string; text: string; screen: ScreenKey }[] = [
  { title: 'Visão geral', text: 'Seus totais e gráficos, num olhar.', screen: 'visao' },
  { title: 'Gastos', text: 'Cada gasto com valor, data, km e foto da nota.', screen: 'gastos' },
  { title: 'Planejados', text: 'O que vem pela frente, com valor e prioridade.', screen: 'planejados' },
  { title: 'Meu carro', text: 'A galeria de fotos do seu carro.', screen: 'galeria' },
  { title: 'Ajustes', text: 'Categorias, backup e segurança da conta.', screen: 'ajustes' },
]
