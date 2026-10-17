/** Link `wa.me` que abre a conversa com a mensagem já preenchida. `phone` só com dígitos, com DDI. */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
