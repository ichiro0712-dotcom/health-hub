import { getSupplements } from '@/app/actions/supplements';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import ClientDebugControls from './ClientDebugControls';

export default async function DebugSupplementsPage() {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    let dbUser = null;
    if (userEmail) {
        dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
    }

    const res = await getSupplements();
    const totalSupplements = await prisma.supplement.count();
    const userSupplementsCount = dbUser ? await prisma.supplement.count({ where: { userId: dbUser.id } }) : 0;

    // Check recent supplements
    const recentSupplements = await prisma.supplement.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } } // Include user email to verify ownership
    });

    return (
        <div className="p-8 bg-slate-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug Supplements</h1>

            <ClientDebugControls />


            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-white rounded shadow">
                    <h2 className="font-bold">Session / User</h2>
                    <div className="text-xs">
                        <p><strong>Session Email:</strong> {userEmail}</p>
                        <p><strong>DB User ID:</strong> {dbUser?.id}</p>
                        <p><strong>Total Supplements in DB:</strong> {totalSupplements}</p>
                        <p><strong>User Supplements Count:</strong> {userSupplementsCount}</p>
                    </div>
                </div>
                <div className="p-4 bg-white rounded shadow">
                    <h2 className="font-bold">Recent DB Entries (Any User)</h2>
                    <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(recentSupplements, null, 2)}</pre>
                </div>
            </div>

            <div className="p-4 bg-white rounded shadow">
                <h2 className="font-bold">getSupplements Result</h2>
                <pre className="text-xs overflow-auto">{JSON.stringify(res, null, 2)}</pre>
            </div>
        </div>
    );
}
