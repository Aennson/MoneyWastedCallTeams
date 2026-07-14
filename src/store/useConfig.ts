import { useEffect, useState } from 'react'
import type { CargoCustom } from '../lib/cargoStore'
import { FATOR_ENCARGOS_PADRAO } from '../lib/cost'
import type { MapeamentoPessoa } from '../lib/relatorio'

export interface Config {
  fatorEncargos: number
  mapeamentos: Record<string, MapeamentoPessoa>
  overridesPessoa: Record<string, number>
  overridesCargo: Record<string, number>
  /** Cargos criados ou editados pelo usuário (sombreiam o dataset seed). */
  cargosCustom: Record<string, CargoCustom>
  /** Códigos de cargos do seed que o usuário ocultou. */
  cargosOcultos: string[]
}

const CHAVE = 'mwc-config-v1'

const padrao: Config = {
  fatorEncargos: FATOR_ENCARGOS_PADRAO,
  mapeamentos: {},
  overridesPessoa: {},
  overridesCargo: {},
  cargosCustom: {},
  cargosOcultos: [],
}

function carregar(): Config {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return padrao
    return { ...padrao, ...(JSON.parse(bruto) as Partial<Config>) }
  } catch {
    return padrao
  }
}

/** Configuração persistente do app (mapeamentos, overrides, fator de encargos) em localStorage. */
export function useConfig() {
  const [config, setConfig] = useState<Config>(carregar)

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(config))
  }, [config])

  return { config, setConfig } as const
}
