import { NextResponse } from "next/server"
import { signOut } from "@/auth"

export async function GET(request: Request) {
  try {
    await signOut({ redirect: false })
  } catch (e) {
    console.error("Stale session cleanup failed:", e)
  }
  return NextResponse.redirect(new URL("/auth", request.url))
}
