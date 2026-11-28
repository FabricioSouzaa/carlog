import { useEffect, useState } from 'react'
import { getImage } from '../storage/images'

/** Mostra uma foto guardada no IndexedDB pelo id. Use `key={id}` ao trocar de foto no mesmo lugar. */
export function StoredImage({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    getImage(id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) return setFailed(true)
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  if (url) return <img src={url} alt={alt} className={className} />
  return (
    <div className={`flex items-center justify-center bg-track text-xs text-ink-soft ${className ?? ''}`}>
      {failed ? 'Sem foto' : '…'}
    </div>
  )
}
