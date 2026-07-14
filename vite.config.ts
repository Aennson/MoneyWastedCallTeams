/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

interface RosterSnapshot {
  nomes: string[]
  titulo?: string
  recebidoEm: number
}

/**
 * Bridge entre a extensão do Teams Web e o app: a extensão faz POST do
 * roster da reunião; o LiveScreen consulta via GET. Snapshot em memória —
 * só existe enquanto o dev server roda.
 */
function rosterBridge(): Plugin {
  let snapshot: RosterSnapshot | null = null

  return {
    name: 'mwc-roster-bridge',
    configureServer(server) {
      server.middlewares.use('/api/roster', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'POST') {
          let corpo = ''
          req.on('data', (parte) => {
            corpo += parte
          })
          req.on('end', () => {
            try {
              const dados = JSON.parse(corpo) as { nomes?: unknown; titulo?: unknown }
              const nomes = Array.isArray(dados.nomes)
                ? dados.nomes.filter((n): n is string => typeof n === 'string')
                : null
              if (!nomes) {
                res.statusCode = 400
                res.end(JSON.stringify({ erro: 'esperado JSON com "nomes": string[]' }))
                return
              }
              snapshot = {
                nomes,
                titulo: typeof dados.titulo === 'string' ? dados.titulo : undefined,
                recebidoEm: Date.now(),
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true, recebidos: nomes.length }))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ erro: 'JSON inválido' }))
            }
          })
          return
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(snapshot))
          return
        }

        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  // A extensão envia o roster para http://localhost:5173 (fixo no manifest e no
  // background.js). strictPort impede o Vite de pular silenciosamente para 5174+
  // e criar um app que nunca recebe os dados.
  server: { port: 5173, strictPort: true },
  plugins: [react(), rosterBridge()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
