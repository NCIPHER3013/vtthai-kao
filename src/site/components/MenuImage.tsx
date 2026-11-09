import { useEffect, useRef, useState } from 'react'
import type { ImageSize } from '~/lib/images'
import { sdxlFallbackUrl } from '~/lib/images'

type MenuImageProps = {
  title: string
  fallbackSize?: ImageSize
  className?: string
  storageImageUrl?: string | null
}

function getFoodPrompt(title: string): string {
  if (title === 'Larb Gai') {
    return 'ultra realistic Thai food photography, Larb Gai, Thai minced chicken larb salad, toasted rice powder, fresh mint leaves, cilantro, sliced shallots, red chili flakes, lime wedges, served in a ceramic bowl, high-end restaurant plating, macro lens, shallow depth of field, warm cinematic lighting, dark charcoal background, high detail, not illustration, not cartoon, not painting, no people, no hands, no text, no watermark, no logo'
  }
  return `ultra realistic Thai food photography, ${title}, premium restaurant plating, warm cinematic lighting, dark charcoal background, high detail, not illustration, not cartoon, not painting, no people, no hands, no text, no watermark`
}

function MenuImgWithFallback({
  srcs,
  alt,
  className,
  loading,
}: {
  srcs: Array<string>
  alt: string
  className?: string
  loading?: HTMLImageElement['loading']
}) {
  const [idx, setIdx] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIdx(0)
  }, [srcs.join(',')])

  const src = srcs[Math.min(idx, srcs.length - 1)]

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const timeoutId = setTimeout(() => {
      if (!img.complete && idx < srcs.length - 1) {
        setIdx((v) => v + 1)
      }
    }, 12000)

    return () => clearTimeout(timeoutId)
  }, [src, idx, srcs.length])

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setIdx((v) => (v < srcs.length - 1 ? v + 1 : v))
      }}
    />
  )
}

export function MenuImage({
  title,
  fallbackSize = 'square_hd',
  className,
  storageImageUrl,
}: MenuImageProps) {
  const prompt = getFoodPrompt(title)
  const fallbackSrc = sdxlFallbackUrl(prompt, fallbackSize)

  const srcs: Array<string> = []
  if (storageImageUrl) srcs.push(storageImageUrl)
  srcs.push(fallbackSrc)

  return (
    <MenuImgWithFallback
      srcs={srcs}
      alt={title}
      className={className}
      loading="lazy"
    />
  )
}
