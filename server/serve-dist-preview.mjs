import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { createServer } from 'node:http'

const webDistDir = join(process.cwd(), 'dist', 'web')
const viteDistDir = join(process.cwd(), 'dist')
const rootDir = existsSync(join(webDistDir, 'index.html')) ? webDistDir : viteDistDir
const port = Number(process.argv[2] ?? process.env.PREVIEW_PORT ?? '4173')

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0])
  const candidate = pathname === '/' ? '/index.html' : pathname
  const normalizedPath = normalize(candidate).replace(/^(\.\.(\/|\\|$))+/, '')
  const fullPath = join(rootDir, normalizedPath)

  if (existsSync(fullPath) && statSync(fullPath).isFile()) {
    return fullPath
  }

  return join(rootDir, 'index.html')
}

createServer((request, response) => {
  const filePath = resolvePath(request.url ?? '/')
  const extension = extname(filePath)
  const contentType = contentTypes[extension] ?? 'application/octet-stream'

  response.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  })

  createReadStream(filePath).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview server running at http://127.0.0.1:${port}`)
})
