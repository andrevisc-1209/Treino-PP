// Teclado virtual no celular: ao focar um campo, garante que ele fique visível (o teclado cobre a metade de
// baixo da tela). O resto — esconder bottom nav/FAB e subir a barra fixa de ação — é CSS (index.css) e a meta
// `interactive-widget=resizes-content` (index.html), que faz o Chrome/Android encolher a página com o teclado.

const CAMPOS = ['INPUT', 'TEXTAREA']

export function ajustarTecladoVirtual() {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return

  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement | null
    if (!el || !CAMPOS.includes(el.tagName)) return
    // espera o teclado terminar de abrir (animação ~250–300 ms) antes de medir
    window.setTimeout(() => {
      if (document.activeElement !== el) return
      const alturaVisivel = window.visualViewport?.height ?? window.innerHeight
      const r = el.getBoundingClientRect()
      const RESERVA_BARRA = 96 // barra fixa de ação / botão de confirmar
      if (r.bottom > alturaVisivel - RESERVA_BARRA || r.top < 56) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }, 300)
  })
}
