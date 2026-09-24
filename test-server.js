// test-server.js — servidor de teste para receber dados da ESP32
const http = require('http')

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/telemetry') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      console.log('\n📩', new Date().toLocaleTimeString('pt-BR'))
      console.log('  Token:', req.headers.authorization)
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2))
      } catch {
        console.log('  Body (raw):', body)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, server_time: Date.now() }))
    })
  } else {
    res.writeHead(404)
    res.end()
  }
}).listen(3000, '0.0.0.0', () => {
  console.log('✅ Servidor de teste rodando')
  console.log('   Escutando em http://0.0.0.0:3000')
  console.log('   ESP32 deve enviar para http://192.168.0.5:3000/api/telemetry')
  console.log('\nAguardando POST da ESP32...\n')
})