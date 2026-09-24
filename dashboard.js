// dashboard.js — servidor com dashboard ao vivo em tempo real (SSE)
const http = require('http')

// ─── ESTADO EM RAM ─────────────────────────────────────
let device = null
const sseClients = new Set()

// ─── SERVIDOR ──────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS (não precisa, mas ajuda em testes)
  res.setHeader('Access-Control-Allow-Origin', '*')

  // ─── POST /api/telemetry (recebe da ESP32) ─────────
  if (req.method === 'POST' && req.url === '/api/telemetry') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        device = {
          ...payload,
          last_seen_at: Date.now(),
        }

        console.log('\n📩', new Date().toLocaleTimeString('pt-BR'))
        console.log(`  Nível: ${payload.water_depth_cm.toFixed(2)} cm`)
        console.log(`  Alerta: ${payload.alert.toUpperCase()}`)
        console.log(`  Clientes conectados: ${sseClients.size}`)

        // Notifica todos os dashboards abertos
        broadcast({ type: 'update', device })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400)
        res.end('invalid json')
      }
    })
    return
  }

  // ─── GET /api/stream (SSE — dashboard assina) ──────
  if (req.method === 'GET' && req.url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    // Envia estado atual imediatamente
    res.write(`data: ${JSON.stringify({ type: 'init', device })}\n\n`)

    // Heartbeat a cada 15s
    const ping = setInterval(() => {
      try { res.write(': ping\n\n') } catch {}
    }, 15000)

    const send = (msg) => {
      try { res.write(msg) } catch {}
    }
    sseClients.add(send)

    // Cleanup
    req.on('close', () => {
      clearInterval(ping)
      sseClients.delete(send)
    })
    return
  }

  // ─── GET / (dashboard HTML) ────────────────────────
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(DASHBOARD_HTML)
    return
  }

  // ─── 404 ───────────────────────────────────────────
  res.writeHead(404)
  res.end('not found')
})

