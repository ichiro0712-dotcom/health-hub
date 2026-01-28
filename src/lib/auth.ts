import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";

// 開発環境用のCredentialsProvider
const devCredentialsProvider = CredentialsProvider({
    name: "Test Login",
    credentials: {
        email: { label: "Email", type: "text", placeholder: "test@example.com" },
    },
    async authorize() {
        const email = "ichiro0712@gmail.com";

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { email },
        });

        // If not, create the user
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email,
                    name: "Ichiro",
                    image: "https://ui-avatars.com/api/?name=Ichiro&background=random",
                },
            });
        }

        return user;
    },
});

// 本番環境では CredentialsProvider を完全に除外
const providers = process.env.NODE_ENV === 'development'
    ? [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        devCredentialsProvider,
    ]
    : [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ];

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.picture = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.image = token.picture as string;
            }
            return session;
        },
    },
    debug: process.env.NODE_ENV === 'development',
};
