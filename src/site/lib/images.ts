export type ImageSize =
  | 'square_hd'
  | 'square'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'landscape_16_9'

const SIZE_MAP: Record<ImageSize, { w: number; h: number }> = {
  square_hd: { w: 1024, h: 1024 },
  square: { w: 512, h: 512 },
  portrait_4_3: { w: 768, h: 1024 },
  portrait_16_9: { w: 1024, h: 576 },
  landscape_4_3: { w: 1024, h: 768 },
  landscape_16_9: { w: 1024, h: 576 },
}

function svgDataUri(w: number, h: number, label: string) {
  const text = label.length > 30 ? label.slice(0, 28) + '…' : label
  const fontSize = Math.min(w, h) * 0.06
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a1a1a"/>
        <stop offset="100%" stop-color="#0d0d0d"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central" fill="#555" font-family="system-ui,sans-serif" font-size="${fontSize}">${text}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function sdxlImageUrl(prompt: string, imageSize: ImageSize) {
  const encoded = encodeURIComponent(prompt)
  return `/sdxl-proxy?prompt=${encoded}&image_size=${imageSize}`
}

export function sdxlFallbackUrl(prompt: string, imageSize: ImageSize) {
  const { w, h } = SIZE_MAP[imageSize]
  const label =
    prompt
      .split(',')[0]
      .replace(
        /ultra realistic|Thai food photography|Thai restaurant|premium|restaurant/gi,
        '',
      )
      .trim() || 'Thai Cuisine'
  return svgDataUri(w, h, label)
}
