const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const resolveFileUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }

  if (url.startsWith('/')) {
    try {
      const apiBase = new URL(API_BASE_URL, window.location.origin)
      return `${apiBase.origin}${url}`
    } catch {
      return url
    }
  }

  return url
}
