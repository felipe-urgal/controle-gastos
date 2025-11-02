import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET!)

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const protectedRoutes = ['/calendario']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  const authRoutes = ['/login', '/criar-conta', '/recuperar-senha', '/redefinir-senha']
  const isAuthRoute = authRoutes.includes(pathname)

  let isValidToken = false
  if (token) {
    try {
      jwtVerify(token, SECRET_KEY)
      isValidToken = true
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }
  }

  if (isProtectedRoute && !isValidToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && isValidToken) {
    return NextResponse.redirect(new URL('/calendario', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|sw.js|manifest.json).*)',
  ]
}