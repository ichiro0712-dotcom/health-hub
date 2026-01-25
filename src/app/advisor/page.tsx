import Header from "@/components/Header";
import ReportClient from "./ReportClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdvisorPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect('/');
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <ReportClient userEmail={session.user.email} />
        </div>
    );
}
