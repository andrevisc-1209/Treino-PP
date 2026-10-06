import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/meus-treinos/planejados', label: 'Treinos planejados', end: false },
  { to: '/meus-treinos/exercicios', label: 'Exercícios', end: false },
]

export function ExerciciosTabs() {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
      {ITEMS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-center text-sm font-medium transition',
              isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}
