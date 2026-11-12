import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const CHAVE = 'treino_rolagem'

function lerMapa(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function guardar(chave: string, y: number) {
  try {
    const m = lerMapa()
    m[chave] = y
    const chaves = Object.keys(m)
    // mantém só as 50 mais recentes para o sessionStorage não crescer sem fim
    if (chaves.length > 50) delete m[chaves[0]]
    sessionStorage.setItem(CHAVE, JSON.stringify(m))
  } catch {
    // sessionStorage indisponível — a rolagem simplesmente não é lembrada
  }
}

/**
 * Voltar (botão do celular ou seta) devolve a tela à posição em que estava; abrir uma tela nova começa no topo.
 * Só mexe quando o caminho muda: trocar filtro ou aba pela URL não pula a página.
 * O BrowserRouter não traz isso pronto (o ScrollRestoration só existe nos roteadores de dados).
 */
export function RestauraRolagem() {
  const { pathname, key } = useLocation()
  const tipo = useNavigationType()
  const caminhoAnterior = useRef(pathname)
  const ultimaChave = useRef(key)

  useEffect(() => {
    const aoRolar = () => guardar(ultimaChave.current, window.scrollY)
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useLayoutEffect(() => {
    ultimaChave.current = key
    const mudouCaminho = caminhoAnterior.current !== pathname
    caminhoAnterior.current = pathname
    if (tipo === 'POP') {
      const alvo = lerMapa()[key]
      if (!alvo) return
      // o conteúdo costuma chegar depois (consulta ao banco): tenta algumas vezes até a página ter altura
      let tentativas = 0
      const tentar = () => {
        window.scrollTo(0, alvo)
        if (Math.abs(window.scrollY - alvo) > 2 && tentativas++ < 12) timer = window.setTimeout(tentar, 80)
      }
      let timer = window.setTimeout(tentar, 0)
      return () => window.clearTimeout(timer)
    }
    if (mudouCaminho) window.scrollTo(0, 0)
  }, [pathname, key, tipo])

  return null
}
