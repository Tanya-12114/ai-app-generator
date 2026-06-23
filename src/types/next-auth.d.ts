import { DefaultSession } from "next-auth";

// FIX: every API route was doing `(session.user as any).id` to read the
// user id NextAuth attaches in the `session` callback (see lib/auth.ts).
// The `any` cast worked, but it silently disabled type-checking on every
// one of those ~15 call sites — a typo like `.Id` or `.userId` would have
// compiled fine and failed at runtime. This augmentation makes
// `session.user.id` a real, checked `string` everywhere.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
