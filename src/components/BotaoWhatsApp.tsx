import { MessageCircle } from 'lucide-react'
import { linkWhatsApp } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'

export function BotaoWhatsApp({
  telefone,
  label,
  className,
  size = 20,
}: {
  telefone: string | null | undefined
  label?: string
  className?: string
  size?: number
}) {
  const link = linkWhatsApp(telefone)
  if (!link) return null

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={label ?? 'Abrir WhatsApp'}
      className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-emerald-600 active:bg-emerald-50', className)}
    >
      <MessageCircle size={size} />
    </a>
  )
}
