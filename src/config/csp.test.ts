import { describe, expect, it } from 'vitest'
import { montarCsp } from './csp'

const diretiva = (csp: string, nome: string) => csp.split('; ').find((d) => d.startsWith(`${nome} `)) ?? ''

describe('montarCsp', () => {
  const csp = montarCsp('https://abcd1234.supabase.co')
  it('scripts sem unsafe-inline nem unsafe-eval', () => {
    const s = diretiva(csp, 'script-src')
    expect(s).not.toContain("'unsafe-inline'")
    expect(s).not.toContain("'unsafe-eval'")
    expect(s).toContain('https://challenges.cloudflare.com')
  })
  it('connect-src fixa o host exato do Supabase (sem curinga)', () => {
    const c = diretiva(csp, 'connect-src')
    expect(c).toContain('https://abcd1234.supabase.co')
    expect(c).toContain('wss://abcd1234.supabase.co')
    expect(c).not.toContain('*.supabase.co')
  })
  it('sem a URL (ou inválida) cai no curinga do Supabase', () => {
    expect(diretiva(montarCsp(), 'connect-src')).toContain('https://*.supabase.co')
    expect(diretiva(montarCsp('lixo'), 'connect-src')).toContain('https://*.supabase.co')
  })
  it('img-src sem https: genérico; objetos e base restritos', () => {
    expect(diretiva(csp, 'img-src').split(' ')).not.toContain('https:')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
  })
})
