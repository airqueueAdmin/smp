import { createServer } from 'node:http'
import { createDecipheriv } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? process.env.SMART_MESSAGE_SERVER_PORT ?? '8787')
const BASE_URL = process.env.APPS_IN_TOSS_BASE_URL ?? 'https://apps-in-toss-api.toss.im'
const TEMPLATE_SET_CODE = process.env.SMART_MESSAGE_TEMPLATE_SET_CODE ?? ''
const TEST_DEPLOYMENT_ID = process.env.SMART_MESSAGE_TEST_DEPLOYMENT_ID ?? ''
const CERT_PATH = process.env.APPS_IN_TOSS_CERT_PATH ?? ''
const KEY_PATH = process.env.APPS_IN_TOSS_KEY_PATH ?? ''
const CERT_PEM = process.env.APPS_IN_TOSS_CERT_PEM ?? ''
const KEY_PEM = process.env.APPS_IN_TOSS_KEY_PEM ?? ''
const CERT_PEM_BASE64 = process.env.APPS_IN_TOSS_CERT_PEM_BASE64 ?? ''
const KEY_PEM_BASE64 = process.env.APPS_IN_TOSS_KEY_PEM_BASE64 ?? ''
const USER_INFO_DECRYPTION_KEY = process.env.APPS_IN_TOSS_USER_INFO_DECRYPTION_KEY ?? ''
const USER_INFO_DECRYPTION_KEY_BASE64 = process.env.APPS_IN_TOSS_USER_INFO_DECRYPTION_KEY_BASE64 ?? ''
const USER_INFO_AAD = process.env.APPS_IN_TOSS_USER_INFO_AAD ?? ''
const USER_INFO_AAD_BASE64 = process.env.APPS_IN_TOSS_USER_INFO_AAD_BASE64 ?? ''
const DEFAULT_REMINDER_MINUTES = Number(process.env.DEFAULT_REMINDER_MINUTES ?? '120')
const STORE_DIR = resolve(__dirname, '..', '.server-data')
const STORE_PATH = resolve(STORE_DIR, 'reminders.json')
const AES_GCM_IV_LENGTH = 12
const AES_GCM_TAG_LENGTH = 16

function ensureStore() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true })
  }

  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, JSON.stringify({ reminders: {} }, null, 2))
  }
}

function loadStore() {
  ensureStore()
  return JSON.parse(readFileSync(STORE_PATH, 'utf8'))
}

function saveStore(store) {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
    })
    request.on('end', () => {
      if (!raw) {
        resolveBody({})
        return
      }

      try {
        resolveBody(JSON.parse(raw))
      } catch (error) {
        rejectBody(error)
      }
    })
    request.on('error', rejectBody)
  })
}

function getReminderMinutes(outdoorTime) {
  if (outdoorTime === 'long') {
    return 90
  }

  if (outdoorTime === 'short') {
    return 150
  }

  return DEFAULT_REMINDER_MINUTES
}

function decodeBase64(value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function decodeBase64ToBuffer(value) {
  return Buffer.from(value, 'base64')
}

function normalizeBase64(value) {
  return value.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '')
}

function normalizeEnvMultiline(value) {
  const trimmed = value.trim()
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed

  return unquoted.replace(/\\n/g, '\n')
}

function loadTlsCredential(kind) {
  const isCert = kind === 'cert'
  const directPem = isCert ? CERT_PEM : KEY_PEM
  const base64Pem = isCert ? CERT_PEM_BASE64 : KEY_PEM_BASE64
  const filePath = isCert ? CERT_PATH : KEY_PATH

  if (directPem) {
    return normalizeEnvMultiline(directPem)
  }

  if (base64Pem) {
    return decodeBase64(base64Pem)
  }

  if (filePath) {
    return readFileSync(filePath)
  }

  return null
}

function hasTlsCredentials() {
  return Boolean(loadTlsCredential('cert') && loadTlsCredential('key'))
}

function validateServerConfig() {
  return Boolean(TEMPLATE_SET_CODE && hasTlsCredentials())
}

