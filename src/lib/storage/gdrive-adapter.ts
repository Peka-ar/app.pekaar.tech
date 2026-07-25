import { google } from "googleapis"
import { Readable } from "node:stream"
import { ReadableStream } from "node:stream/web"
import { BackupAdapter } from "./types"

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET
const GOOGLE_OAUTH_REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
const GDRIVE_BACKUP_FOLDER_ID = process.env.GDRIVE_BACKUP_FOLDER_ID

class GDriveAdapter implements BackupAdapter {
  private drive: ReturnType<typeof google.drive> | null = null

  constructor() {
    if (
      !GOOGLE_OAUTH_CLIENT_ID ||
      !GOOGLE_OAUTH_CLIENT_SECRET ||
      !GOOGLE_OAUTH_REFRESH_TOKEN ||
      !GDRIVE_BACKUP_FOLDER_ID
    ) {
      console.warn("GDrive backup not configured — missing env vars")
      return
    }

    try {
      const auth = new google.auth.OAuth2(
        GOOGLE_OAUTH_CLIENT_ID,
        GOOGLE_OAUTH_CLIENT_SECRET,
      )
      auth.setCredentials({
        refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN,
      })
      this.drive = google.drive({ version: "v3", auth })
    } catch (err) {
      console.error("Failed to initialize GDrive adapter:", err)
    }
  }

  async backupFile(
    key: string,
    sourceUrl: string,
    mimeType: string,
    backupName: string,
  ): Promise<string | null> {
    if (!this.drive || !GDRIVE_BACKUP_FOLDER_ID) return null

    try {
      const response = await fetch(sourceUrl)
      if (!response.ok) {
        console.error("Failed to download file from storage for backup:", sourceUrl)
        return null
      }

      if (!response.body) {
        console.error("GDrive backup: empty response body from", sourceUrl)
        return null
      }

      const stream = Readable.fromWeb(response.body as unknown as ReadableStream)

      const file = await this.drive.files.create({
        requestBody: {
          name: backupName,
          parents: [GDRIVE_BACKUP_FOLDER_ID],
          mimeType,
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: "id",
      })

      return file.data.id ?? null
    } catch (err) {
      console.error("GDrive backup failed for", key, err)
      return null
    }
  }

  async deleteBackup(gdriveFileId: string): Promise<void> {
    if (!this.drive) return

    try {
      await this.drive.files.delete({ fileId: gdriveFileId })
    } catch (err) {
      console.error("GDrive delete failed for", gdriveFileId, err)
    }
  }
}

export const gdriveAdapter = new GDriveAdapter()
