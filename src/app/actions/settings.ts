'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from 'next/cache';
import prisma from "@/lib/prisma";

export async function getUserItemSettings() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string } | undefined;
    if (!user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const settings = await prisma.userHealthItemSetting.findMany({
            where: { userId: user.id },
            orderBy: { itemName: 'asc' }
        });
        return { success: true, data: settings };
    } catch (error) {
        console.error('Failed to fetch item settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

export async function updateUserItemSetting(itemName: string, settings: {
    minVal: number;
    maxVal: number;
    safeMin?: number | null;
    safeMax?: number | null;
    tags: string[];
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string } | undefined;
    if (!user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        const res = await prisma.userHealthItemSetting.upsert({
            where: {
                userId_itemName: {
                    userId: user.id,
                    itemName: itemName
                }
            },
            update: {
                ...settings
            },
            create: {
                userId: user.id,
                itemName,
                ...settings
            }
        });
        revalidatePath('/profile/items');
        revalidatePath('/trends');
        return { success: true, data: res };
    } catch (error) {
        console.error('Failed to update item setting:', error);
        return { success: false, error: 'Failed to update setting' };
    }
}

export async function getUniqueHealthItems() {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string } | undefined;
    if (!user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        // Fetch all health records for the user
        const records = await prisma.healthRecord.findMany({
            where: { userId: user.id },
            select: { data: true }
        });

        // Extract unique item names
        const itemNames = new Set<string>();

        records.forEach(record => {
            const data = record.data as any;
            // Handle both legacy (array) and new (object with results array) formats
            const results = Array.isArray(data) ? data : (data.results || []);

            if (Array.isArray(results)) {
                results.forEach((item: any) => {
                    if (item.item) {
                        itemNames.add(item.item);
                    }
                });
            }
        });

        return { success: true, data: Array.from(itemNames).sort() };
    } catch (error) {
        console.error('Failed to fetch unique items:', error);
        return { success: false, error: 'Failed to fetch items' };
    }
}
