import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Carousel } from '../components/Carousel'
import { clampIndex } from '../lib/carousel'
import { sameNames } from '../lib/gallery'
import { newId } from '../lib/id'
import { compressImage } from '../lib/image'
import { addGalleryPhoto, deleteGalleryPhoto, listGallery, MAX_GALLERY_PHOTOS, type GalleryPhoto } from '../storage/gallery'

const URL_REFRESH_MS = 45 * 60 * 1000 // os endereços das fotos valem 1 hora
const ERROR_REFRESH_GAP_MS = 5 * 60 * 1000 // intervalo mínimo entre tentativas disparadas por imagem quebrada

export function Galeria({ onBack }: { onBack: () => void }) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [current, setCurrent] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Regra que evita corridas: só a resposta MAIS RECENTE vale. Cada carga visível e cada alteração
  // (enviar, remover) incrementa `gen`; uma resposta que chega com geração antiga é descartada.
  const gen = useRef(0)
  const mounted = useRef(true)
  const photosRef = useRef<GalleryPhoto[] | null>(null)
  const currentRef = useRef(0)
  const loadedAt = useRef(0)
  const lastAttempt = useRef(0)
  const refreshing = useRef(false)
  const refreshId = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  const showIndex = useCallback((i: number) => {
    currentRef.current = i
    setCurrent(i)
  }, [])

  /** Carga que a pessoa vê: troca a lista e abre na foto `focus`. Devolve false só se realmente falhou. */
  const loadVisible = useCallback(
    async (focus: number): Promise<boolean> => {
      const mine = ++gen.current
      try {
        const list = await listGallery()
        if (!mounted.current || mine !== gen.current) return true // substituída por algo mais novo
        loadedAt.current = lastAttempt.current = Date.now()
        const i = clampIndex(focus, list.length)
        setPhotos(list)
        setStartAt(i)
        showIndex(i)
        setLoadFailed(false)
        return true
      } catch {
        if (!mounted.current || mine !== gen.current) return true
        setLoadFailed(true)
        setPhotos((prev) => prev ?? [])
        return false
      }
    },
    [showIndex],
  )

  /**
   * Renova os endereços temporários em segundo plano, sem mexer na posição nem criar rajadas de pedidos.
   * `force` substitui uma renovação já em andamento (usado depois de remover, quando a anterior foi invalidada).
   */
  const refreshSilently = useCallback(
    async (minGapMs: number, force = false) => {
      if ((refreshing.current && !force) || Date.now() - lastAttempt.current < minGapMs) return
      const id = ++refreshId.current
      refreshing.current = true
      lastAttempt.current = Date.now()
      const mine = gen.current // não incrementa: uma carga visível ou alteração mais nova invalida esta
      try {
        const list = await listGallery()
        if (!mounted.current) return
        if (mine !== gen.current) {
          lastAttempt.current = 0 // resposta descartada não conta como tentativa: outra renovação pode acontecer
          return
        }
        loadedAt.current = Date.now()
        const same = sameNames(photosRef.current, list)
        setPhotos(list)
        setLoadFailed(false) // a lista veio do servidor, então o estado "não carregou" acabou
        if (!same) {
          // a lista mudou por outro lado: mantém a foto que está à vista, se ainda existir
          const i = clampIndex(currentRef.current, list.length)
          setStartAt(i)
          showIndex(i)
        }
      } catch {
        // segue com a lista atual; tenta de novo no próximo gatilho
      } finally {
        if (id === refreshId.current) refreshing.current = false
      }
    },
    [showIndex],
  )

  useEffect(() => {
    const mine = ++gen.current
    listGallery()
      .then((list) => {
        if (!mounted.current || mine !== gen.current) return
        loadedAt.current = lastAttempt.current = Date.now()
        setPhotos(list)
      })
      .catch(() => {
        if (!mounted.current || mine !== gen.current) return
        setLoadFailed(true)
        setPhotos([])
      })
  }, [])

  // voltar de outra aba/app depois de muito tempo: renova os endereços antes de eles vencerem
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loadedAt.current && Date.now() - loadedAt.current > URL_REFRESH_MS) {
        void refreshSilently(0)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshSilently])

  const handleImageError = useCallback(() => void refreshSilently(ERROR_REFRESH_GAP_MS), [refreshSilently])

  async function retry() {
    setRetrying(true)
    setError('')
    if (!(await loadVisible(0))) setError('Ainda não foi possível carregar as fotos. Verifique a conexão.')
    setRetrying(false)
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    const base = photosRef.current
    if (files.length === 0 || !base || loadFailed || busy) return
    const room = MAX_GALLERY_PHOTOS - base.length
    if (room <= 0) return setError(`A galeria já tem o máximo de ${MAX_GALLERY_PHOTOS} fotos.`)
    setBusy(true)
    setError('')
    const notes: string[] = []
    if (files.length > room) notes.push(`Só ${room === 1 ? 'coube 1' : `couberam ${room}`}: o limite é de ${MAX_GALLERY_PHOTOS} fotos.`)
    const attempted = Math.min(files.length, room)
    let failed = 0
    for (const file of files.slice(0, room)) {
      try {
        await addGalleryPhoto(newId(), await compressImage(file))
      } catch {
        failed++
      }
    }
    if (failed > 0) notes.push(`${failed} ${failed === 1 ? 'foto não pôde ser enviada' : 'fotos não puderam ser enviadas'}.`)
    // se a lista não atualizar, a tela passa a mostrar "tentar de novo" em vez de uma lista velha
    if (!(await loadVisible(base.length))) {
      notes.push(attempted > failed ? 'As fotos foram enviadas, mas não foi possível atualizar a lista.' : 'Não foi possível atualizar a lista.')
    }
    if (mounted.current) {
      setError(notes.join(' '))
      setBusy(false)
    }
  }

  async function removeCurrent() {
    const list = photosRef.current
    const photo = list?.[currentRef.current]
    if (!list || !photo || busy || !window.confirm('Remover esta foto da galeria? Essa ação não pode ser desfeita.')) return
    setBusy(true)
    setError('')
    try {
      await deleteGalleryPhoto(photo.name)
    } catch {
      setError('Não foi possível remover a foto. Tente novamente.')
      setBusy(false)
      return
    }
    // a remoção invalida qualquer carga que ainda esteja a caminho (ela traria a foto de volta)
    gen.current++
    const latest = (photosRef.current ?? list).filter((p) => p.name !== photo.name)
    const next = clampIndex(list.findIndex((p) => p.name === photo.name), latest.length)
    setPhotos(latest)
    setStartAt(next)
    showIndex(next)
    setBusy(false)
    void refreshSilently(0, true)
  }

  const ready = photos !== null && !loadFailed

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Meu carro</h1>
        <button type="button" className="btn-ghost" onClick={onBack}>← Voltar</button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 night:bg-red-950 night:text-red-200">{error}</p>}

      {photos === null ? (
        <p className="py-10 text-center muted">Carregando fotos…</p>
      ) : loadFailed ? (
        <div className="card py-10 text-center">
          <p className="mb-3 font-medium">Não foi possível carregar as fotos.</p>
          <button type="button" className="btn-primary" onClick={() => void retry()} disabled={retrying}>
            {retrying ? 'Carregando…' : 'Tentar de novo'}
          </button>
        </div>
      ) : photos.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="mb-1 font-medium">Nenhuma foto ainda</p>
          <p className="muted">Adicione fotos do seu carro e dos momentos com ele. Elas ficam privadas, só você vê depois do login.</p>
        </div>
      ) : (
        <>
          {/* remonta quando a lista muda, para abrir na foto certa */}
          <Carousel key={photos.map((p) => p.name).join('|')} photos={photos} initialIndex={startAt} onIndexChange={showIndex} onImageError={handleImageError} />
          <p className="muted text-center" aria-live="polite">Foto {current + 1} de {photos.length}</p>
        </>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy || !ready}>
          {busy ? 'Enviando…' : '📷 Adicionar fotos'}
        </button>
        {ready && photos.length > 0 && (
          <button type="button" className="btn-danger" onClick={() => void removeCurrent()} disabled={busy}>Remover esta foto</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
    </div>
  )
}
