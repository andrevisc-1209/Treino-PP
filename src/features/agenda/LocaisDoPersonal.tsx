import { useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { GooglePlacesAutocomplete, type LocalSelecionado } from '@/components/GooglePlacesAutocomplete'
import { mostrarErroGlobal, mostrarInfoGlobal } from '@/components/Toast'
import { Button } from '@/components/ui'
import { useExigirAssinatura } from '@/features/assinatura/useExigirAssinatura'
import { mapearErroSupabase } from '@/lib/erros'
import { useSalvarProfessionalConfig, type ProfessionalConfig } from './api'
import { adicionarLocal, lerLocais, MAX_LOCAIS, removerLocal, resumoDosLocais, type LocalDeAtendimento } from './locaisAtendimento'

/**
 * "Onde você atende": até 5 locais (2 academias, um parque...), escolhidos na busca do Google. Salva na hora.
 * A página pública mostra só os NOMES (resumo em pagina_locais); o endereço completo fica só com o personal.
 */
export function LocaisDoPersonal({ config }: { config: ProfessionalConfig | null | undefined }) {
  const { exigir } = useExigirAssinatura()
  const salvar = useSalvarProfessionalConfig()
  const lista = lerLocais(config?.locais_atendimento)
  const textoAntigo = lista.length === 0 ? config?.pagina_locais?.trim() || null : null
  const [digitado, setDigitado] = useState('')
  const [versao, setVersao] = useState(0)
  const cheia = lista.length >= MAX_LOCAIS

  const gravar = async (nova: LocalDeAtendimento[]) => {
    try {
      await salvar.mutateAsync({ locais_atendimento: nova, pagina_locais: resumoDosLocais(nova) })
      return true
    } catch (e) {
      mostrarErroGlobal(mapearErroSupabase(e))
      return false
    }
  }

  const adicionar = async (novo: LocalDeAtendimento) => {
    const r = adicionarLocal(lista, novo)
    if (!r.ok) return mostrarErroGlobal(r.motivo)
    if (await gravar(r.lista)) {
      setDigitado('')
      setVersao((v) => v + 1) // limpa o campo de busca
      mostrarInfoGlobal('Local adicionado.')
    }
  }

  const doGoogle = (l: LocalSelecionado) => void adicionar({ nome: l.nome, endereco: l.endereco, mapsLink: l.mapsLink })

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Onde você atende</p>
      <p className="text-xs text-slate-600">Até {MAX_LOCAIS} locais: duas academias, um parque. A página pública mostra só o nome de cada um, não o endereço.</p>

      {lista.length > 0 && (
        <ul className="space-y-1.5" aria-label="Seus locais de atendimento">
          {lista.map((l, i) => (
            <li key={`${l.nome}-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 pl-3">
              <MapPin size={16} className="shrink-0 text-slate-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{l.nome}</span>
                {l.endereco && <span className="block truncate text-xs text-slate-600">{l.endereco}</span>}
              </span>
              <button
                type="button"
                aria-label={`Remover ${l.nome}`}
                disabled={salvar.isPending}
                onClick={exigir(() => void gravar(removerLocal(lista, i)))}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-500 active:bg-slate-100 disabled:opacity-60"
              >
                <X size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {textoAntigo && <p className="rounded-xl bg-slate-100 p-2 text-xs text-slate-700">Texto antigo na página: “{textoAntigo}”. Ao adicionar um local, ele é substituído.</p>}

      {cheia ? (
        <p className="text-xs text-slate-600">Você chegou ao limite de {MAX_LOCAIS} locais. Remova um para adicionar outro.</p>
      ) : (
        <div className="space-y-2">
          <GooglePlacesAutocomplete
            key={versao}
            tipos={['establishment']}
            onSelecionar={(l) => exigir(() => doGoogle(l))()}
            onChangeTexto={setDigitado}
            placeholder="Buscar academia ou local…"
          />
          {digitado.trim().length >= 2 && (
            <Button type="button" variant="outline" className="w-full" disabled={salvar.isPending} onClick={exigir(() => void adicionar({ nome: digitado, endereco: '', mapsLink: '' }))}>
              Adicionar “{digitado.trim().slice(0, 40)}” como está
            </Button>
          )}
          <p className="text-xs text-slate-600">Não achou na busca? Digite o nome e use o botão acima.</p>
        </div>
      )}
    </div>
  )
}
