import React from 'react'
import { useRouterState } from '~/lib/router'
import { useQuery } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { cvq } from '~/lib/convex-helpers'

type TrackingCode = {
  _id: string
  name: string
  code: string
  position: string
  pageTarget: string
  active: boolean
  sortOrder: number
}

function useCurrentPathname(): string {
  const router = useRouterState()
  return router.location.pathname
}

function isMatchPageTarget(pageTarget: string, pathname: string): boolean {
  if (pageTarget === 'all') return true
  const targets = pageTarget.split(',')
  return targets.some((target) => {
    const t = target.trim()
    if (t === pathname) return true
    if (t !== '/' && pathname.startsWith(t)) return true
    return false
  })
}

export function TrackingHeadScripts() {
  const pathname = useCurrentPathname()
  const { data } = useQuery(
    cvq(api.trackingCodes.getByPosition, { position: 'head' }),
  ) as { data: Array<TrackingCode> | undefined }

  const codes = data?.filter(
    (c) => c.active && isMatchPageTarget(c.pageTarget, pathname),
  )

  if (!codes || codes.length === 0) return null

  return (
    <>
      {codes.map((code) => (
        <InjectScript key={code._id} code={code.code} target="head" />
      ))}
    </>
  )
}

export function TrackingBodyStartScripts() {
  const pathname = useCurrentPathname()
  const { data } = useQuery(
    cvq(api.trackingCodes.getByPosition, { position: 'body_start' }),
  ) as { data: Array<TrackingCode> | undefined }

  const codes = data?.filter(
    (c) => c.active && isMatchPageTarget(c.pageTarget, pathname),
  )

  if (!codes || codes.length === 0) return null

  return (
    <>
      {codes.map((code) => (
        <InjectScript key={code._id} code={code.code} target="bodyStart" />
      ))}
    </>
  )
}

export function TrackingBodyEndScripts() {
  const pathname = useCurrentPathname()
  const { data } = useQuery(
    cvq(api.trackingCodes.getByPosition, { position: 'body_end' }),
  ) as { data: Array<TrackingCode> | undefined }

  const codes = data?.filter(
    (c) => c.active && isMatchPageTarget(c.pageTarget, pathname),
  )

  if (!codes || codes.length === 0) return null

  return (
    <>
      {codes.map((code) => (
        <InjectScript key={code._id} code={code.code} target="bodyEnd" />
      ))}
    </>
  )
}

function InjectScript({
  code,
  target,
}: {
  code: string
  target: 'head' | 'bodyStart' | 'bodyEnd'
}) {
  React.useEffect(() => {
    if (typeof document === 'undefined') return

    const range = document.createRange()
    const fragment = range.createContextualFragment(code)
    const elements: Array<Node> = Array.from(fragment.childNodes)

    elements.forEach((node) => {
      if (target === 'head') {
        document.head.appendChild(node)
      } else if (target === 'bodyStart') {
        document.body.insertBefore(node, document.body.firstChild)
      } else {
        document.body.appendChild(node)
      }
    })

    return () => {
      elements.forEach((node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node)
        }
      })
    }
  }, [code, target])

  return null
}
