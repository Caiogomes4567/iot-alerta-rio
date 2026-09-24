import type { DeviceState } from './types'

const g = globalThis as unknown as {
  __device?: DeviceState | null
  __sseClients?: Set<(msg: string) => void>
}

export function getDevice(): DeviceState | null {
  return g.__device ?? null
}

export function setDevice(state: DeviceState) {
  g.__device = state
  broadcast({ type: 'update', device: state })
}

export const sseClients = (g.__sseClients ??= new Set())

export function broadcast(payload: unknown) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`
  sseClients.forEach((send) => {
    try {
      send(msg)
    } catch {}
  })
}
