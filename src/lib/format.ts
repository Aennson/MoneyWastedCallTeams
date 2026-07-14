const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function fmtBRL(valor: number): string {
  return brl.format(valor)
}

export function fmtDuracao(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}
