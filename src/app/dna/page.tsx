import Header from "@/components/Header";
import DNAClient from "./DNAClient";

export default function DNAPage() {
    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <DNAClient />
        </div>
    );
}
