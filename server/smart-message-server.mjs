import { createServer } from 'node:http'
import { createDecipheriv, randomUUID } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? process.env.SMART_MESSAGE_SERVER_PORT ?? '8787')
const BASE_URL = process.env.APPS_IN_TOSS_BASE_URL ?? 'https://apps-in-toss-api.toss.im'
const TEMPLATE_SET_CODE = process.env.SMART_MESSAGE_TEMPLATE_SET_CODE ?? 'summer-ping-reapply'
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
const DEBUG_ENDPOINTS_ENABLED = /^(1|true)$/i.test(process.env.SMART_MESSAGE_DEBUG_ENDPOINTS ?? '')
const APP_NAME = process.env.APPS_IN_TOSS_APP_NAME ?? 'summer-ping'
const ALLOWED_ORIGINS = new Set(
  (
    process.env.ALLOWED_ORIGINS ??
    `http://localhost:5173,http://127.0.0.1:5173,https://${APP_NAME}.private-apps.tossmini.com,https://${APP_NAME}.apps.tossmini.com`
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const STORE_DIR = resolve(process.env.SMART_MESSAGE_STORE_DIR ?? resolve(__dirname, '..', '.server-data'))
const STORE_PATH = resolve(STORE_DIR, 'reminders.json')
const STORE_TEMP_PATH = resolve(STORE_DIR, 'reminders.tmp.json')
const AES_GCM_IV_LENGTH = 12
const AES_GCM_TAG_LENGTH = 16
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_REMINDER_ATTEMPTS = 5

function ensureStore() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true })
  }

  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, JSON.stringify({ reminders: {}, sessions: {} }, null, 2))
  }
}

function loadStore() {
  ensureStore()
  const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8'))
  return {
    reminders: parsed?.reminders && typeof parsed.reminders === 'object' ? parsed.reminders : {},
    sessions: parsed?.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
  }
}

function saveStore(store) {
  writeFileSync(STORE_TEMP_PATH, JSON.stringify(store, null, 2))
  renameSync(STORE_TEMP_PATH, STORE_PATH)
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(payload))
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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

async function sendSmartMessage({ userKey, anonKey, context }) {
  if (!validateServerConfig()) {
    throw new Error(
      'SMART_MESSAGE_TEMPLATE_SET_CODE와 mTLS 인증서/키 환경변수가 필요합니다. APPS_IN_TOSS_CERT_PATH 또는 APPS_IN_TOSS_CERT_PEM(_BASE64), APPS_IN_TOSS_KEY_PATH 또는 APPS_IN_TOSS_KEY_PEM(_BASE64)를 설정하세요.',
    )
  }

  return partnerRequest({
    path: '/api-partner/v1/apps-in-toss/messenger/send-message',
    method: 'POST',
    headers: getSmartMessageRecipientHeaders({ userKey, anonKey }),
    body: {
      templateSetCode: TEMPLATE_SET_CODE,
      context,
    },
  })
}

async function sendSmartTestMessage({ userKey, anonKey, context, deploymentId }) {
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
    headers: getSmartMessageRecipientHeaders({ userKey, anonKey }),
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

async function exchangeAuthorizationCode({ authorizationCode, referrer }) {
  return partnerRequest({
    path: '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
    method: 'POST',
    body: {
      authorizationCode,
      referrer,
    },
  })
}

function createServerSession(store, userKey) {
  const sessionId = randomUUID()
  const now = Date.now()

  for (const [existingSessionId, session] of Object.entries(store.sessions)) {
    if (!session?.expiresAtMs || session.expiresAtMs <= now || String(session.userKey) === String(userKey)) {
      delete store.sessions[existingSessionId]
    }
  }

  store.sessions[sessionId] = {
    userKey: String(userKey),
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    expiresAtMs: now + SESSION_TTL_MS,
  }
  return sessionId
}

function getServerSession(store, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return null
  }

  const session = store.sessions[sessionId]
  if (!session) {
    return null
  }

  if (!session.expiresAtMs || session.expiresAtMs <= Date.now()) {
    delete store.sessions[sessionId]
    saveStore(store)
    return null
  }

  session.lastSeenAt = new Date().toISOString()
  return session
}

function getSmartMessageRecipientHeaders({ userKey, anonKey }) {
  const hasUserKey = typeof userKey === 'string' || typeof userKey === 'number'
  const hasAnonKey = typeof anonKey === 'string' || typeof anonKey === 'number'

  if (hasUserKey === hasAnonKey) {
    throw new Error('스마트 발송에는 userKey 또는 anonKey 중 하나만 전달해야 합니다.')
  }

  if (hasUserKey) {
    return {
      'x-user-key': String(userKey),
    }
  }

  return {
    'x-anon-key': String(anonKey),
  }
}

