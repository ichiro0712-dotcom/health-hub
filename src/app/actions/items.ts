'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 型定義
export interface UniqueItem {
    id: number;
    name: string;
    count: number;
    isMerged?: boolean;
}

export interface MergeHistory {
    id: string;
    date: Date;
    description: string;
    canUndo: boolean;
}

interface HealthCheckResult {
    item?: string;
    name?: string;
    value?: string | number;
    unit?: string;
    referenceRange?: string;
    evaluation?: string;
}

interface HealthRecordData {
    results?: HealthCheckResult[];
}

interface MergeHistoryDetails {
    victimName: string;
}

// Helper to get authenticated user ID
async function getUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (userEmail) {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true }
        });
        if (user) return user.id;
    }

    // session.user.id が存在する場合のみ返す
    const userId = session?.user?.id;
    return typeof userId === 'string' ? userId : null;
}

/**
 * Returns a map of "Original Name" -> "Display Name" based on Aliases
 */
export async function getItemMappings(): Promise<Record<string, string>> {
    const userId = await getUserId();
    if (!userId) return {};

    const aliases = await prisma.inspectionItemAlias.findMany({
        where: { item: { userId } },
        include: { item: true }
    });

    const map: Record<string, string> = {};
    aliases.forEach(a => {
        map[a.originalName] = a.item.name;
    });
    return map;
}

