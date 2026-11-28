import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthTotal } from '../lib/calc'
import { formatCurrency, formatMonth } from '../lib/format'

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** Evolução mensal: colunas finas, uma série, tooltip no hover/toque. */
export default function MonthlyBars({ items }: { items: MonthTotal[] }) {
  const data = items.map((i) => ({ ...i, label: formatMonth(i.month) }))
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--axis)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: 'var(--axis)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => compact.format(v)} width={44} />
          <Tooltip
            cursor={{ fill: 'var(--grid)', opacity: 0.5 }}
            formatter={(v) => [formatCurrency(Number(v)), 'Gasto']}
            labelStyle={{ color: 'var(--axis)' }}
            contentStyle={{ borderRadius: 12, border: '1px solid var(--grid)', background: 'var(--color-surface)', color: 'var(--color-ink)' }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell key={d.month} fill={i === data.length - 1 ? 'var(--bar-hi)' : 'var(--bar)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
