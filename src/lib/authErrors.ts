interface AuthLikeError {
  code?: string
  status?: number
  message?: string
  name?: string
}

/** Traduz o erro de login para uma mensagem que diz o que realmente aconteceu. */
export function loginErrorMessage(error: AuthLikeError): string {
  if (error.code === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (error.status === 429 || error.code === 'over_request_rate_limit') {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  }
  if (error.status === 401 || error.status === 403 || /api key/i.test(error.message ?? '')) {
    return 'Erro de configuração do app: a chave do Supabase parece inválida.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status === undefined) {
    return 'Não foi possível falar com o servidor. Verifique a conexão; se persistir, a configuração do app pode estar incorreta.'
  }
  return 'Não foi possível entrar. Tente novamente.'
}

/** Resposta única ao pedir o link de recuperação: não revela se o e-mail tem conta. */
export const RECOVERY_SENT = 'Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha. Pode levar alguns minutos; olhe também o spam.'

/** Traduz o erro ao pedir o link de recuperação de senha. */
export function recoveryErrorMessage(error: AuthLikeError): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return 'Muitos pedidos de e-mail em pouco tempo. Aguarde alguns minutos e tente de novo.'
  }
  if (error.code === 'email_address_invalid') {
    return 'Confira o e-mail digitado.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status === undefined) {
    return 'Não foi possível falar com o servidor. Verifique a conexão e tente novamente.'
  }
  return 'Não foi possível enviar o e-mail. Tente novamente.'
}
