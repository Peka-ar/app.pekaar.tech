import { describe, expect, it } from "vitest";
import { isSafeExternalUrl } from "./url-guard";

describe("isSafeExternalUrl", () => {
  it("accepts normal https URLs", () => {
    expect(isSafeExternalUrl("https://cdn.example.com/model.glb")).toBe(true);
    expect(isSafeExternalUrl("https://fra.cloud.appwrite.io/v1/storage/b")).toBe(true);
  });

  it("rejects non-https schemes", () => {
    expect(isSafeExternalUrl("http://example.com/x.glb")).toBe(false);
    expect(isSafeExternalUrl("ftp://example.com/x.glb")).toBe(false);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects garbage and empty values", () => {
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
    expect(isSafeExternalUrl("")).toBe(false);
    expect(isSafeExternalUrl("not a url")).toBe(false);
  });

  it("rejects embedded credentials", () => {
    expect(isSafeExternalUrl("https://user:pass@example.com/x.glb")).toBe(false);
  });

  it("rejects loopback and localhost", () => {
    expect(isSafeExternalUrl("https://localhost/x.glb")).toBe(false);
    expect(isSafeExternalUrl("https://127.0.0.1/x.glb")).toBe(false);
    expect(isSafeExternalUrl("https://127.0.0.1:3000/x.glb")).toBe(false);
  });

  it("rejects cloud metadata endpoints", () => {
    expect(isSafeExternalUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSafeExternalUrl("https://metadata.google.internal/computeMetadata/")).toBe(false);
  });

  it("rejects private IPv4 ranges", () => {
    expect(isSafeExternalUrl("https://10.0.0.5/x")).toBe(false);
    expect(isSafeExternalUrl("https://192.168.1.1/x")).toBe(false);
    expect(isSafeExternalUrl("https://172.16.0.1/x")).toBe(false);
    expect(isSafeExternalUrl("https://0.0.0.0/x")).toBe(false);
    expect(isSafeExternalUrl("https://224.0.0.1/x")).toBe(false);
  });

  it("rejects IPv6 loopback/ULA/link-local literals", () => {
    expect(isSafeExternalUrl("https://[::1]/x")).toBe(false);
    expect(isSafeExternalUrl("https://[fe80::1]/x")).toBe(false);
    expect(isSafeExternalUrl("https://[fc00::1]/x")).toBe(false);
    expect(isSafeExternalUrl("https://[::ffff:10.0.0.1]/x")).toBe(false);
  });

  it("accepts public IPv4 literals", () => {
    expect(isSafeExternalUrl("https://93.184.216.34/x.glb")).toBe(true);
  });
});
