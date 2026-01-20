import Header from "@/components/Header";
import ReportClient from "./ReportClient";

export default function AdvisorPage() {
    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <ReportClient />
        </div>
    );
}
