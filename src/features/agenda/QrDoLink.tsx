import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { gerarQrDoLink } from './gerarQr'

/** QR code do link da agenda: aponta a câmera do celular do aluno e abre a página. Gerado no aparelho, sem serviço externo. */
export function QrDoLink({ link, open, onClose }: { link: string; open: boolean; onClose: () => void }) {
  const [imagem, setImagem] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    if (!open) return
    let ativo = true
    gerarQrDoLink(link)
      .then((url) => ativo && setImagem(url))
      .catch(() => ativo && setFalhou(true))
    return () => {
      ativo = false
    }
  }, [open, link])

  return (
    <BottomSheet open={open} onClose={onClose} title="QR code da sua agenda">
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-700">Mostre na academia ou imprima. Quem apontar a câmera do celular abre a sua página e pede um horário.</p>
        {falhou && <p className="text-sm text-red-700">Não consegui gerar o QR code agora. Tente de novo.</p>}
        {imagem && <img src={imagem} alt={`QR code do link da agenda: ${link}`} className="mx-auto w-full max-w-72 rounded-xl border border-slate-200 bg-white p-2" />}
        <p className="break-all text-xs text-slate-600">{link}</p>
        {imagem && (
          <a href={imagem} download="qr-agenda.png" className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50">
            <Download size={16} aria-hidden /> Baixar imagem
          </a>
        )}
      </div>
    </BottomSheet>
  )
}
