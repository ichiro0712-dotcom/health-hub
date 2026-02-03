import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { VideoSection } from "@/components/home/VideoSection";

export default async function VideosPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    return (
        <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-900">
            <Header />
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
                <VideoSection />
            </div>
        </main>
    );
}
