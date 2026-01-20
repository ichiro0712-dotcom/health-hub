import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.heart_rate.read",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
        CredentialsProvider({
            name: "Test Login",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "test@example.com" },
            },
            async authorize(credentials) {
                // ONLY allow this in development or for specific test emails
                if (process.env.NODE_ENV === 'production') {
                    return null;
                }

                const email = "test@example.com";

                // Check if user exists
                let user = await prisma.user.findUnique({
                    where: { email },
                });

                // If not, create a test user
                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email,
                            name: "Test User",
                            image: "https://ui-avatars.com/api/?name=Test+User&background=random",
                        },
                    });
                }

                return user;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
            }
            // Persist the access token to the token object if needed for API calls
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
};
