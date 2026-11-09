const CART_STORAGE_KEY = 'vtthai-cart'

let prevCount = 0

function showToast(message: string): void {
  if (typeof document === 'undefined') return

  let container = document.getElementById('vtthai-toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'vtthai-toast-container'
    container.style.cssText =
      'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:0.5rem;align-items:center;pointer-events:none;'
    const style = document.createElement('style')
    style.textContent =
      '@keyframes vtthai-toast-in{from{opacity:0;transform:translateY(12px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}'
    document.head.appendChild(style)
    document.body.appendChild(container)
  }

  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText =
    'pointer-events:auto;border-radius:0.75rem;background:var(--vt-ivory, #fff6e9);padding:0.625rem 1.25rem;font-size:0.875rem;font-weight:500;color:#000;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:vtthai-toast-in 0.25s ease-out;white-space:nowrap;'
  container.appendChild(el)

  setTimeout(() => {
    el.remove()
  }, 2000)
}

function poll(): void {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return
    const cart = JSON.parse(raw)
    const count: number =
      cart.items?.reduce(
        (s: number, i: { quantity: number }) => s + i.quantity,
        0,
      ) ?? 0
    if (count > prevCount && cart.items?.length > 0) {
      const lastItem = cart.items[cart.items.length - 1]
      showToast(`${lastItem.title} added to cart`)
    }
    prevCount = count
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  poll()
  setInterval(poll, 500)
}
