// src/app/api/local-url/route.ts
import { NextResponse } from 'next/server'
import { networkInterfaces } from 'os'

export function GET(req: Request) {
  const reqUrl = new URL(req.url)
  const port = reqUrl.port || '3000'
  const proto = reqUrl.protocol
  const nets = networkInterfaces()
  let localIp: string | null = null
  for (const iface of Object.values(nets)) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) { localIp = net.address; break }
    }
    if (localIp) break
  }
  return NextResponse.json({ networkUrl: localIp ? `${proto}//${localIp}:${port}` : null })
}
