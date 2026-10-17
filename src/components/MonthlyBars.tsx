import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
            contentStyle={{ borderRadius: 8, border: '1px solid var(--grid)' }}
          />
          <Bar dataKey="total" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
