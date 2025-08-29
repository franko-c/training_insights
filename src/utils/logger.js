export async function remoteLog(level, message, meta = {}) {
  if (typeof window === 'undefined') return
  try {
    await fetch('/.netlify/functions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, meta, source: 'frontend' })
    })
  } catch (e) {
    // swallow to avoid noisy failures in production
    console.warn('remoteLog failed', e)
  }
}

export default { remoteLog }
