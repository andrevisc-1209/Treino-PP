import { useEffect, useId, useRef } from 'react'
import { Input } from '@/components/ui'

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: { fields?: string[]; types?: string[] },
          ) => {
            addListener: (evento: string, cb: () => void) => void
            getPlace: () => {
              name?: string
              formatted_address?: string
              place_id?: string
              url?: string
            }
          }
        }
      }
    }
    __inicializarGoogleMaps?: () => void
  }
}

const SCRIPT_ID = 'google-maps-places-script'
let carregando: Promise<void> | null = null

function carregarScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve()
  if (carregando) return carregando
  carregando = new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__inicializarGoogleMaps`
    script.async = true
    script.defer = true
    window.__inicializarGoogleMaps = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o Google Maps'))
    document.head.appendChild(script)
  })
  return carregando
}

export type LocalSelecionado = { nome: string; endereco: string; mapsLink: string }

/**
 * Campo de texto com autocomplete do Google Places. Some sem quebrar nada se
 * VITE_GOOGLE_MAPS_API_KEY não estiver definida — vira um Input comum (sem
 * sugestões), pra não travar o cadastro em quem não tem a chave configurada.
 */
export function GooglePlacesAutocomplete({
  onSelecionar,
  placeholder,
}: {
  onSelecionar: (local: LocalSelecionado) => void
  placeholder?: string
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    if (!apiKey) return
    let cancelado = false
    carregarScript(apiKey).then(() => {
      if (cancelado || !inputRef.current || !window.google) return
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['name', 'formatted_address', 'place_id', 'url'],
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.formatted_address) return
        onSelecionar({
          nome: place.name ?? place.formatted_address,
          endereco: place.formatted_address,
          mapsLink: place.url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.formatted_address)}`,
        })
        if (inputRef.current) inputRef.current.value = ''
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  return <Input ref={inputRef} id={inputId} placeholder={placeholder ?? 'Digite pra buscar um endereço'} autoComplete="off" />
}