export async function getUniqueItems(): Promise<{ success: boolean; data?: UniqueItem[]; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // 1. Load Mappings
        const mapping = await getItemMappings();

        // 2. Load Records
        const records = await prisma.healthRecord.findMany({
            where: { userId: userId },
            select: { data: true }
        });

        const itemCounts: Record<string, number> = {};

        // 3. Count items (applying mapping)
        records.forEach(record => {
            const data = record.data as HealthRecordData | HealthCheckResult[];
            let results: HealthCheckResult[] = [];
            if (Array.isArray(data)) {
                results = data;
            } else if (data?.results && Array.isArray(data.results)) {
                results = data.results;
            }

            results.forEach((r: HealthCheckResult) => {
                const rawName = (r.item || r.name)?.trim();
                if (rawName) {
                    // Apply Virtual Mapping here!
                    const displayName = mapping[rawName] || rawName;
                    itemCounts[displayName] = (itemCounts[displayName] || 0) + 1;
                }
            });
        });

        // 4. Load IDs/Order from Settings (Optional)
        // For simple consistent ordering:
        const items: UniqueItem[] = Object.entries(itemCounts)
            .map(([name, count], index) => ({
                id: index + 1,
                name,
                count,
                isMerged: Object.values(mapping).includes(name)
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
            .map((item, index) => ({ ...item, id: index + 1 }));

        return { success: true, data: items };

    } catch (error) {
        console.error('Failed to fetch unique items:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Helper to convert full-width alphanumeric characters to half-width.
 */
function toHalfWidth(str: string) {
    return str.replace(/[！-～]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    }).replace(/　/g, " ");
}

/**
 * Extracts potential Japanese name from mixed format strings
 * e.g., "HDL Cholesterol (HDLコレステロール)" -> "HDLコレステロール"
 * e.g., "WBC (白血球数)" -> "白血球数"
 */
function extractJapaneseName(input: string): string[] {
    const candidates: string[] = [input];

    // Pattern 1: Extract from parentheses (日本語)
    const parenMatch = input.match(/[(（]([^)）]+)[)）]/);
    if (parenMatch && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(parenMatch[1])) {
        candidates.push(parenMatch[1].trim());
    }

    // Pattern 2: Extract Japanese portion if mixed with English
    const japaneseOnly = input.replace(/[a-zA-Z0-9\s\-()（）]/g, '').trim();
    if (japaneseOnly.length > 0) {
        candidates.push(japaneseOnly);
    }

    // Pattern 3: Remove common English prefixes/suffixes
    const withoutEnglish = input
        .replace(/^(Total|Fasting|Serum|Blood|Plasma)\s*/i, '')
        .replace(/\s*(Level|Count|Rate|Value)$/i, '')
        .trim();
    if (withoutEnglish !== input) {
        candidates.push(withoutEnglish);
    }

    return [...new Set(candidates)]; // Remove duplicates
}

/**
 * Normalizes an item name against the MasterItem DB.
 * Returns the Master Item if found, otherwise null.
 * Enhanced with fuzzy matching and Japanese name extraction.
 */
export async function normalizeItemName(inputName: string): Promise<{ code: string; standardName: string } | null> {
    if (!inputName) return null;

    const normalizedInput = toHalfWidth(inputName).trim();

    // Get all candidate names to search
    const candidates = extractJapaneseName(normalizedInput);

    // 1. Direct match with standardName or code?
    for (const candidate of candidates) {
        const directMatch = await prisma.masterItem.findFirst({
            where: {
                OR: [
                    { code: { equals: candidate, mode: 'insensitive' } },
                    { standardName: { equals: candidate, mode: 'insensitive' } },
                    // Check original, upper, and proper case in synonyms
                    { synonyms: { has: candidate } },
                    { synonyms: { has: candidate.toUpperCase() } },
                    { synonyms: { has: candidate.toLowerCase() } },
                ]
            }
        });

        if (directMatch) return { code: directMatch.code, standardName: directMatch.standardName };
    }

    // 2. Fuzzy match: Check if any synonym contains the input (partial match)
    const allMasterItems = await prisma.masterItem.findMany();
    for (const master of allMasterItems) {
        // Check if standardName is contained in input or vice versa
        if (normalizedInput.includes(master.standardName) ||
            master.standardName.includes(normalizedInput)) {
            return { code: master.code, standardName: master.standardName };
        }

        // Check synonyms for partial match
        for (const synonym of master.synonyms) {
            if (normalizedInput.includes(synonym) || synonym.includes(normalizedInput)) {
                return { code: master.code, standardName: master.standardName };
            }
        }
    }

    return null;
}

/**
 * Normalizes an item name and returns the standardized name.
 * If no master match found, returns the original name cleaned up.
 */
export async function getStandardizedItemName(inputName: string): Promise<string> {
    if (!inputName) return inputName;

    const normalizedInput = toHalfWidth(inputName).trim();

    // Try to find master item
    const master = await normalizeItemName(normalizedInput);
    if (master) {
        return master.standardName;
    }

    // If no master found, try to extract Japanese name as fallback
    const candidates = extractJapaneseName(normalizedInput);
    // Prefer the extracted Japanese name if available
    for (const candidate of candidates) {
        if (candidate !== normalizedInput && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(candidate)) {
            return candidate;
        }
    }

    return normalizedInput;
}

export async function mergeItems(pairs: { survivorId: number, victimId: number }[]): Promise<{ success: boolean; logs: string[]; error?: string }> {
    const logs: string[] = [];
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, logs, error: 'Unauthorized' };
        logs.push('[START] Starting Non-Destructive Merge (Virtual Alias).');

        // 1. Resolve Names from IDs (Need to fetch current list to map IDs -> Names)
        const currentItemsRes = await getUniqueItems();
        if (!currentItemsRes.data) throw new Error("Failed to fetch items context");
        const itemsMap = new Map<number, string>();
        currentItemsRes.data.forEach(i => itemsMap.set(i.id, i.name));

        for (const pair of pairs) {
            const survivorName = itemsMap.get(pair.survivorId);
            const victimName = itemsMap.get(pair.victimId);

            if (!survivorName || !victimName || survivorName === victimName) continue;

            logs.push(`[PROCESS] Mapping '${victimName}' -> '${survivorName}'`);

            // 2. Find or Create Survivor Item
            // Ensure Survivor adheres to Master Data if applicable
            let survivorItem = await prisma.inspectionItem.findUnique({
                where: { userId_name: { userId, name: survivorName } }
            });

            if (!survivorItem) {
                // Check master data coverage
                const master = await normalizeItemName(survivorName);
                survivorItem = await prisma.inspectionItem.create({
                    data: {
                        userId,
                        name: survivorName,
                        masterItemCode: master?.code
                    }
                });
                logs.push(`  -> Created Master Item: ${survivorName} ${master ? '[Linked to Master: ' + master.standardName + ']' : ''}`);
            } else if (!survivorItem.masterItemCode) {
                // Try to link existing item to master if not already linked
                const master = await normalizeItemName(survivorName);
                if (master) {
                    await prisma.inspectionItem.update({
                        where: { id: survivorItem.id },
                        data: { masterItemCode: master.code }
                    });
                    logs.push(`  -> Upgraded existing item '${survivorName}' to Master Linked Item: ${master.standardName}`);
                }
            }

            // 3. Create/Update Aliases (The "Merge")

            // A. Re-point existing aliases that point to "victimName" (if victimName was already a display name for others)
            // Note: In this virtual system, "victimName" passed from UI is a Display Name.
            // If it was a raw name, it has no alias yet (or alias to self).
            // If it was an aggregated name, it has aliases.

            // Find all aliases where the *current* target item name is "victimName"
            const victimsItem = await prisma.inspectionItem.findUnique({
                where: { userId_name: { userId, name: victimName } }
            });

            if (victimsItem) {
                const victimsAliases = await prisma.inspectionItemAlias.findMany({
                    where: { inspectionItemId: victimsItem.id }
                });

                if (victimsAliases.length > 0) {
                    // N+1クエリ問題修正: バッチ更新を使用
                    await prisma.inspectionItemAlias.updateMany({
                        where: { id: { in: victimsAliases.map(a => a.id) } },
                        data: { inspectionItemId: survivorItem.id }
                    });
                    victimsAliases.forEach(alias => {
                        logs.push(`  -> Re-pointed alias '${alias.originalName}' to '${survivorName}'`);
                    });
                }
            }

            // B. Create a new alias for the VictimName itself (treating it as a raw string source)
            // Check if there is an existing alias for this string
            const conflict = await prisma.inspectionItemAlias.findFirst({
                where: { originalName: victimName, item: { userId } }
            });

            if (conflict) {
                if (conflict.inspectionItemId !== survivorItem.id) {
                    await prisma.inspectionItemAlias.update({
                        where: { id: conflict.id },
                        data: { inspectionItemId: survivorItem.id }
                    });
                    logs.push(`  -> Updated mapping for '${victimName}'`);
                }
            } else {
                await prisma.inspectionItemAlias.create({
                    data: {
                        inspectionItemId: survivorItem.id,
                        originalName: victimName
                    }
                });
                logs.push(`  -> Created new mapping for '${victimName}'`);
            }

            // 4. Record History for Undo
            await prisma.inspectionItemHistory.create({
                data: {
                    inspectionItemId: survivorItem.id,
                    operationType: 'MERGE',
                    details: {
                        victimName: victimName,
                        // We store simpler info for now
                    },
                    undoCommand: JSON.stringify({
                        action: 'reset_alias_of_name',
                        name: victimName
                    })
                }
            });
        }

        logs.push('[COMPLETE] Merge process finished.');
        return { success: true, logs };

    } catch (error) {
        console.error('Merge failed:', error);
        return { success: false, logs, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

export async function getMergeHistory(): Promise<MergeHistory[]> {
    const userId = await getUserId();
    if (!userId) return [];

    const history = await prisma.inspectionItemHistory.findMany({
        where: { item: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { item: true }
    });

    return history.map(h => {
        const details = h.details as unknown as MergeHistoryDetails;
        return {
            id: h.id,
            date: h.createdAt,
            description: `Merged '${details?.victimName || 'unknown'}' into '${h.item.name}'`,
            canUndo: true
        };
    });
}

export async function undoMerge(historyId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const history = await prisma.inspectionItemHistory.findUnique({
            where: { id: historyId },
            include: { item: true }
        });

        if (!history) return { success: false, error: 'History not found' };

        const details = history.details as unknown as MergeHistoryDetails;
        const victimName = details?.victimName;

        if (victimName) {
            // Undo Logic: 
            // We want to stop aliasing "victimName" to the current item.
            // We find the alias for 'victimName' and delete it.
            // CAUTION: If we had re-pointed other aliases (multi-hop), this simple undo won't fix them all.
            // But for the primary use case (A -> B), deleting the alias A->B is correct.

            await prisma.inspectionItemAlias.deleteMany({
                where: {
                    item: { userId },
                    originalName: victimName
                }
            });

            // Also, if we re-pointed aliases OF victimName, we should theoretically move them back to victimName's item ID.
            // But if we deleted victimName's item (or never used it), that's tricky.
            // For now, assume single-level flattening is the main use case.
        }

        // Delete the history record
        await prisma.inspectionItemHistory.delete({
            where: { id: historyId }
        });

        return { success: true };

    } catch (error) {
        console.error('Undo failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}

export type ExportRow = {
    id: string; // Record ID
    date: string;
    itemName: string;
    value: string;
    unit?: string;
    refRange?: string;
};

export async function getExportData(mode: 'original' | 'integrated'): Promise<{ success: boolean; data?: ExportRow[]; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // 1. Load Mappings if needed
        const mapping = mode === 'integrated' ? await getItemMappings() : {};

        // 2. Load Records
        const records = await prisma.healthRecord.findMany({
            where: { userId },
            select: { id: true, date: true, data: true },
            orderBy: { date: 'desc' }
        });

        const rows: ExportRow[] = [];

        // 3. Flatten Data
        for (const record of records) {
            const data = record.data as HealthRecordData | HealthCheckResult[];
            let results: HealthCheckResult[] = [];

            if (Array.isArray(data)) {
                results = data;
            } else if (data?.results && Array.isArray(data.results)) {
                results = data.results;
            }

            for (const r of results) {
                let name = (r.item || r.name)?.trim();
                if (!name) continue;

                // Apply mapping if integrated mode
                if (mode === 'integrated' && mapping[name]) {
                    name = mapping[name];
                }

                rows.push({
                    id: record.id,
                    date: record.date.toISOString().split('T')[0],
                    itemName: name,
                    value: r.value?.toString() ?? '',
                    unit: r.unit ?? '',
                    refRange: r.referenceRange ?? ''
                });
            }
        }

        return { success: true, data: rows };

    } catch (error) {
        console.error('Export failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
}
