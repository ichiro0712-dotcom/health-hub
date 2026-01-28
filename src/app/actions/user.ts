'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function getUserProfile() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
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
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
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
