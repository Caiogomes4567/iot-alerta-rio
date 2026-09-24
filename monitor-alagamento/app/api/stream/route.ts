import { getDevice, sseClients } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      const send = (msg: string) => {
        try {
          controller.enqueue(enc.encode(msg))
        } catch {}
      }

      send(`data: ${JSON.stringify({ type: 'init', device: getDevice() })}\n\n`)

      const ping = setInterval(() => send(`: ping\n\n`), 15000)
      sseClients.add(send)

      return () => {
        clearInterval(ping)
        sseClients.delete(send)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
