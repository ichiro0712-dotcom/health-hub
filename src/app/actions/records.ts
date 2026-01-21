'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { syncRecordsToGoogleDocs } from "@/lib/google-docs";

const prisma = new PrismaClient();

// Google Docsに記録を同期するヘルパー関数
async function syncRecordsInBackground(userEmail: string) {
    try {
        const records = await prisma.healthRecord.findMany({
            where: {
                user: { email: userEmail }
            },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                title: true,
                summary: true,
                data: true,
                additional_data: true
            }
        });
        await syncRecordsToGoogleDocs(records);
    } catch (err) {
        console.error('Google Docs sync failed:', err);
    }
}

export async function getRecords() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        const records = await prisma.healthRecord.findMany({
            where: {
                user: { email: session.user.email }
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: records };
    } catch (error) {
        console.error("Get Records Error:", error);
        return { success: false, error: "Failed to fetch records" };
    }
}

export async function getRecord(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        const record = await prisma.healthRecord.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!record || record.user.email !== session.user.email) {
            return { success: false, error: "Not found" };
        }

        return { success: true, data: record };
    } catch (error) {
        console.error("Get Record Error:", error);
        return { success: false, error: "Failed to fetch record" };
    }
}

export async function deleteRecord(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        // Verify ownership
        const record = await prisma.healthRecord.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!record || record.user.email !== session.user.email) {
            return { success: false, error: "Not found or unauthorized" };
        }

        await prisma.healthRecord.delete({ where: { id } });

        // Google Docsに自動同期（バックグラウンド）
        syncRecordsInBackground(session.user.email);

        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete" };
    }
}

export async function updateRecord(id: string, data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    try {
        // Verify ownership
        const record = await prisma.healthRecord.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!record || record.user.email !== session.user.email) {
            return { success: false, error: "Not found or unauthorized" };
        }


        await prisma.healthRecord.update({
            where: { id },
            data: {
                date: new Date(data.date),
                title: data.title, // Add title
                summary: data.summary, // Add summary
                data: { results: data.results },
                additional_data: data.meta,
                images: data.images // Add images support
            }
        });
        revalidatePath('/records');
        revalidatePath(`/records/${id}`);

        // Google Docsに自動同期（バックグラウンド）
        syncRecordsInBackground(session.user.email);

        return { success: true };
    } catch (error) {
        return { success: false, error: "Update failed" };
    }
}
