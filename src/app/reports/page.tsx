import Header from "@/components/Header";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <ReportsClient />
        </div>
    );
}
