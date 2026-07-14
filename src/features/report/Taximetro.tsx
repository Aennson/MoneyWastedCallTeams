import { useEffect, useRef, useState } from 'react'
import { fmtBRL } from '../../lib/format'

/** O taxímetro: total da reunião em tinta vermelha, contando até o valor final. */
export function Taximetro({
  valor,
  rotulo,
  titulo,
  rodando = false,
}: {
  valor: number
  rotulo: string
  titulo?: string
  rodando?: boolean
}) {
  const [exibido, setExibido] = useState(rodando ? valor : 0)
  const alvoRef = useRef(valor)
  alvoRef.current = valor

  useEffect(() => {
    if (rodando) {
      // modo ao vivo: acompanha o valor diretamente, sem animação de chegada
      setExibido(valor)
      return
    }
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzir) {
      setExibido(valor)
      return
    }
    const inicio = performance.now()
    const duracao = 1200
    let quadro: number
    const passo = (agora: number) => {
      const t = Math.min((agora - inicio) / duracao, 1)
      const suave = 1 - Math.pow(1 - t, 3)
      setExibido(alvoRef.current * suave)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [valor, rodando])

  return (
    <div className={`taximetro${rodando ? ' rodando' : ''}`}>
      <div className="rotulo">{rotulo}</div>
      <div className="valor" aria-live="polite">
        {fmtBRL(exibido)}
      </div>
      {titulo && <div className="titulo-reuniao">{titulo}</div>}
    </div>
  )
}
