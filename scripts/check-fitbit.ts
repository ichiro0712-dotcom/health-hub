import prisma from '../src/lib/prisma';

async function main() {
  const accounts = await prisma.fitbitAccount.findMany();
  console.log("FitbitAccount count:", accounts.length);
  for (const acc of accounts) {
    console.log({
      fitbitUserId: acc.fitbitUserId,
      expiresAt: acc.expiresAt,
      scopePreview: acc.scope?.substring(0, 80),
      hasValidToken: acc.accessToken && acc.accessToken !== "pending" ? "YES" : "NO (pending)",
      tokenLength: acc.accessToken?.length
    });
  }
}

main().finally(() => prisma.$disconnect());
