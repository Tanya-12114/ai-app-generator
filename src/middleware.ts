import { withAuth } from "next-auth/middleware";

// Protects authenticated app surfaces. API routes do their own session
// checks (see route.ts files) so they can return structured 401 JSON
// instead of an HTML redirect.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/builder/:path*", "/apps/:path*"],
};