function getReminderRecipient(reminder) {
  if (reminder?.userKey) {
    return { userKey: String(reminder.userKey) }
  }

  if (reminder?.anonKey) {
    return { anonKey: String(reminder.anonKey) }
  }

  return null
}

function getReminderStoreKey({ userKey, anonKey }) {
  if (userKey) {
    return `user:${String(userKey)}`
  }

  if (anonKey) {
    return `anon:${String(anonKey)}`
  }

  throw new Error('리마인드 저장에는 userKey 또는 anonKey 중 하나가 필요합니다.')
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
                `Apps in Toss request failed: ${res.statusCode ?? 500} ${parsed?.error?.reason ?? raw ?? 'Unknown error'}`,
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
    if (
      !reminder.enabled ||
      reminder.nextReminderAtMs > now ||
      reminder.dispatchedFor === reminder.nextReminderAt ||
      (reminder.nextAttemptAtMs && reminder.nextAttemptAtMs > now)
    ) {
      continue
    }

    try {
      const recipient = getReminderRecipient(reminder)

      if (!recipient) {
        throw new Error('리마인드 대상 userKey 또는 anonKey가 없습니다.')
      }

      const context = {
        appliedAt: reminder.lastAppliedAt,
        nextReminderAt: reminder.nextReminderAt,
        outdoorTime: reminder.outdoorTime,
      }

      const result = await sendSmartMessage({
        ...recipient,
        context,
      })

      reminder.lastDispatchAt = new Date().toISOString()
      reminder.dispatchedFor = reminder.nextReminderAt
      reminder.lastDispatchResult = result
      reminder.lastError = null
      reminder.attempts = 0
      reminder.nextAttemptAtMs = null
    } catch (error) {
      const attempts = Number(reminder.attempts ?? 0) + 1
      reminder.lastError = error instanceof Error ? error.message : String(error)
      reminder.attempts = attempts

      if (attempts >= MAX_REMINDER_ATTEMPTS) {
        reminder.enabled = false
        reminder.nextAttemptAtMs = null
      } else {
        const retryDelayMs = Math.min(30 * 60 * 1000, 30 * 1000 * 2 ** (attempts - 1))
        reminder.nextAttemptAtMs = now + retryDelayMs
      }
    }
  }

  saveStore(store)
}

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response)

  if (!request.url) {
    json(response, 404, { error: 'Not found' })
    return
  }

  if (request.method === 'OPTIONS') {
    json(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && request.url.startsWith('/api/reminders/status')) {
    if (!DEBUG_ENDPOINTS_ENABLED) {
      json(response, 404, { error: 'Not found' })
      return
    }

    const url = new URL(request.url, `http://localhost:${PORT}`)
    const userKey = url.searchParams.get('userKey')
    const anonKey = url.searchParams.get('anonKey')
    const store = loadStore()
    const reminderKey = userKey ? getReminderStoreKey({ userKey }) : anonKey ? getReminderStoreKey({ anonKey }) : ''
    const reminder = reminderKey
      ? store.reminders[reminderKey] ?? (userKey ? store.reminders[String(userKey)] : null)
      : null

    json(response, 200, {
      configured: validateServerConfig(),
      reminder: reminder ?? null,
    })
    return
  }

  if (request.method === 'GET' && request.url === '/api/partner/mtls-check') {
    if (!DEBUG_ENDPOINTS_ENABLED) {
      json(response, 404, { error: 'Not found' })
      return
    }

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

  if (request.method === 'POST' && request.url === '/api/users/login') {
    try {
      const body = await readBody(request)
      const authorizationCode =
        typeof body.authorizationCode === 'string' ? body.authorizationCode.trim() : ''
      const referrer = body.referrer === 'SANDBOX' ? 'SANDBOX' : body.referrer === 'DEFAULT' ? 'DEFAULT' : ''

      if (!authorizationCode || !referrer) {
        json(response, 400, { error: '유효한 authorizationCode와 referrer가 필요합니다.' })
        return
      }

      const tokenResult = await exchangeAuthorizationCode({ authorizationCode, referrer })
      const accessToken = tokenResult?.success?.accessToken

      if (!accessToken) {
        throw new Error('토스 로그인 토큰을 발급받지 못했습니다.')
      }

      const loginMeResult = await fetchLoginMe(accessToken)
      const user = normalizeLoginMeResult(loginMeResult)

      if (!user.userKey) {
        throw new Error('토스 사용자 식별값을 확인하지 못했습니다.')
      }

      const store = loadStore()
      const sessionId = createServerSession(store, user.userKey)
      saveStore(store)

      json(response, 200, { sessionId, user })
    } catch (error) {
      json(response, 502, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/reminders/schedule') {
    try {
      const body = await readBody(request)
      const { sessionId, lastAppliedAt, outdoorTime = 'medium', notificationAgreement = 'unknown' } = body

      if (!sessionId || !lastAppliedAt) {
        json(response, 400, { error: '로그인 세션과 선케어 기록 시간이 필요합니다.' })
        return
      }

      const store = loadStore()
      const session = getServerSession(store, sessionId)

      if (!session) {
        json(response, 401, { error: '로그인 세션이 만료됐어요. 알림을 다시 연결해 주세요.' })
        return
      }

      const appliedAtMs = new Date(lastAppliedAt).getTime()
      const now = Date.now()
      const isRecentApplication = Number.isFinite(appliedAtMs) && appliedAtMs <= now + 5 * 60 * 1000 && appliedAtMs >= now - 30 * 60 * 1000

      if (!isRecentApplication) {
        json(response, 400, { error: '최근 30분 안에 기록한 시간만 알림으로 예약할 수 있어요.' })
        return
      }

      if (notificationAgreement !== 'newAgreement' && notificationAgreement !== 'alreadyAgreed') {
        json(response, 400, { error: '알림 동의를 완료한 뒤 예약해 주세요.' })
        return
      }

      const safeOutdoorTime = ['short', 'medium', 'long'].includes(outdoorTime) ? outdoorTime : 'medium'
      const reminderMinutes = getReminderMinutes(safeOutdoorTime)
      const nextReminderAtMs = appliedAtMs + reminderMinutes * 60 * 1000
      const nextReminderAt = new Date(nextReminderAtMs).toISOString()
      const userKey = String(session.userKey)
      const reminderKey = getReminderStoreKey({ userKey })

      store.reminders[reminderKey] = {
        userKey,
        anonKey: null,
        lastAppliedAt: new Date(appliedAtMs).toISOString(),
        outdoorTime: safeOutdoorTime,
        reminderMinutes,
        nextReminderAt,
        nextReminderAtMs,
        notificationAgreement,
        enabled: notificationAgreement === 'newAgreement' || notificationAgreement === 'alreadyAgreed',
        dispatchedFor: null,
        lastDispatchAt: null,
        lastDispatchResult: null,
        lastError: null,
        attempts: 0,
        nextAttemptAtMs: null,
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
    if (!DEBUG_ENDPOINTS_ENABLED) {
      json(response, 404, { error: 'Not found' })
      return
    }

    try {
      const body = await readBody(request)
      const { userKey, anonKey, context = {} } = body

      if ((!userKey && !anonKey) || (userKey && anonKey)) {
        json(response, 400, { error: 'userKey 또는 anonKey 중 하나가 필요합니다.' })
        return
      }

      const result = await sendSmartMessage({ userKey, anonKey, context })
      json(response, 200, { result })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/reminders/send-test-now') {
    if (!DEBUG_ENDPOINTS_ENABLED) {
      json(response, 404, { error: 'Not found' })
      return
    }

    try {
      const body = await readBody(request)
      const { userKey, anonKey, context = {}, deploymentId } = body

      if ((!userKey && !anonKey) || (userKey && anonKey)) {
        json(response, 400, { error: 'userKey 또는 anonKey 중 하나가 필요합니다.' })
        return
      }

      const result = await sendSmartTestMessage({ userKey, anonKey, context, deploymentId })
      json(response, 200, { result })
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) })
    }
    return
  }

  if (request.method === 'POST' && request.url === '/api/users/login-me') {
    if (!DEBUG_ENDPOINTS_ENABLED) {
      json(response, 404, { error: 'Not found' })
      return
    }

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
let isProcessingReminders = false

async function runReminderWorker() {
  if (isProcessingReminders) {
    return
  }

  isProcessingReminders = true
  try {
    await processDueReminders()
  } finally {
    isProcessingReminders = false
  }
}

void runReminderWorker().catch((error) => {
  console.error('Failed to process reminders:', error)
})

setInterval(() => {
  runReminderWorker().catch((error) => {
    console.error('Failed to process reminders:', error)
  })
}, 15000)

server.listen(PORT, () => {
  console.log(`Smart message server listening on http://localhost:${PORT}`)
})
