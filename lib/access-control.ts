const ACCESS_TOKEN_VERSION = 'v1'

export const ACCESS_COOKIE_NAME = 'gluco_access'
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getConfiguredAccessCode(): string {
  return (process.env.APP_ACCESS_CODE ?? '').trim()
}

export function hasAccessCodeConfigured(): boolean {
  return getConfiguredAccessCode().length > 0
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeStringEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function getExpectedAccessToken(): Promise<string> {
  const accessCode = getConfiguredAccessCode()
  if (!accessCode) return ''
  return sha256Hex(`${ACCESS_TOKEN_VERSION}:${accessCode}`)
}

export async function isAccessCodeValid(providedCode: string): Promise<boolean> {
  const trimmedCode = providedCode.trim()
  if (!trimmedCode) return false
  const expectedToken = await getExpectedAccessToken()
  if (!expectedToken) return false
  const providedToken = await sha256Hex(`${ACCESS_TOKEN_VERSION}:${trimmedCode}`)
  return safeStringEquals(providedToken, expectedToken)
}

export async function hasValidAccessToken(tokenValue: string | undefined): Promise<boolean> {
  if (!tokenValue) return false
  const expectedToken = await getExpectedAccessToken()
  if (!expectedToken) return false
  return safeStringEquals(tokenValue, expectedToken)
}
