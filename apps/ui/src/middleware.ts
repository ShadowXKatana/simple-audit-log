export { proxy as middleware } from './proxy'

export const config = {
  matcher: ['/api/:path*', '/health'],
}
