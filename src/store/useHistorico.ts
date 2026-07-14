import { useEffect, useState } from 'react'
import type { ResumoReuniao } from '../lib/historico'

const CHAVE = 'mwc-historico-v1'

function carregar(): ResumoReuniao[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as ResumoReuniao[]) : []
  } catch {
    return []
  }
}

/** Histórico de reuniões arquivadas, persistido em localStorage. */
export function useHistorico() {
  const [historico, setHistorico] = useState<ResumoReuniao[]>(carregar)

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(historico))
  }, [historico])

  function salvarResumo(resumo: ResumoReuniao) {
    setHistorico((atual) => {
      const semEle = atual.filter((r) => r.id !== resumo.id)
      return [...semEle, resumo].sort((a, b) => b.salvoEm.localeCompare(a.salvoEm))
    })
  }

  function excluirResumo(id: string) {
    setHistorico((atual) => atual.filter((r) => r.id !== id))
  }

  return { historico, salvarResumo, excluirResumo } as const
}
