import * as React from 'react'

interface DragCaptchaProps {
  onSuccess: () => void
  onReset?: () => void
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const THUMB_WIDTH = 44
const TARGET_SIZE = 24
const THRESHOLD = 10

function DragCaptcha({ onSuccess }: DragCaptchaProps) {
  const [targetPercent, setTargetPercent] = React.useState(() =>
    randomBetween(55, 78),
  )
  const [thumbLeftPx, setThumbLeftPx] = React.useState(0)
  const [status, setStatus] = React.useState<
    'idle' | 'dragging' | 'success' | 'fail'
  >('idle')
  const [failShake, setFailShake] = React.useState(false)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const startXRef = React.useRef<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status === 'success') return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    setStatus('dragging')
    setFailShake(false)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null || status === 'success') return
    const track = trackRef.current
    if (!track) return
    const usableWidth = track.offsetWidth - THUMB_WIDTH
    if (usableWidth <= 0) return
    const deltaX = e.clientX - startXRef.current
    const px = Math.min(Math.max(deltaX, 0), usableWidth)
    setThumbLeftPx(px)
  }

  const handlePointerUp = () => {
    if (startXRef.current === null) return
    startXRef.current = null

    const track = trackRef.current
    if (!track) return
    const usableWidth = track.offsetWidth - THUMB_WIDTH
    if (usableWidth <= 0) return
    const currentPercent = (thumbLeftPx / usableWidth) * 100

    if (Math.abs(currentPercent - targetPercent) <= THRESHOLD) {
      setStatus('success')
      const snapPx = (targetPercent / 100) * usableWidth
      setThumbLeftPx(snapPx)
      setTimeout(() => onSuccess(), 400)
    } else {
      setStatus('fail')
      setFailShake(true)
      setTimeout(() => {
        setThumbLeftPx(0)
        setStatus('idle')
        setFailShake(false)
        setTargetPercent(randomBetween(55, 78))
      }, 800)
    }
  }

  const handleReset = () => {
    setThumbLeftPx(0)
    setStatus('idle')
    setFailShake(false)
    setTargetPercent(randomBetween(55, 78))
  }

  const labelColor =
    status === 'success'
      ? 'text-[color:var(--vt-leaf)]'
      : status === 'fail'
        ? 'text-[color:var(--vt-chili)]'
        : 'text-[color:var(--vt-muted)]'
  const labelText =
    status === 'success'
      ? 'Verified!'
      : status === 'fail'
        ? 'Incorrect, try again'
        : 'Drag the key into the keyhole'
  const trackBg =
    status === 'success'
      ? 'bg-[color:rgba(34,197,94,0.08)]'
      : status === 'fail'
        ? 'bg-[color:rgba(239,68,68,0.08)]'
        : 'bg-[color:rgba(255,255,255,0.04)]'
  const trackBorder =
    status === 'success'
      ? 'border-[color:rgba(34,197,94,0.3)]'
      : status === 'fail'
        ? 'border-[color:rgba(239,68,68,0.3)]'
        : 'border-[color:var(--vt-border)]'

  return (
    <div className="w-full select-none touch-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <span
          className={`text-xs ${labelColor} transition-colors duration-300`}
        >
          {labelText}
        </span>
        {status === 'fail' && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-[color:var(--vt-muted)] hover:text-[color:var(--vt-text)]"
          >
            Try Again
          </button>
        )}
      </div>

      <div
        className={`relative rounded-xl border ${trackBorder} ${trackBg} h-12 transition-colors duration-300 overflow-hidden`}
      >
        <TargetSlot targetPercent={targetPercent} />

        {status === 'success' && (
          <div
            className="absolute top-0 left-0 h-full rounded-xl bg-[color:rgba(34,197,94,0.12)] transition-all duration-500"
            style={{ width: `${thumbLeftPx + THUMB_WIDTH}px` }}
          />
        )}
        {status === 'fail' && (
          <div
            className="absolute top-0 left-0 h-full rounded-xl bg-[color:rgba(239,68,68,0.08)] transition-all duration-300"
            style={{ width: `${thumbLeftPx + THUMB_WIDTH}px` }}
          />
        )}

        <div ref={trackRef} className="absolute inset-0">
          <div
            className={`absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-xl cursor-grab active:cursor-grabbing transition-shadow duration-150 ${
              status === 'success'
                ? 'bg-[color:rgba(34,197,94,0.2)] shadow-lg shadow-[color:rgba(34,197,94,0.15)]'
                : status === 'dragging'
                  ? 'bg-[color:rgba(255,255,255,0.1)] shadow-lg shadow-[color:rgba(255,255,255,0.08)]'
                  : 'bg-[color:rgba(255,255,255,0.06)] hover:bg-[color:rgba(255,255,255,0.08)]'
            } ${failShake ? 'animate-shake' : ''}`}
            style={{
              left: `${thumbLeftPx}px`,
              width: `${THUMB_WIDTH}px`,
              height: `${THUMB_WIDTH}px`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                status === 'success'
                  ? 'text-[color:var(--vt-leaf)]'
                  : 'text-[color:var(--vt-ivory)]'
              }
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function TargetSlot({ targetPercent }: { targetPercent: number }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [leftPx, setLeftPx] = React.useState(0)

  React.useLayoutEffect(() => {
    const container = containerRef.current?.parentElement
    if (!container) return
    const trackWidth = container.offsetWidth
    const usableWidth = trackWidth - THUMB_WIDTH
    if (usableWidth <= 0) return
    const thumbLeftPx = (targetPercent / 100) * usableWidth
    const thumbCenterPx = thumbLeftPx + THUMB_WIDTH / 2
    const slotLeftPx = thumbCenterPx - TARGET_SIZE / 2
    setLeftPx(slotLeftPx)
  }, [targetPercent])

  return (
    <div
      ref={containerRef}
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: `${leftPx}px` }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[color:var(--vt-muted)] opacity-30"
      >
        <circle cx="12" cy="16" r="6" />
        <circle cx="12" cy="16" r="2" />
        <line x1="12" y1="10" x2="12" y2="14" />
      </svg>
    </div>
  )
}

export default DragCaptcha
