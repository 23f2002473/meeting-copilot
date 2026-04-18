import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    // Expose the user's Google sub (stable user ID) on the session
    session({ session, token }) {
      return {
        ...session,
        user: { ...session.user, id: token.sub ?? '' },
      };
    },
  },
  pages: {
    // Stay on the same page after sign-in
    signIn: '/',
  },
});

export { handler as GET, handler as POST };
