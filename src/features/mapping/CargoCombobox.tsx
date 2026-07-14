import { useMemo, useState } from 'react'
import { buscarCargos, type CargoIndexEntry } from '../../lib/cargoSearch'
import { fmtBRL } from '../../lib/format'
import { useCargos } from '../../store/CargosContext'

export function CargoCombobox({
  cbo,
  onChange,
  placeholder = 'Buscar cargo…',
}: {
  cbo?: string
  onChange: (cbo: string | undefined) => void
  placeholder?: string
}) {
  const { dataset: cargos, indice } = useCargos()
  const [texto, setTexto] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)

  const tituloAtual = cbo !== undefined ? (cargos[cbo]?.titulo ?? cbo) : ''
  const consulta = texto ?? tituloAtual
  const resultados = useMemo(
    () => (texto !== null ? buscarCargos(texto, indice).slice(0, 8) : []),
    [texto],
  )

  function selecionar(entrada: CargoIndexEntry) {
    onChange(entrada.cbo)
    setTexto(null)
    setAberto(false)
  }

  return (
    <div className="combo">
      <input
        type="text"
        value={consulta}
        placeholder={placeholder}
        aria-label="Cargo"
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
          if (e.target.value.trim() === '') onChange(undefined)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          // dá tempo do clique na lista disparar antes de fechar
          setTimeout(() => {
            setAberto(false)
            setTexto(null)
          }, 150)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && resultados.length > 0) {
            e.preventDefault()
            selecionar(resultados[0])
          }
          if (e.key === 'Escape') {
            setAberto(false)
            setTexto(null)
          }
        }}
      />
      {aberto && resultados.length > 0 && (
        <ul className="combo-lista" role="listbox">
          {resultados.map((r, i) => (
            <li
              key={r.cbo}
              role="option"
              aria-selected={r.cbo === cbo}
              className={i === 0 ? 'destacado' : undefined}
              onMouseDown={(e) => {
                e.preventDefault()
                selecionar(r)
              }}
            >
              <span>{r.titulo}</span>
              <span className="media">{fmtBRL(cargos[r.cbo].mediaNacional)}/mês</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
