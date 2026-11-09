import type { ImageSize } from '~/lib/images'
import { sdxlFallbackUrl } from '~/lib/images'

type SdxlImageProps = {
  prompt: string
  imageSize: ImageSize
  alt: string
  className?: string
  loading?: HTMLImageElement['loading']
}

export function SdxlImage({
  prompt,
  imageSize,
  alt,
  className,
  loading,
}: SdxlImageProps) {
  const fallback = sdxlFallbackUrl(prompt, imageSize)
  return <img src={fallback} alt={alt} className={className} loading={loading} />
}
