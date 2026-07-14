# MoneyWastedCallTeams

Quanto custou essa reunião do Teams? Importe o relatório de presença que o organizador baixa
no Teams (aba **Presença** → **Baixar**), mapeie cargo/UF de cada pessoa uma vez, e veja o
custo total da reunião somando o tempo individual de cada participante.

- **Pós-reunião**: importa o CSV do Teams (UTF-16/TSV, cabeçalhos PT ou EN) → mapeia → relatório.
- **Ao vivo**: taxímetro em tempo real — monte a sala, aperte iniciar, marque quem entra e sai.
- **Ao vivo + Teams Web**: com a extensão instalada (pasta `extension/`), o app detecta sozinho
  quem entra e sai da reunião aberta no Teams Web.
- **Salários**: estimativa por cargo (CBO) × UF com referência no mercado formal (Novo CAGED/RAIS,
  aproximado) — sobrescreva por cargo ou por pessoa quando souber o valor real.
- **Cálculo**: custo/hora = salário mensal × fator de encargos (padrão 1,7) ÷ 220h (CLT).

Tudo roda no navegador; mapeamentos e overrides ficam no `localStorage`.

## Rodar

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # suíte Vitest (lib de parsing/cálculo)
```

## Captura ao vivo do Teams Web (extensão)

A mesma pasta `extension/` funciona no **Microsoft Edge** e no **Google Chrome** (é uma
extensão Manifest V3 padrão Chromium — não há versão separada por navegador).

1. Abra `edge://extensions` (Edge) ou `chrome://extensions` (Chrome) e ligue o
   **Modo de desenvolvedor**.
2. **Carregar sem compactação** (Edge) / **Carregar expandida** (Chrome) → escolha a
   pasta `extension/` deste repositório.
3. Deixe `npm run dev` rodando e abra a reunião no **Teams Web** (teams.microsoft.com)
   no mesmo navegador.
4. Abra o painel **Participantes** da reunião (a captura completa depende dele; sem o painel,
   vale o fallback pelos tiles de vídeo). Quando o painel tem seções, **só quem está em
   "Nesta reunião" conta** — "Convidados", "Outros convidados", lobby e qualquer outra seção
   são ignorados.
5. No app, modo **Ao vivo** → **Sincronizar com Teams Web**. Quem entra/sai é detectado sozinho;
   o badge da extensão mostra quantos participantes estão sendo enviados.

Se os nomes não chegarem (o DOM do Teams muda sem aviso), rode `localStorage.mwcDebug = '1'`
no console da aba do Teams e recarregue: o content script loga os candidatos de cada camada
de seletores para recalibrar `extension/content.js`.

Limitações: só Teams **Web** (não o app desktop); cargo/salário continuam vindo do seu
mapeamento salvo — nomes novos aparecem como "pendente" e podem ser mapeados na hora.
A extensão fala com `http://localhost:5173`, então o `npm run dev` precisa estar rodando
na mesma máquina, seja qual for o navegador.

## Dados salariais

A aba **Cargos** do app é o jeito principal de manter a base: criar cargos seus, editar
título/salário/apelidos/valores por UF dos cargos padrão (viram "editado", reversível),
ocultar o que não usa. Tudo fica no `localStorage`.

O seed `src/data/cbo-salarios.json` é gerado por `node scripts/gerar-dataset.mjs` — 48 cargos ×
27 UFs, valores aproximados (referência CAGED). Edite o script para mudar o padrão de fábrica.

## Futuro (Fase 3 — requer admin M365 ou tenant dev)

Integração Microsoft Graph para puxar reuniões e tempos automaticamente
(`OnlineMeetingArtifact.Read.All`) e cargos do Azure AD (`User.Read.All`).
