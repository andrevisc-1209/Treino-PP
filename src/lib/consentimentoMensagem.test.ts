import { describe, expect, it } from 'vitest'
import { linkWhatsappConsentimento, montarMensagemConsentimento } from './consentimentoMensagem'

describe('consentimentoMensagem', () => {
  const msg = montarMensagemConsentimento({ nomeAluno: 'Ana', nomePersonal: 'Bia', link: 'https://x/c?token=1' })
  it('traz nomes, link e validade, sem dado de saúde', () => {
    expect(msg).toContain('Olá, Ana! Bia quer te pedir autorização')
    expect(msg).toContain('https://x/c?token=1')
    expect(msg).toContain('expira em 7 dias')
    expect(msg).not.toMatch(/lesão|cirurgia|medicamento/i)
  })
  it('abre a conversa do aluno quando o telefone é válido, senão deixa escolher o contato', () => {
    expect(linkWhatsappConsentimento('(21) 98652-1747', 'oi')).toBe('https://wa.me/5521986521747?text=oi')
    expect(linkWhatsappConsentimento(null, 'a b')).toBe('https://wa.me/?text=a%20b')
    expect(linkWhatsappConsentimento('123', 'oi')).toBe('https://wa.me/?text=oi')
  })
})
