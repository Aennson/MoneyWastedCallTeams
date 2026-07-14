// MoneyWastedCallTeams — content script do Teams Web.
// Observa o painel de participantes e envia os nomes ao service worker.
// Modo debug: rode `localStorage.mwcDebug = '1'` no console da aba do Teams
// para ver os candidatos de cada camada de seletores.
;(() => {
  const DEBUG = () => {
    try {
      return localStorage.getItem('mwcDebug') === '1'
    } catch {
      return false
    }
  }

  // Palavras de status/UI que aparecem coladas nos nomes no roster
  const RUIDO =
    /\b(muted|mudo|desativado|unmuted|organizer|organizador|apresentador|presenter|convidado|guest|attendee|participante|pinned|fixado|em espera|on hold|raised hand|mão levantada|\(voc[êe]\)|\(you\))\b/gi

  function limparNome(texto) {
    let nome = texto
      .replace(/\(.*?\)/g, ' ') // "(Convidado)", "(Você)" etc.
      .replace(RUIDO, ' ')
      .replace(/[,;|•·].*$/, ' ') // "Ana Silva, Mudo" → "Ana Silva"
      .replace(/\s+/g, ' ')
      .trim()
    return nome
  }

  function pareceNome(texto) {
    return (
      texto.length >= 2 &&
      texto.length <= 80 &&
      /\p{L}/u.test(texto) &&
      !/^\d+$/.test(texto) &&
      !/participantes|participants|pessoas|people|na reuni[ãa]o|in this meeting|convidar|invite/i.test(texto)
    )
  }

  // Camada 1: itens do roster identificados por data-tid
  function camadaDataTid() {
    const nos = document.querySelectorAll(
      '[data-tid*="participant"] [data-tid*="title"], [data-tid*="roster"] span[title], [data-tid*="participant-item"]',
    )
    return Array.from(nos, (n) => n.getAttribute('title') || n.textContent || '')
  }

  // Cabeçalhos de seção do painel: quem está de fato na reunião vs convidados/lobby
  // Ancorados no início: cabeçalhos começam com o nome da seção ("Convidados (5)"),
  // enquanto o rótulo de uma pessoa começa com o nome dela ("Ana Silva, Convidado…").
  const SECAO_PRESENTES = /^\s*(nesta reuni[ãa]o|na reuni[ãa]o|in this meeting|in the meeting)\b/i
  const SECAO_OUTRAS =
    /^\s*(convidados?|invited|aguardando|waiting|lobby|sala de espera|not in the meeting|fora da reuni[ãa]o|outros|others)\b/i
  // Cabeçalho genérico de seção: rótulo curto terminando na contagem, ex. "Qualquer seção (7)"
  const SUFIXO_CONTAGEM = /\(\d+\)\s*$/

  function rotuloCurto(el) {
    const aria = el.getAttribute('aria-label') || ''
    if (aria) return aria
    const texto = (el.textContent || '').trim()
    return texto.length <= 48 ? texto : ''
  }

  // Camada 2: itens de lista/árvore dentro da região do painel de participantes.
  // Allowlist: existindo seções, SÓ os nomes sob "Nesta reunião" contam — qualquer
  // outra seção (conhecida ou não, ex. "Outros convidados") fica de fora.
  // Sem nenhuma seção detectada, vale o painel inteiro (fallback).
  function camadaPainel() {
    const regioes = Array.from(
      document.querySelectorAll('[role="complementary"], [role="dialog"], aside, [aria-label]'),
    ).filter((r) => {
      const rotulo = (r.getAttribute('aria-label') || '') + ' ' + (r.getAttribute('data-tid') || '')
      return /participant|participante|people|pessoas|roster/i.test(rotulo)
    })

    const presentes = []
    const semSecao = []
    for (const regiao of regioes) {
      const itens = new Set(regiao.querySelectorAll('[role="treeitem"], [role="listitem"], li'))
      let secaoAtual = null // null até ver o primeiro cabeçalho
      let viuSecao = false

      const walker = document.createTreeWalker(regiao, NodeFilter.SHOW_ELEMENT)
      for (let el = walker.nextNode(); el; el = walker.nextNode()) {
        const rotulo = rotuloCurto(el)
        if (rotulo) {
          if (SECAO_PRESENTES.test(rotulo)) {
            secaoAtual = 'presente'
            viuSecao = true
            continue
          }
          if (SECAO_OUTRAS.test(rotulo) || SUFIXO_CONTAGEM.test(rotulo)) {
            // qualquer outra seção, inclusive as que não conhecemos pelo nome
            secaoAtual = 'outra'
            viuSecao = true
            continue
          }
        }
        if (itens.has(el)) {
          const alvo = el.querySelector('span[title]') || el
          const nome = alvo.getAttribute('title') || alvo.textContent || ''
          semSecao.push(nome)
          if (secaoAtual === 'presente') presentes.push(nome)
        }
      }
      if (DEBUG() && viuSecao)
        console.log('[mwc] painel com seções — allowlist "nesta reunião":', presentes)
      if (viuSecao) return presentes
    }
    return semSecao
  }

  // Camada 3 (fallback): aria-labels dos tiles de vídeo/avatar da chamada
  function camadaTiles() {
    const nos = document.querySelectorAll(
      '[data-tid*="video-tile"], [data-tid*="audio-tile"], [data-cid="calling-participant-stream"], [aria-label][data-stream-type]',
    )
    return Array.from(nos, (n) => n.getAttribute('aria-label') || '')
  }

  function coletarNomes() {
    // painel primeiro: é a única camada que separa "nesta reunião" de convidados ausentes
    const camadas = [
      ['painel', camadaPainel],
      ['data-tid', camadaDataTid],
      ['tiles', camadaTiles],
    ]
    for (const [rotulo, camada] of camadas) {
      let brutos = []
      try {
        brutos = camada()
      } catch {
        continue
      }
      const nomes = [...new Set(brutos.map(limparNome).filter(pareceNome))]
      if (DEBUG()) console.log(`[mwc] camada ${rotulo}:`, { brutos, nomes })
      if (nomes.length > 0) return nomes
    }
    return []
  }

  function tituloReuniao() {
    // O título da aba costuma ser "(2) Seção | Nome da reunião | Microsoft Teams"
    const doTitulo = document.title
      .replace(/^\(\d+\)\s*/, '') // contador de notificações
      .replace(/^\s*(calendar|calend[áa]rio|chat|teams|activity|atividade)\s*\|\s*/i, '')
      .replace(/\s*\|\s*Microsoft Teams.*$/i, '')
      .trim()
    if (doTitulo && !/^Microsoft Teams$/i.test(doTitulo)) return doTitulo
    return undefined
  }

  let ultimoEnvio = ''
  let ultimoHeartbeat = 0

  function varrer() {
    const nomes = coletarNomes()
    if (nomes.length === 0) return
    const pacote = JSON.stringify({ nomes, titulo: tituloReuniao() })
    const agora = Date.now()
    // envia quando muda, ou a cada 10s como heartbeat
    if (pacote === ultimoEnvio && agora - ultimoHeartbeat < 10_000) return
    ultimoEnvio = pacote
    ultimoHeartbeat = agora
    if (DEBUG()) console.log('[mwc] enviando roster:', nomes)
    try {
      chrome.runtime.sendMessage({ tipo: 'roster', nomes, titulo: tituloReuniao() })
    } catch {
      // extensão recarregada/aba órfã — silencioso
    }
  }

  setInterval(varrer, 3000)

  let agendado = false
  new MutationObserver(() => {
    if (agendado) return
    agendado = true
    setTimeout(() => {
      agendado = false
      varrer()
    }, 500)
  }).observe(document.body, { childList: true, subtree: true })

  if (DEBUG()) console.log('[mwc] content script ativo em', location.href)
})()
