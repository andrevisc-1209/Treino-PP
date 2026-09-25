import { NavLink } from 'react-router-dom'
import { Dumbbell, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/', label: 'Alunos', icon: Users, end: true },
  { to: '/exercicios', label: 'Exercícios', icon: Dumbbell, end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                isActive ? 'text-brand' : 'text-slate-500',
              )
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
