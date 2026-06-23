import type { NextAuthConfig } from "next-auth"

const USER_ALLOWED_DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/security",
  "/dashboard/bookmarks",
  "/dashboard/history",
]

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as import("@/generated/prisma/client").Role
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role

      const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard")

      if (isDashboardRoute && !isLoggedIn) return false

      if (isDashboardRoute && role === "USER") {
        const isAllowed = USER_ALLOWED_DASHBOARD_ROUTES.some(
          (r) => nextUrl.pathname === r
        )
        if (!isAllowed) return Response.redirect(new URL("/", nextUrl))
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig

export default authConfig