function loadUserInfoDecryptionKey() {
  if (USER_INFO_DECRYPTION_KEY_BASE64) {
    return decodeBase64ToBuffer(USER_INFO_DECRYPTION_KEY_BASE64)
  }

  if (!USER_INFO_DECRYPTION_KEY) {
    return null
  }

  if (/^[0-9a-fA-F]{64}$/.test(USER_INFO_DECRYPTION_KEY)) {
    return Buffer.from(USER_INFO_DECRYPTION_KEY, 'hex')
  }

  const utf8Buffer = Buffer.from(USER_INFO_DECRYPTION_KEY, 'utf8')

  if (utf8Buffer.length === 32) {
    return utf8Buffer
  }

  try {
    const decoded = decodeBase64ToBuffer(normalizeBase64(USER_INFO_DECRYPTION_KEY))

    if (decoded.length === 32) {
      return decoded
    }
  } catch {
    return null
  }

  return null
}

function loadUserInfoAad() {
  if (USER_INFO_AAD) {
    return Buffer.from(USER_INFO_AAD, 'utf8')
  }

  if (USER_INFO_AAD_BASE64) {
    return decodeBase64ToBuffer(normalizeBase64(USER_INFO_AAD_BASE64))
  }

  return null
}

function hasUserInfoDecryptionConfig() {
  return Boolean(loadUserInfoDecryptionKey() && loadUserInfoAad())
}

