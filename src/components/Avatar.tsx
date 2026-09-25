// Avatar com iniciais, cor derivada do id (estável entre renders/telas —
// o mesmo aluno sempre cai na mesma cor, o que ajuda a diferenciar
// homônimos em listas e seletores).

const CORES = [
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-cyan-100 text-cyan-700',
  'bg-sky-100 text-sky-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-pink-100 text-pink-700',
]

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export function corAvatar(id: string): string {
  return CORES[hashId(id) % CORES.length]
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function Avatar({ id, nome, size = 10 }: { id: string; nome: string; size?: 8 | 10 | 11 }) {
  const tamanho = size === 8 ? 'size-8 text-xs' : size === 11 ? 'size-11 text-sm' : 'size-10 text-sm'
  return (
    <div className={`flex ${tamanho} shrink-0 items-center justify-center rounded-full font-semibold ${corAvatar(id)}`} aria-hidden="true">
      {iniciais(nome)}
    </div>
  )
}
