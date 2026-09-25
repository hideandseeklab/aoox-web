import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/features/auth/auth.session"

const PUBLIC_PATHS = ["/sign-in", "/setup", "/invite/"]

// Optimistic redirect only; real auth is verified by the API on every request.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!hasSession && !isPublic) {
    const url = new URL("/sign-in", request.url)
    return NextResponse.redirect(url)
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\..*).*)"],
}
