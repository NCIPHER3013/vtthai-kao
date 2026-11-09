import * as React from 'react'

type SoundType = 'order' | 'reservation' | 'message'

const SOUND_CONFIGS: Record<
  SoundType,
  { notes: Array<number>; oscType: OscillatorType }
> = {
  order: {
    notes: [523.25, 659.25, 783.99, 1046.5],
    oscType: 'sine',
  },
  reservation: {
    notes: [440, 554.37, 659.25],
    oscType: 'triangle',
  },
  message: {
    notes: [587.33, 698.46, 880],
    oscType: 'sine',
  },
}

export function useNotificationSound(type: SoundType) {
  const audioCtxRef = React.useRef<AudioContext | null>(null)

  const play = React.useCallback(() => {
    try {
      console.log('[🔔 notification-sound] play() called, type:', type)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      console.log('[🔔 notification-sound] AudioContext state:', ctx.state)

      const startPlaying = () => {
        if (ctx.state !== 'running') return

        const config = SOUND_CONFIGS[type]
        const now = ctx.currentTime

        config.notes.forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = config.oscType
          osc.frequency.setValueAtTime(freq, now + i * 0.15)
          gain.gain.setValueAtTime(0.3, now + i * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(now + i * 0.15)
          osc.stop(now + i * 0.15 + 0.5)
        })
      }

      if (ctx.state === 'suspended') {
        console.log('[🔔 notification-sound] resuming AudioContext...')
        ctx.resume().then(() => {
          console.log(
            '[🔔 notification-sound] AudioContext resumed, state:',
            ctx.state,
          )
          startPlaying()
        })
      } else if (ctx.state === 'running') {
        startPlaying()
      }
    } catch (err) {
      console.error('[🔔 notification-sound] ERROR:', err)
    }
  }, [type])

  return play
}

export function useNewItemCountEffect<T extends { _id: string }>(
  data: Array<T> | undefined,
  playSound: () => void,
  label?: string,
  onNewItems?: (items: Array<T>) => void,
) {
  const prevIdsRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (data) {
      const currentIds = new Set(data.map((item) => item._id))
      const prevIds = prevIdsRef.current
      const newIds = data.filter((item) => !prevIds.has(item._id))
      const removedIds = [...prevIds].filter((id) => !currentIds.has(id))
      console.log(`[🔔 ${label ?? 'watcher'}] effect fired:`, {
        currentCount: data.length,
        prevCount: prevIds.size,
        newCount: newIds.length,
        removedCount: removedIds.length,
        newIds: newIds.map((i: any) => i._id),
      })
      if (prevIds.size > 0 && newIds.length > 0) {
        console.log(`[🔔 ${label ?? 'watcher'}] 🎵 PLAYING SOUND!`)
        playSound()
        if (onNewItems) onNewItems(newIds)
      }
      prevIdsRef.current = currentIds
    }
  }, [data, playSound, label, onNewItems])
}

export type { SoundType }
