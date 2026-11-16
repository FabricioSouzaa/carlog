export const MIN_PASSWORD_LENGTH = 8

/** Devolve o problema da nova senha, ou null se estiver ok. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (password !== confirm) return 'As senhas não conferem.'
  return null
}

/** Traduz o erro do Supabase ao trocar a senha. */
export function passwordUpdateError(error: { code?: string; status?: number }): string {
  if (error.code === 'same_password') return 'A nova senha precisa ser diferente da atual.'
  if (error.code === 'weak_password') return 'Senha fraca. Use uma mais longa e variada.'
  if (error.code === 'reauthentication_needed' || error.code === 'reauthentication_not_valid') {
    return 'Por segurança, entre de novo (Sair e Entrar) e depois altere a senha.'
  }
  if (error.code === 'session_expired' || error.code === 'session_not_found' || error.status === 401) {
    return 'Sua sessão expirou. Entre novamente e tente de novo.'
  }
  return 'Não foi possível alterar a senha. Tente novamente.'
}
