import { gauge } from '../lib/gauge'

const THIN = gauge(false)
const HEAVY = gauge(true)

/**
 * Logo do app: velocímetro minimalista.
 * `tile`: quadrado escuro arredondado (cabeçalhos, ícone), traço grosso para ler bem pequeno.
 * Sem `tile`: só o desenho, em linha fina e cores claras, para fundos escuros grandes.
 * É decorativo (o nome do app vem escrito ao lado); passe `label` para usar sozinho.
 */
export function Logo({ size = 32, tile = true, label, className }: { size?: number; tile?: boolean; label?: string; className?: string }) {
  const g = tile ? HEAVY : THIN
  const track = tile ? '#1e293b' : '#334155'
  const progress = tile ? '#3b82f6' : '#60a5fa'
  const ink = tile ? '#e2e8f0' : '#ffffff'
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {tile && <rect width="512" height="512" rx="112" fill="#0f172a" />}
      {/* o desenho ocupa y de 86 a ~396: sobe 15 para ficar no meio do quadrado (igual ao favicon) */}
      <g transform="translate(0 15)">
        <path d={g.track} fill={track} />
        <path d={g.progress} fill={progress} />
        {g.caps.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={progress} />
        ))}
        <path d={g.needle} fill={ink} />
        <circle cx={g.hub.cx} cy={g.hub.cy} r={g.hub.r} fill={ink} />
      </g>
    </svg>
  )
}
