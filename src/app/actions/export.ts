'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function exportToNotebookML() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            healthRecords: true,
            fitData: true
        }
    });

    if (!user) {
        return { success: false, error: "User not found" };
    }

    // Generate Markdown
    let markdown = `# Health Data Export for ${user.name}\n\n`;

    // 1. Health Records (OCR)
    markdown += `## Health Check Reports\n\n`;
    user.healthRecords.forEach((record) => {
        markdown += `### Report Date: ${record.date.toISOString().split('T')[0]}\n`;
        const data: any = record.data; // Array of items
        if (Array.isArray(data)) {
            markdown += `| Category | Item | Value | Unit | Status |\n`;
            markdown += `|---|---|---|---|---|\n`;
            data.forEach((item: any) => {
                markdown += `| ${item.category || '-'} | ${item.item} | ${item.value} | ${item.unit || '-'} | ${item.isAbnormal ? 'Abnormal' : 'Normal'} |\n`;
            });
        }
        markdown += `\n`;
    });

    // 2. Fit Data
    markdown += `## Daily Fitness Logs (Google Fit)\n\n`;
    markdown += `| Date | Steps | Heart Rate | Weight |\n`;
    markdown += `|---|---|---|---|\n`;
    user.fitData.forEach((fit) => {
        markdown += `| ${fit.date.toISOString().split('T')[0]} | ${fit.steps || '-'} | ${fit.heartRate || '-'} | ${fit.weight || '-'} |\n`;
    });

    return { success: true, markdown };
}
