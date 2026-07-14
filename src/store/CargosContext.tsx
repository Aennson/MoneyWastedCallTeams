import { createContext, useContext, useMemo, type ReactNode } from 'react'
import seedIndiceBruto from '../data/cbo-index.json'
import seedDatasetBruto from '../data/cbo-salarios.json'
import type { CargoIndexEntry } from '../lib/cargoSearch'
import { mesclarCargos } from '../lib/cargoStore'
import type { CargoDataset } from '../lib/salary'
import type { Config } from './useConfig'

export const seedDataset = seedDatasetBruto as CargoDataset
export const seedIndice = seedIndiceBruto as CargoIndexEntry[]

interface Cargos {
  dataset: CargoDataset
  indice: CargoIndexEntry[]
}

const CargosContext = createContext<Cargos>({ dataset: seedDataset, indice: seedIndice })

/** Disponibiliza o dataset de cargos já mesclado (seed + customizações do usuário). */
export function CargosProvider({ config, children }: { config: Config; children: ReactNode }) {
  const cargos = useMemo(
    () =>
      mesclarCargos({
        seedDataset,
        seedIndice,
        custom: config.cargosCustom,
        ocultos: config.cargosOcultos,
      }),
    [config.cargosCustom, config.cargosOcultos],
  )
  return <CargosContext.Provider value={cargos}>{children}</CargosContext.Provider>
}

export function useCargos(): Cargos {
  return useContext(CargosContext)
}
