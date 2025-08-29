export async function handler(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
    }

    const GITHUB_PAT = process.env.GITHUB_PAT
    const GITHUB_REPO = process.env.GITHUB_REPO // owner/repo
    if (!GITHUB_PAT || !GITHUB_REPO) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured: set GITHUB_PAT and GITHUB_REPO in Netlify env' }) }
    }

    let payload
    try {
      payload = JSON.parse(event.body || '{}')
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
    }

    const ts = new Date().toISOString()
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`
    const date = ts.slice(0,10)
    const path = `logs/${date}/${id}.json`

    const contentObj = {
      ts,
      id,
      source: payload.source || 'frontend',
      level: payload.level || 'info',
      message: payload.message || '',
      meta: payload.meta || null
    }

    const content = Buffer.from(JSON.stringify(contentObj, null, 2)).toString('base64')

    const ghUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`
    const body = {
      message: `log: ${contentObj.source} ${contentObj.level} ${id}`,
      content,
      committer: { name: 'netlify-logger', email: 'noreply@netlify' }
    }

    const resp = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_PAT}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const result = await resp.json()
    if (!resp.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GitHub API error', details: result }) }
    }

    const download_url = result.content && result.content.download_url
    return { statusCode: 200, body: JSON.stringify({ ok: true, path, download_url }) }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error', message: String(e) }) }
  }
}
