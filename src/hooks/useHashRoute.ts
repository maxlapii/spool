import { useEffect, useState } from 'react'

export type Route = { page: 'projects' } | { page: 'editor'; projectId: string }

function parse(hash: string): Route {
  const m = hash.match(/^#\/p\/([a-zA-Z0-9_-]+)/)
  if (m) return { page: 'editor', projectId: m[1] }
  return { page: 'projects' }
}

export function navigate(route: Route) {
  window.location.hash = route.page === 'editor' ? `#/p/${route.projectId}` : '#/'
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
