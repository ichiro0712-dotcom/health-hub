'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardResponse } from "@/types/dashboard";
import { PrismaClient } from "@prisma/client";

// Ensure Prisma Client is generated: npx prisma generate
const prisma = new PrismaClient();

export async function getUserProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { name: true, birthDate: true }
        });
        return { success: true, data: user };
    } catch (error) {
        console.error("Get Profile Error:", error);
        return { success: false, error: "Failed to fetch profile" };
    }
}

export async function updateUserProfile(data: { name?: string; birthDate?: string }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        await prisma.user.upsert({
            where: { email: session.user.email },
            update: {
                name: data.name,
                birthDate: data.birthDate ? new Date(data.birthDate) : null
            },
            create: {
                email: session.user.email,
                name: data.name,
                birthDate: data.birthDate ? new Date(data.birthDate) : null
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Update Profile Error:", error);
        return { success: false, error: "更新に失敗しました (システムエラー)" };
    }
}