function decryptUserInfoField(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  const key = loadUserInfoDecryptionKey()
  const aad = loadUserInfoAad()

  if (!key || !aad) {
    return null
  }

  const encrypted = decodeBase64ToBuffer(normalizeBase64(value))

  if (encrypted.length <= AES_GCM_IV_LENGTH + AES_GCM_TAG_LENGTH) {
    throw new Error('암호화된 사용자 정보 길이가 올바르지 않습니다.')
  }

  const iv = encrypted.subarray(0, AES_GCM_IV_LENGTH)
  const authTag = encrypted.subarray(encrypted.length - AES_GCM_TAG_LENGTH)
  const ciphertext = encrypted.subarray(AES_GCM_IV_LENGTH, encrypted.length - AES_GCM_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAAD(aad)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

function parseScope(scope) {
  if (typeof scope !== 'string' || !scope.trim()) {
    return []
  }

  return scope
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeLoginMeResult(result) {
  const success = result?.success ?? {}
  let name = null
  let decryptionStatus = 'not_requested'

  if (typeof success.name === 'string' && success.name) {
    if (!hasUserInfoDecryptionConfig()) {
      decryptionStatus = 'missing_key'
    } else {
      try {
        name = decryptUserInfoField(success.name)
        decryptionStatus = name ? 'decrypted' : 'missing_key'
      } catch (error) {
        console.error('Failed to decrypt user name:', error)
        decryptionStatus = 'failed'
      }
    }
  }

  return {
    userKey: success.userKey ? String(success.userKey) : '',
    scope: parseScope(success.scope),
    agreedTerms: Array.isArray(success.agreedTerms) ? success.agreedTerms : [],
    name,
    hasEncryptedName: typeof success.name === 'string' && success.name.length > 0,
    decryptionStatus,
  }
}

async function sendSmartMessage({ userKey, context }) {
  if (!validateServerConfig()) {
    throw new Error(
      'SMART_MESSAGE_TEMPLATE_SET_CODE와 mTLS 인증서/키 환경변수가 필요합니다. APPS_IN_TOSS_CERT_PATH 또는 APPS_IN_TOSS_CERT_PEM(_BASE64), APPS_IN_TOSS_KEY_PATH 또는 APPS_IN_TOSS_KEY_PEM(_BASE64)를 설정하세요.',
    )
  }

  return partnerRequest({
    path: '/api-partner/v1/apps-in-toss/messenger/send-message',
    method: 'POST',
    headers: {
      'x-toss-user-key': String(userKey),
    },
    body: {
      templateSetCode: TEMPLATE_SET_CODE,
      context,
    },
  })
}

async function sendSmartTestMessage({ userKey, context, deploymentId }) {
  if (!validateServerConfig()) {
    throw new Error(
      'SMART_MESSAGE_TEMPLATE_SET_CODE와 mTLS 인증서/키 환경변수가 필요합니다. APPS_IN_TOSS_CERT_PATH 또는 APPS_IN_TOSS_CERT_PEM(_BASE64), APPS_IN_TOSS_KEY_PATH 또는 APPS_IN_TOSS_KEY_PEM(_BASE64)를 설정하세요.',
    )
  }

  const resolvedDeploymentId = deploymentId ?? TEST_DEPLOYMENT_ID

  if (!resolvedDeploymentId) {
    throw new Error('deploymentId가 필요합니다. 요청 바디에 넣거나 SMART_MESSAGE_TEST_DEPLOYMENT_ID 환경변수를 설정하세요.')
  }

  return partnerRequest({
    path: '/api-partner/v1/apps-in-toss/messenger/send-test-message',
    method: 'POST',
    headers: {
      'x-toss-user-key': String(userKey),
    },
    body: {
      templateSetCode: TEMPLATE_SET_CODE,
      deploymentId: resolvedDeploymentId,
      context,
    },
  })
}

async function fetchLoginMe(accessToken) {
  return partnerRequest({
    path: '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

async function partnerRequest({ path, method, headers = {}, body }) {
  const url = new URL(path, BASE_URL)
  const rawBody = body ? JSON.stringify(body) : null
  const cert = loadTlsCredential('cert')
  const key = loadTlsCredential('key')

  return new Promise((resolveRequest, rejectRequest) => {
    const req = httpsRequest(
      url,
      {
        method,
        cert,
        key,
        rejectUnauthorized: true,
        headers: {
          'Content-Type': 'application/json',
          ...(rawBody ? { 'Content-Length': Buffer.byteLength(rawBody) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = ''

        res.on('data', (chunk) => {
          raw += chunk
        })

        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {}

            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && parsed.resultType === 'SUCCESS') {
              resolveRequest(parsed)
              return
            }

            rejectRequest(
              new Error(
                `Smart message failed: ${res.statusCode ?? 500} ${parsed?.error?.reason ?? raw ?? 'Unknown error'}`,
              ),
            )
          } catch (error) {
            rejectRequest(error)
          }
        })
      },
    )

    req.on('error', rejectRequest)
    if (rawBody) {
      req.write(rawBody)
    }
    req.end()
  })
}

async function checkMtlsConnection() {
  const url = new URL('/api-partner/v1/apps-in-toss/user/oauth2/login-me', BASE_URL)
  const cert = loadTlsCredential('cert')
  const key = loadTlsCredential('key')

  if (!cert || !key) {
    throw new Error(
      'mTLS 인증서/키 환경변수가 필요합니다. APPS_IN_TOSS_CERT_PATH 또는 APPS_IN_TOSS_CERT_PEM(_BASE64), APPS_IN_TOSS_KEY_PATH 또는 APPS_IN_TOSS_KEY_PEM(_BASE64)를 설정하세요.',
    )
  }

  return new Promise((resolveRequest, rejectRequest) => {
    const req = httpsRequest(
      url,
      {
        method: 'GET',
        cert,
        key,
        rejectUnauthorized: true,
        headers: {
          Authorization: 'Bearer mtls-health-check',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let raw = ''

        res.on('data', (chunk) => {
          raw += chunk
        })

        res.on('end', () => {
          try {
            const parsed = raw ? JSON.parse(raw) : {}
            const handshakeSucceeded = res.statusCode !== undefined

            resolveRequest({
              handshakeSucceeded,
              statusCode: res.statusCode ?? 0,
              resultType: parsed?.resultType ?? null,
              reason: parsed?.error?.reason ?? null,
              errorCode: parsed?.error?.errorCode ?? null,
            })
          } catch (error) {
            rejectRequest(error)
          }
        })
      },
    )

    req.on('error', rejectRequest)
    req.end()
  })
}

async function processDueReminders() {
  const store = loadStore()
  const now = Date.now()
  const reminders = Object.values(store.reminders)

  for (const reminder of reminders) {
    if (!reminder.enabled || reminder.nextReminderAtMs > now || reminder.dispatchedFor === reminder.nextReminderAt) {
      continue
    }

    try {
      const context = {
        appliedAt: reminder.lastAppliedAt,
        nextReminderAt: reminder.nextReminderAt,
        outdoorTime: reminder.outdoorTime,
      }

      const result = await sendSmartMessage({
        userKey: reminder.userKey,
        context,
      })

      reminder.lastDispatchAt = new Date().toISOString()
      reminder.dispatchedFor = reminder.nextReminderAt
      reminder.lastDispatchResult = result
      reminder.lastError = null
    } catch (error) {
      reminder.lastError = error instanceof Error ? error.message : String(error)
    }
  }

  saveStore(store)
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    json(response, 404, { error: 'Not found' })
    return
  }

  if (request.method === 'OPTIONS') {
    json(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && request.url.startsWith('/api/reminders/status')) {
    const url = new URL(request.url, `http://localhost:${PORT}`)
    const userKey = url.searchParams.get('userKey')
    const store = loadStore()
    const reminder = userKey ? store.reminders[userKey] : null

    json(response, 200, {
      configured: validateServerConfig(),
      reminder: reminder ?? null,
    })
    return
  }

  if (request.method === 'GET' && request.url === '/api/partner/mtls-check') {
    try {
      const result = await checkMtlsConnection()

      json(response, 200, {
        configured: hasTlsCredentials(),
        result,
      })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/reminders/schedule') {
    try {
      const body = await readBody(request)
      const { userKey, lastAppliedAt, outdoorTime = 'medium', notificationAgreement = 'unknown' } = body

      if (!userKey || !lastAppliedAt) {
        json(response, 400, { error: 'userKey와 lastAppliedAt이 필요합니다.' })
        return
      }

      const reminderMinutes = getReminderMinutes(outdoorTime)
      const nextReminderAtMs = new Date(lastAppliedAt).getTime() + reminderMinutes * 60 * 1000
      const nextReminderAt = new Date(nextReminderAtMs).toISOString()
      const store = loadStore()

      store.reminders[String(userKey)] = {
        userKey: String(userKey),
        lastAppliedAt,
        outdoorTime,
        reminderMinutes,
        nextReminderAt,
        nextReminderAtMs,
        notificationAgreement,
        enabled: notificationAgreement === 'newAgreement' || notificationAgreement === 'alreadyAgreed',
        dispatchedFor: null,
        lastDispatchAt: null,
        lastDispatchResult: null,
        lastError: null,
      }

      saveStore(store)

      json(response, 200, {
        configured: validateServerConfig(),
        nextReminderAt,
      })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/reminders/send-now') {
    try {
      const body = await readBody(request)
      const { userKey, context = {} } = body

      if (!userKey) {
        json(response, 400, { error: 'userKey가 필요합니다.' })
        return
      }

      const result = await sendSmartMessage({ userKey, context })
      json(response, 200, { result })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/reminders/send-test-now') {
    try {
      const body = await readBody(request)
      const { userKey, context = {}, deploymentId } = body

      if (!userKey) {
        json(response, 400, { error: 'userKey가 필요합니다.' })
        return
      }

      const result = await sendSmartTestMessage({ userKey, context, deploymentId })
      json(response, 200, { result })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/users/login-me') {
    try {
      const body = await readBody(request)
      const { accessToken } = body

      if (!accessToken) {
        json(response, 400, { error: 'accessToken이 필요합니다.' })
        return
      }

      const result = await fetchLoginMe(accessToken)
      json(response, 200, {
        user: normalizeLoginMeResult(result),
      })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  json(response, 404, { error: 'Not found' })
})

ensureStore()
setInterval(() => {
  processDueReminders().catch((error) => {
    console.error('Failed to process reminders:', error)
  })
}, 15000)

server.listen(PORT, () => {
  console.log(`Smart message server listening on http://localhost:${PORT}`)
})
