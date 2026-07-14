// Gera src/data/cbo-salarios.json e src/data/cbo-index.json.
//
// Valores base: salário médio mensal nacional APROXIMADO do setor formal
// (referência: agregados públicos do Novo CAGED/RAIS, arredondados).
// O índice por UF aplica a variação regional média do mercado formal.
// São estimativas de partida — o app permite override manual por cargo/pessoa.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Índice regional: fator sobre a média nacional (mercado formal, aproximado)
const indiceUF = {
  DF: 1.25, SP: 1.2, RJ: 1.1, RS: 1.05, PR: 1.05, SC: 1.05,
  MG: 0.95, ES: 0.95, GO: 0.9, MT: 1.0, MS: 0.95,
  BA: 0.85, PE: 0.85, CE: 0.8, AM: 0.95, PA: 0.85,
  RN: 0.8, PB: 0.78, SE: 0.8, AL: 0.78, PI: 0.75, MA: 0.75,
  TO: 0.85, RO: 0.9, AC: 0.85, AP: 0.85, RR: 0.9,
}

// [código, título, média nacional aproximada (R$/mês), aliases para busca]
// Códigos numéricos = CBO oficial; códigos "TI-*" = cargos de mercado sem CBO próprio.
const cargos = [
  // ---- TI: desenvolvimento e dados (CBO oficial)
  ['317110', 'Programador de sistemas de informação', 5500, ['desenvolvedor', 'dev', 'programador', 'developer', 'software engineer', 'engenheiro de software']],
  ['317105', 'Programador de internet', 5000, ['desenvolvedor web', 'front-end', 'frontend', 'back-end', 'backend', 'fullstack', 'full stack']],
  ['212405', 'Analista de desenvolvimento de sistemas', 7800, ['analista de sistemas', 'analista desenvolvedor', 'system analyst', 'qa', 'analista de testes', 'tester', 'quality assurance']],
  ['211110', 'Especialista em pesquisa operacional', 9000, ['cientista de dados', 'data scientist', 'analista de dados', 'data analyst']],
  ['262410', 'Desenhista industrial (designer)', 5000, ['designer', 'ux', 'ui', 'product designer', 'ux/ui']],
  // ---- TI: infraestrutura, redes e segurança (CBO oficial)
  ['212410', 'Analista de redes e comunicação de dados', 7000, ['analista de redes', 'network analyst']],
  ['212415', 'Analista de sistemas de automação', 7500, ['automação', 'rpa']],
  ['212420', 'Analista de suporte computacional', 5500, ['suporte', 'help desk', 'service desk', 'analista de suporte', 'n1', 'n2', 'técnico de suporte', 'field service']],
  ['212305', 'Administrador de banco de dados', 8500, ['dba', 'banco de dados', 'database administrator']],
  ['212310', 'Administrador de redes', 7500, ['administrador de rede', 'infraestrutura', 'network admin']],
  ['212315', 'Administrador de sistemas operacionais', 7800, ['sysadmin', 'administrador de sistemas']],
  ['212320', 'Administrador em segurança da informação', 9000, ['segurança da informação', 'security', 'cybersecurity', 'infosec', 'analista de segurança']],
  // ---- TI: cargos de mercado (sem CBO próprio)
  ['TI-ARQ', 'Arquiteto de software', 15000, ['arquiteto de soluções', 'solution architect', 'arquiteto']],
  ['TI-TL', 'Tech Lead', 14000, ['líder técnico', 'tech leader']],
  ['TI-DEVOPS', 'Engenheiro DevOps', 11000, ['devops']],
  ['TI-SRE', 'Engenheiro de confiabilidade (SRE)', 12000, ['sre', 'site reliability']],
  ['TI-CLOUD', 'Engenheiro de cloud', 11500, ['cloud', 'aws', 'azure', 'gcp']],
  ['TI-DATA', 'Engenheiro de dados', 11000, ['data engineer', 'engenheiro de dados']],
  ['TI-SM', 'Scrum Master', 11000, ['agilista', 'agile master']],
  ['TI-PO', 'Product Owner', 12000, ['po', 'dono do produto']],
  ['TI-PM', 'Product Manager', 14000, ['gerente de produto', 'product']],
  // ---- Gestão de TI (CBO oficial)
  ['142505', 'Gerente de desenvolvimento de sistemas', 13000, ['gerente de desenvolvimento', 'engineering manager', 'gerente de engenharia']],
  ['142510', 'Gerente de produção da tecnologia da informação', 12000, ['gerente de infraestrutura', 'gerente de operações de ti']],
  ['142515', 'Gerente de projetos de tecnologia da informação', 12000, ['gerente de projetos', 'project manager', 'pm', 'gpm']],
  ['142520', 'Gerente de segurança da informação', 13000, ['gerente de segurança']],
  ['142525', 'Tecnólogo em gestão da tecnologia da informação', 8000, ['gestor de ti', 'coordenador de ti', 'it manager']],
  // ---- Service Delivery
  ['TI-SDM', 'Gerente de service delivery', 13000, ['service delivery manager', 'sdm', 'gerente de entrega de serviços']],
  ['TI-SDC', 'Coordenador de service delivery', 10000, ['coordenador de entrega', 'delivery coordinator']],
  ['TI-SDA', 'Analista de service delivery', 7000, ['service delivery analyst', 'itsm', 'itil', 'analista de entrega']],
  // ---- Executivos
  ['121010', 'Diretor geral (CEO)', 25000, ['ceo', 'presidente', 'diretor executivo', 'chief executive officer']],
  ['123205', 'Diretor financeiro (CFO)', 20000, ['cfo', 'diretor de finanças', 'chief financial officer']],
  ['123105', 'Diretor administrativo', 18000, ['diretor adm', 'director']],
  ['TI-CTO', 'Diretor de tecnologia (CTO)', 22000, ['cto', 'chief technology officer']],
  ['TI-CIO', 'Diretor de TI (CIO)', 20000, ['cio', 'chief information officer']],
  ['TI-COO', 'Diretor de operações (COO)', 20000, ['coo', 'chief operating officer', 'diretor de operações']],
]

const dataset = {}
const index = []
for (const [cbo, titulo, media, aliases] of cargos) {
  const porUF = {}
  for (const [uf, fator] of Object.entries(indiceUF)) {
    porUF[uf] = Math.round(media * fator)
  }
  dataset[cbo] = { titulo, mediaNacional: media, porUF }
  index.push({ cbo, titulo, aliases })
}

const dataDir = join(raiz, 'src', 'data')
mkdirSync(dataDir, { recursive: true })
writeFileSync(join(dataDir, 'cbo-salarios.json'), JSON.stringify(dataset, null, 2) + '\n')
writeFileSync(join(dataDir, 'cbo-index.json'), JSON.stringify(index, null, 2) + '\n')
console.log(`Gerados ${cargos.length} cargos × ${Object.keys(indiceUF).length} UFs.`)
