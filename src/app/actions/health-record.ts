'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeItemName, getStandardizedItemName } from "./items";
import { syncRecordsToGoogleDocs } from "@/lib/google-docs";

// const prisma = new PrismaClient(); // Removed local instance

interface HealthRecordInput {
    date: string;
    title?: string;
    summary?: string; // Add summary field
    results: any[];
    meta?: any;
    images?: string[]; // Base64 strings
}

export async function saveHealthRecord(data: HealthRecordInput) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { success: false, error: "Unauthorized" };
    }

    // Ensure user exists, create if not (auto-registration for saving data)
    const user = await prisma.user.upsert({
        where: { email: session.user.email },
        update: {},
        create: {
            email: session.user.email,
            name: session.user.name || "User",
            image: session.user.image
        }
    });

    try {
        // 0. Process & Normalize Items - CRITICAL: Apply normalization BEFORE saving
        const results = data.results || [];
        const normalizedResults = [];

        for (const res of results) {
            const rawItemName = res.item?.trim();
            if (!rawItemName) continue;

            // CRITICAL: Normalize the item name to standard format
            const standardizedName = await getStandardizedItemName(rawItemName);

            // Create a normalized copy of the result
            const normalizedRes = { ...res, item: standardizedName };
            normalizedResults.push(normalizedRes);

            // Check if user already has this item (using standardized name)
            const existingItem = await prisma.inspectionItem.findUnique({
                where: { userId_name: { userId: user.id, name: standardizedName } }
            });

            if (!existingItem) {
                // Try to normalize against Master Data
                const master = await normalizeItemName(standardizedName);

                await prisma.inspectionItem.create({
                    data: {
                        userId: user.id,
                        name: standardizedName,  // Use standardized name
                        masterItemCode: master?.code
                    }
                });

                // If the raw name differs from standardized, create an alias
                if (rawItemName !== standardizedName) {
                    const newItem = await prisma.inspectionItem.findUnique({
                        where: { userId_name: { userId: user.id, name: standardizedName } }
                    });
                    if (newItem) {
                        // Check if alias already exists
                        const existingAlias = await prisma.inspectionItemAlias.findFirst({
                            where: { originalName: rawItemName, item: { userId: user.id } }
                        });
                        if (!existingAlias) {
                            await prisma.inspectionItemAlias.create({
                                data: {
                                    inspectionItemId: newItem.id,
                                    originalName: rawItemName
                                }
                            });
                        }
                    }
                }
            } else if (!existingItem.masterItemCode) {
                // Try to backfill master link if missing
                const master = await normalizeItemName(standardizedName);
                if (master) {
                    await prisma.inspectionItem.update({
                        where: { id: existingItem.id },
                        data: { masterItemCode: master.code }
                    });
                }
            }
        }

        await prisma.healthRecord.create({
            data: {
                userId: user.id,
                date: new Date(data.date || Date.now()),
                title: data.title,
                summary: data.summary,
                status: "verified",
                data: { results: normalizedResults },  // Use normalized results
                additional_data: data.meta || {},
                images: data.images || []
            }
        });

        // Google Docsに自動同期（バックグラウンドで実行、エラーは無視）
        prisma.healthRecord.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            select: { id: true, date: true, title: true, summary: true, data: true, additional_data: true }
        }).then(records => {
            syncRecordsToGoogleDocs(records).catch(err => {
                console.error('Google Docs sync failed:', err);
            });
        });

        return { success: true };

    } catch (error) {
        console.error("Save Record Error:", error);
        // Debug logging
        try {
            const fs = require('fs');
            fs.writeFileSync('debug_error.log', `Error at ${new Date().toISOString()}:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}\n\n`, { flag: 'a' });
        } catch (e) { console.error("Log failed", e); }

        return { success: false, error: `保存エラー: ${error instanceof Error ? error.message : "不明なエラー"}` };
    }
}
