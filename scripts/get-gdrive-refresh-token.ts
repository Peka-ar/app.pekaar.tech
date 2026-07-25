/**
 * One-time helper: obtain a Google OAuth refresh token for GDrive backup.
 *
 * Prerequisites:
 *   1. Google Cloud Console → APIs & Services → Credentials
 *      → Create Credentials → OAuth 2.0 Client ID (type: Desktop app)
 *   2. Enable the Google Drive API for the project.
 *   3. Put the Client ID + Secret in .env as:
 *        GOOGLE_OAUTH_CLIENT_ID="..."
 *        GOOGLE_OAUTH_CLIENT_SECRET="..."
 *
 * Run:
 *   npx tsx scripts/get-gdrive-refresh-token.ts
 *
 * It opens your browser for consent, catches the callback on port 3001,
 * and prints the refresh token. Copy it into .env as GOOGLE_OAUTH_REFRESH_TOKEN.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { exec } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { google } from "googleapis"

const REDIRECT_PORT = 3001
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/auth/callback`
const SCOPES = ["https://www.googleapis.com/auth/drive.file"]

function loadEnvFile() {
  const envPath = `${process.cwd()}/.env`
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile()

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error("\nMissing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env")
  console.error("Create a Desktop-app OAuth 2.0 Client ID in Google Cloud Console and set both vars.\n")
  process.exit(1)
}

const oauthClient = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const authUrl = oauthClient.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
})

console.log("\nOpening browser for Google consent...")
console.log("If it doesn't open, visit this URL manually:\n")
console.log(authUrl + "\n")

const cmd =
  process.platform === "win32"
    ? `start "" "${authUrl}"`
    : process.platform === "darwin"
      ? `open "${authUrl}"`
      : `xdg-open "${authUrl}"`
exec(cmd)

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "", `http://localhost:${REDIRECT_PORT}`)
  if (url.pathname !== "/auth/callback") {
    res.writeHead(404).end("Not found")
    return
  }

  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" })
    res.end(`<h1>Authorization failed</h1><p>${error}</p>`)
    server.close()
    console.error(`\nAuthorization failed: ${error}\n`)
    process.exit(1)
  }

  if (!code) {
    res.writeHead(400).end("Missing code")
    return
  }

  try {
    const { tokens } = await oauthClient.getToken(code)

    res.writeHead(200, { "Content-Type": "text/html" })
    res.end("<h1>Success! You can close this tab.</h1>")

    server.close()

    if (!tokens.refresh_token) {
      console.error("\nNo refresh_token returned. Revoke access in Google Account settings and retry.\n")
      process.exit(1)
    }

    console.log("\n=== SUCCESS ===\n")
    console.log("Add this to your .env:\n")
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"\n`)
    console.log("Then restart your dev server.\n")
    process.exit(0)
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" })
    res.end(`<h1>Token exchange failed</h1><pre>${String(err)}</pre>`)
    server.close()
    console.error("\nToken exchange failed:", err, "\n")
    process.exit(1)
  }
})

server.listen(REDIRECT_PORT, () => {
  console.log(`Listening for OAuth callback on http://localhost:${REDIRECT_PORT}\n`)
})
