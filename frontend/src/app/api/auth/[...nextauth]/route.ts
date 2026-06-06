import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          const data = await res.json();

          if (res.ok && data.success && data.data?.token) {
            return {
              id: data.data.user.id,
              name: data.data.user.username,
              role: data.data.user.role,
              token: data.data.token,
            } as unknown as User;
          }
          return null;
        } catch {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as User).role;
        token.accessToken = (user as User).token;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      session.accessToken = token.accessToken as string;
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
