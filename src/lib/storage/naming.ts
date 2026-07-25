import { randomUUID } from "node:crypto"

const DATE_RE = /[^a-z0-9]+/g
const DASHES_RE = /^-+|-+$/g

export function slugify(name: string): string {
  const extIdx = name.lastIndexOf(".")
  const base = extIdx >= 0 ? name.slice(0, extIdx) : name
  const ext = extIdx >= 0 ? name.slice(extIdx) : ""
  return (
    base
      .toLowerCase()
      .replace(DATE_RE, "-")
      .replace(DASHES_RE, "") + ext
  )
}

export function generateAssetId(): string {
  return randomUUID()
}

export function buildBackupName(assetId: string, originalName: string): string {
  const extIdx = originalName.lastIndexOf(".")
  const ext = extIdx >= 0 ? originalName.slice(extIdx).toLowerCase() : ""
  return `${assetId}${ext}`
}
