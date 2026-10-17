import { ACCESS_MESSAGE, ACCESS_WHATSAPP } from '../config'
import { whatsappLink } from '../lib/whatsapp'

const FEATURES = [
  { icon: '📊', title: 'Visão geral', text: 'Quanto você já gastou no total, no mês e no ano, com gráficos por categoria, por tipo e por mês.' },
  { icon: '🧾', title: 'Gastos', text: 'Registre cada gasto com valor, data, categoria, km e fotos da nota. Filtre por período, categoria e tipo.' },
  { icon: '🗓️', title: 'Planejados', text: 'Anote o que ainda vai gastar, com valor estimado e prioridade, e transforme em gasto real quando acontecer.' },
  { icon: '🚗', title: 'Meu carro', text: 'Uma galeria com as fotos do seu carro, para guardar a história dele.' },
  { icon: '⚙️', title: 'Ajustes', text: 'Suas categorias, backup dos dados em arquivo e a segurança da sua conta.' },
] as const

function RequestAccess({ className = '' }: { className?: string }) {
  return (
    <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className={`btn-primary ${className}`}>
      Solicitar acesso pelo WhatsApp
    </a>
  )
}

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <span className="font-bold">🚗 Histórico do Carro</span>
        <button type="button" className="btn-ghost" onClick={onLogin}>Entrar</button>
      </header>

      <main className="mx-auto max-w-4xl space-y-16 px-4 pt-8 pb-16">
        <section className="text-center">
          <h1 className="text-3xl font-bold md:text-5xl">Saiba quanto o seu carro realmente custa</h1>
          <p className="muted mx-auto mt-4 max-w-xl text-base md:text-lg">
            Registre combustível, manutenção, seguro e melhorias logo depois de pagar. Veja o total gasto, planeje os próximos gastos e tenha o histórico completo do carro no celular e no computador.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RequestAccess />
            <button type="button" className="btn-ghost" onClick={onLogin}>Já tenho conta</button>
          </div>
        </section>

        <section aria-labelledby="recursos">
          <h2 id="recursos" className="mb-6 text-center text-2xl font-bold">Tudo em um só lugar</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="card">
                <div aria-hidden="true" className="mb-2 text-2xl">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="muted mt-1 text-sm">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card text-center">
          <h2 className="text-2xl font-bold">Quer usar?</h2>
          <p className="muted mx-auto mt-2 max-w-md">
            O acesso é liberado manualmente. Mande uma mensagem pelo WhatsApp com o seu e-mail e você recebe o acesso.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <RequestAccess />
            <button type="button" className="btn-ghost" onClick={onLogin}>Já tenho conta</button>
          </div>
        </section>
      </main>
    </div>
  )
}
