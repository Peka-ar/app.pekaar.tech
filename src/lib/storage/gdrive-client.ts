import { google } from "googleapis"

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const GOOGLE_OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN

let cachedDrive: ReturnType<typeof google.drive> | null = null
let initialized = false

export function isGDriveConfigured(): boolean {
  return Boolean(
    GOOGLE_OAUTH_CLIENT_ID &&
      GOOGLE_OAUTH_CLIENT_SECRET &&
      GOOGLE_OAUTH_REFRESH_TOKEN,
  )
}

export function getGDriveClient(): ReturnType<typeof google.drive> | null {
  if (initialized) return cachedDrive

  initialized = true

  if (!isGDriveConfigured()) {
    console.warn("GDrive client not configured — missing env vars")
    return null
  }

  try {
    const auth = new google.auth.OAuth2(
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET,
    )
    auth.setCredentials({
      refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN,
    })
    cachedDrive = google.drive({ version: "v3", auth })
    return cachedDrive
  } catch (err) {
    console.error("Failed to initialize GDrive client:", err)
    return null
  }
}