// ─── BROADCAST SSE ─────────────────────────────────────
function broadcast(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`
  sseClients.forEach(send => {
    try { send(msg) } catch {}
  })
}

// ─── HTML DO DASHBOARD ─────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Monitor de Alagamento</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0f172a; color: #e2e8f0;
    min-height: 100vh; padding: 2rem;
  }
  .container { max-width: 720px; margin: 0 auto; }
  header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #334155; padding-bottom: 1rem; margin-bottom: 2rem;
  }
  h1 { font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase; }
  .status-badge {
    font-size: 0.75rem; font-weight: bold; letter-spacing: 0.05em;
    padding: 0.35rem 0.75rem; border-radius: 999px;
  }
  .online { background: #14532d; color: #4ade80; }
  .offline { background: #450a0a; color: #f87171; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  .card {
    background: #1e293b; border-radius: 12px; padding: 1.5rem;
    border: 1px solid #334155;
  }
  .card-label {
    font-size: 0.7rem; text-transform: uppercase; color: #94a3b8;
    letter-spacing: 0.1em; margin-bottom: 0.5rem;
  }
  .card-value { font-size: 3rem; font-weight: bold; line-height: 1; }
  .card-unit { font-size: 1.5rem; color: #94a3b8; margin-left: 0.25rem; }
  .card-trend { font-size: 0.85rem; color: #94a3b8; margin-top: 0.75rem; }

  .alert-normal    { background: #052e16; border-color: #166534; color: #4ade80; }
  .alert-attention { background: #422006; border-color: #854d0e; color: #facc15; }
  .alert-alert     { background: #431407; border-color: #9a3412; color: #fb923c; }
  .alert-danger    { background: #450a0a; border-color: #991b1b; color: #f87171; }
  .alert-critical  { background: #450a0a; border-color: #dc2626; color: #fca5a5; }
  .alert-sensor_fault { background: #1e293b; border-color: #475569; color: #cbd5e1; }

  .details {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
    background: #1e293b; border-radius: 12px; padding: 1.25rem;
    border: 1px solid #334155; font-size: 0.9rem;
  }
  .details-row { display: flex; justify-content: space-between; padding: 0.4rem 0; }
  .details-row span:first-child { color: #94a3b8; }

  .empty {
    text-align: center; padding: 4rem 2rem; color: #64748b;
    border: 2px dashed #334155; border-radius: 12px;
  }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>🌊 Monitor de Alagamento</h1>
    <div id="conn-badge" class="status-badge online">● ONLINE</div>
  </header>
  <div id="content">
    <div class="empty pulse">Aguardando primeira leitura da ESP32…</div>
  </div>
</div>

<script>
  const es = new EventSource('/api/stream')

  es.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.device) render(data.device)
    else if (data.type === 'init' && !data.device) {
      // ainda sem dados
    }
  }

  function render(d) {
    const age = (Date.now() - d.last_seen_at) / 1000
    const online = age < 15
    const badge = document.getElementById('conn-badge')
    badge.textContent = online ? '● ONLINE' : '● OFFLINE'
    badge.className = 'status-badge ' + (online ? 'online' : 'offline')

    const trendIcon = {
      stable: '→ ESTÁVEL',
      rising: '↑ SUBINDO',
      rising_fast: '↑↑ SUBINDO RAPIDAMENTE',
      falling: '↓ DESCENDO',
    }[d.trend] || d.trend

    const alertClass = 'alert-' + d.alert
    const alertLabel = d.alert.toUpperCase().replace('_', ' ')

    document.getElementById('content').innerHTML = \`
      <div class="grid">
        <div class="card">
          <div class="card-label">Nível da água</div>
          <div>
            <span class="card-value">\${d.water_depth_cm.toFixed(1)}</span>
            <span class="card-unit">cm</span>
          </div>
          <div class="card-trend">\${trendIcon} (\${d.rise_rate_cm_min >= 0 ? '+' : ''}\${d.rise_rate_cm_min.toFixed(1)} cm/min)</div>
        </div>
        <div class="card \${alertClass}">
          <div class="card-label">Status</div>
          <div class="card-value" style="font-size: 1.8rem;">\${alertLabel}</div>
          <div class="card-trend">\${online ? 'Dispositivo online' : 'Último estado conhecido'}</div>
        </div>
      </div>

      <div class="details">
        <div class="details-row"><span>Distância</span><span>\${d.distance_cm.toFixed(1)} cm</span></div>
        <div class="details-row"><span>Sensor</span><span>\${d.sensor_ok ? 'OK' : 'FALHA'}</span></div>
        <div class="details-row"><span>Wi-Fi</span><span>\${d.wifi_rssi} dBm</span></div>
        <div class="details-row"><span>Firmware</span><span>\${d.firmware_version}</span></div>
        <div class="details-row"><span>Última leitura</span><span>\${age < 60 ? Math.floor(age) + 's atrás' : Math.floor(age/60) + 'min atrás'}</span></div>
        <div class="details-row"><span>Recebido</span><span>\${new Date(d.last_seen_at).toLocaleTimeString('pt-BR')}</span></div>
      </div>
    \`
  }

  // Re-renderiza a cada 2s para atualizar "última leitura"
  setInterval(() => {
    const content = document.getElementById('content')
    if (content.querySelector('.grid')) {
      // força re-render com o último device
      // (simples: refaz conexão SSE não, só recalcula tempo)
    }
  }, 2000)
</script>
</body>
</html>`

server.listen(3000, '0.0.0.0', () => {
  console.log('')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║  🌊  MONITOR DE ALAGAMENTO — Servidor ativo            ║')
  console.log('╠════════════════════════════════════════════════════════╣')
  console.log('║  Dashboard:  http://localhost:3000                    ║')
  console.log('║  API ESP32:  http://192.168.0.5:3000/api/telemetry    ║')
  console.log('║  SSE:        http://192.168.0.5:3000/api/stream        ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('')
})