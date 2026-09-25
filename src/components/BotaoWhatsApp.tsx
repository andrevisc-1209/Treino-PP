import { linkWhatsApp } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'

function IconeWhatsApp({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
      <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.52 3.633 1.428 5.13L2 22l5.006-1.412A9.94 9.94 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm0 18a7.94 7.94 0 0 1-4.052-1.11l-.29-.172-3.01.849.85-2.937-.19-.3A7.94 7.94 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8Z" />
    </svg>
  )
}

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
      <IconeWhatsApp size={size} />
    </a>
  )
}
