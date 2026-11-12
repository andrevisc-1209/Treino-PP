import { useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { guardarVarianteDaBarra, lerVarianteDaBarra, ordemDaBarra, varianteGuardada } from './barraInferior'

export { ITEMS } from './barraInferior'

export function BottomNav() {
  const { search } = useLocation()
  const variante = useMemo(() => lerVarianteDaBarra(search, varianteGuardada()), [search])
  useEffect(() => {
    if (new URLSearchParams(search).get('barra')) guardarVarianteDaBarra(variante)
  }, [search, variante])
  const itens = ordemDaBarra(variante)

  return (
    <nav data-bottom-nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {itens.map(({ to, label, icon: Icon, end }) => {
          const destaque = variante === 'centro' && to === '/'
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  isActive ? 'text-brand' : 'text-slate-500',
                  destaque && 'relative',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {destaque ? (
                    <span className={cn('-mt-5 flex size-12 items-center justify-center rounded-full shadow-md ring-4 ring-white', isActive ? 'bg-brand text-white' : 'bg-brand-soft text-brand-hover')}>
                      <Icon size={24} />
                    </span>
                  ) : (
                    <Icon size={22} />
                  )}
                  {label}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
