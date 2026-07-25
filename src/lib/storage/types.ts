export interface PresignedUploadResult {
  url: string
  key: string
}

export interface ConfirmUploadResult {
  exists: boolean
  size?: number
  mimeType?: string
}

export interface StorageAdapter {
  getPresignedUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>
  confirmUpload(key: string): Promise<ConfirmUploadResult>
  getPublicUrl(key: string): string
  deleteObject(key: string): Promise<void>
  deleteObjects(keys: string[]): Promise<void>
}

export interface BackupAdapter {
  backupFile(key: string, sourceUrl: string, mimeType: string, backupName: string): Promise<string | null>
  deleteBackup(gdriveFileId: string): Promise<void>
}
