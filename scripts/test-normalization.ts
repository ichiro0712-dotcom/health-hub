import { normalizeItemName } from '../src/app/actions/items';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- Starting Normalization Test ---");

    const testCases = [
        { input: "AST", expected: "ast" },
        { input: "ＧＯＴ", expected: "ast" }, // Full-width Check (synonym)
        { input: "got", expected: "ast" }, // Case insensitivity
        { input: "Triglyceride", expected: "triglyceride" },
        { input: "TG", expected: "triglyceride" },
        { input: "LDL-C", expected: "ldl_cholesterol" },
        { input: "悪玉コレステロール", expected: "ldl_cholesterol" },
        { input: "RandomString123", expected: null }, // Should be null
    ];

    let passed = 0;

    for (const test of testCases) {
        const result = await normalizeItemName(test.input);
        const code = result?.code || null;

        if (code === test.expected) {
            console.log(`[PASS] Input: "${test.input}" -> Code: ${code}`);
            passed++;
        } else {
            console.error(`[FAIL] Input: "${test.input}" -> Expected: ${test.expected}, Got: ${code}`);
        }
    }

    console.log(`--- Test Complete: ${passed}/${testCases.length} Passed ---`);
    if (passed === testCases.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runTest()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
