import { Readable } from "node:stream"
import { ReadableStream } from "node:stream/web"
import { BackupAdapter } from "./types"
import { getGDriveClient } from "./gdrive-client"

const GDRIVE_BACKUP_FOLDER_ID = process.env.GDRIVE_BACKUP_FOLDER_ID

class GDriveAdapter implements BackupAdapter {
  private get drive() {
    return getGDriveClient()
  }

  async backupFile(
    key: string,
    sourceUrl: string,
    mimeType: string,
    backupName: string,
  ): Promise<string | null> {
    const drive = this.drive
    if (!drive || !GDRIVE_BACKUP_FOLDER_ID) return null

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

      const file = await drive.files.create({
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
    const drive = this.drive
    if (!drive) return

    try {
      await drive.files.delete({ fileId: gdriveFileId })
    } catch (err) {
      console.error("GDrive delete failed for", gdriveFileId, err)
    }
  }
}

export const gdriveAdapter = new GDriveAdapter()
