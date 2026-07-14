// MoneyWastedCallTeams — service worker: repassa o roster para o app local.
const APP = 'http://localhost:5173/api/roster'

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.tipo !== 'roster' || !Array.isArray(msg.nomes)) return
  fetch(APP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomes: msg.nomes, titulo: msg.titulo }),
  })
    .then(() => {
      chrome.action.setBadgeText({ text: String(msg.nomes.length) })
      chrome.action.setBadgeBackgroundColor({ color: '#b3261e' })
    })
    .catch(() => {
      // app não está rodando — não faz nada
      chrome.action.setBadgeText({ text: '' })
    })
})
