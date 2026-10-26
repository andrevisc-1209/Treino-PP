import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIVACIDADE_TEXTO } from './textos'

// A Política de Privacidade (seção 3) descreve o que a landing coleta. Se o script de analytics mudar (por exemplo, voltar a gravar
// a sessão ou a usar cookies), a política precisa mudar junto, na mesma PR (regra do BACKLOG). Este teste aponta a divergência.
const landing = fs.readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'public', 'landing.html'), 'utf8')
const secao3 = PRIVACIDADE_TEXTO.slice(PRIVACIDADE_TEXTO.indexOf('3. Análise de uso da página inicial'), PRIVACIDADE_TEXTO.indexOf('4. Compartilhamento com terceiros'))

describe('landing × Política de Privacidade (seção 3)', () => {
  it('a landing só carrega o PostHog depois do aceite e sem gravar a sessão nem usar cookies', () => {
    expect(landing).toMatch(/disable_session_recording:\s*true/)
    expect(landing).toMatch(/persistence:\s*'localStorage'/)
    expect(landing).toMatch(/autocapture:\s*false/)
    // o loader do PostHog fica dentro de iniciar(), chamado só no aceite
    const iniciar = landing.slice(landing.indexOf('function iniciar()'))
    expect(iniciar.indexOf('posthog.init')).toBeGreaterThan(-1)
    expect(landing.slice(0, landing.indexOf('function iniciar()'))).not.toMatch(/posthog\.init\(/)
    expect(landing).toMatch(/globalPrivacyControl/)
    expect(landing).toMatch(/id="abrir-cookies"/)
  })

  it('a política diz o mesmo: consentimento, sem gravação de sessão, sem cookies, revogação no rodapé, GPC', () => {
    expect(secao3).toMatch(/consentimento explícito/)
    expect(secao3).toMatch(/Não gravamos a sua sessão/)
    expect(secao3).toMatch(/sem uso de cookies/)
    expect(secao3).toMatch(/Preferências de cookies/)
    expect(secao3).toMatch(/Global Privacy Control/)
    expect(secao3).toMatch(/endereço IP/)
  })

  it('a política não promete o que a landing não faz (nada de gravação de sessão nem de dados "anônimos")', () => {
    expect(secao3).not.toMatch(/gravação de sessão é anônima/i)
    expect(PRIVACIDADE_TEXTO).not.toMatch(/apenas dados anônimos de navegação/)
  })
})
