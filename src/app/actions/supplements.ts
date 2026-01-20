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

export async function getSupplements() {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        const supplements = await prisma.supplement.findMany({
            where: { userId },
            orderBy: { order: 'asc' }
        });
        return { success: true, data: supplements };
    } catch (error) {
        console.error('Failed to fetch supplements:', error);
        return { success: false, error: 'Failed to fetch supplements' };
    }
}

export async function addSupplement(data: {
    name: string;
    timing: string[];
    amount: string;
    unit: string;
    manufacturer?: string;
    note?: string;
    startDate?: Date | null;
    pausedPeriods?: any; // Json
}) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        // Get max order to append to end
        const maxOrder = await prisma.supplement.findFirst({
            where: { userId },
            orderBy: { order: 'desc' },
            select: { order: true }
        });
        const nextOrder = (maxOrder?.order ?? -1) + 1;

        console.log('[addSupplement] Creating with data:', { userId, ...data, order: nextOrder });
        const supplement = await prisma.supplement.create({
            data: {
                userId,
                ...data,
                order: nextOrder
            }
        });
        console.log('[addSupplement] Created:', supplement);
        revalidatePath('/habits');
        return { success: true, data: supplement };
    } catch (error: any) {
        console.error('Failed to add supplement:', error);
        return { success: false, error: 'Failed to add supplement: ' + (error.message || String(error)) };
    }
}

export async function updateSupplement(id: string, data: {
    name?: string;
    timing?: string[];
    amount?: string;
    unit?: string;
    manufacturer?: string;
    note?: string;
    startDate?: Date | null;
    pausedPeriods?: any; // Json
}) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        const supplement = await prisma.supplement.update({
            where: { id, userId },
            data
        });
        revalidatePath('/habits');
        return { success: true, data: supplement };
    } catch (error) {
        console.error('Failed to update supplement:', error);
        return { success: false, error: 'Failed to update supplement' };
    }
}

export async function reorderSupplements(items: { id: string; order: number }[]) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.$transaction(
            items.map(item =>
                prisma.supplement.update({
                    where: { id: item.id, userId },
                    data: { order: item.order }
                })
            )
        );
        revalidatePath('/habits');
        return { success: true };
    } catch (error) {
        console.error('Failed to reorder supplements:', error);
        return { success: false, error: 'Failed to reorder supplements' };
    }
}

export async function deleteSupplement(id: string) {
    const userId = await getUserId();
    if (!userId) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.supplement.delete({
            where: { id, userId }
        });
        revalidatePath('/habits');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete supplement:', error);
        return { success: false, error: 'Failed to delete supplement' };
    }
}
