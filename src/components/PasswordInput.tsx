import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './ui'

/** Campo de senha com botão de olho pra alternar visibilidade. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(
  { className, ...p },
  ref,
) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="relative">
      <Input ref={ref} type={visivel ? 'text' : 'password'} className={className ? `pr-11 ${className}` : 'pr-11'} {...p} />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-slate-400"
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        tabIndex={-1}
      >
        {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
})
