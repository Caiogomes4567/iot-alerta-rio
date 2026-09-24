'use client'

import { useEffect, useState } from 'react'
import type { DeviceState } from '@/lib/types'

export function useDeviceStream() {
  const [device, setDevice] = useState<DeviceState | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/stream')
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.device) setDevice(data.device)
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [])

  return { device, connected }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
