// src/components/GameQRCode.tsx
'use client'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface GameQRCodeProps {
  joinCode: string
  size?: number
}

export function GameQRCode({ joinCode, size = 180 }: GameQRCodeProps) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    async function fetchUrl() {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isLocal) {
        try {
          const res = await fetch('/api/local-url')
          const { networkUrl } = await res.json()
          const base = networkUrl ?? window.location.origin
          setUrl(`${base}/room/${joinCode}`)
          return
        } catch {
          // fall through to origin
        }
      }
      setUrl(`${window.location.origin}/room/${joinCode}`)
    }
    fetchUrl()
  }, [joinCode])

  if (!url) return <div className="w-44 h-44 bg-gray-100 animate-pulse rounded" />

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-white p-3 rounded-xl shadow">
        <QRCodeSVG value={url} size={size} />
      </div>
      <p className="text-2xl font-mono font-bold tracking-widest">{joinCode}</p>
      <p className="text-xs text-gray-500 break-all text-center">{url}</p>
    </div>
  )
}
