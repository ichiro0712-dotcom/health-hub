'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from 'next/cache';

async function getUserId() {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    // Always prefer DB lookup by email to ensure we have the correct current ID
    // (Session ID might be stale after DB resets)
    if (userEmail) {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true }
        });
        if (user) return user.id;
    }

    return (session?.user as any)?.id;
}

export async function getLifestyleHabits() {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        const habits = await prisma.lifestyleHabit.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
        return { success: true, data: habits };
    } catch (error) {
        console.error('Failed to fetch habits:', error);
        return { success: false, error: 'Failed to fetch habits' };
    }
}

export async function upsertLifestyleHabit(category: string, name: string, value: any) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        const habit = await prisma.lifestyleHabit.upsert({
            where: {
                userId_category_name: {
                    userId,
                    category,
                    name
                }
            },
            update: {
                value
            },
            create: {
                userId,
                category,
                name,
                value
            }
        });
        revalidatePath('/habits');
        return { success: true, data: habit };
    } catch (error) {
        console.error('Failed to update habit:', error);
        return { success: false, error: 'Failed to update habit' };
    }
}

export async function deleteLifestyleHabit(id: string) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.lifestyleHabit.delete({
            where: { id, userId }
        });
        revalidatePath('/habits');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete habit:', error);
        return { success: false, error: 'Failed to delete habit' };
    }
}
