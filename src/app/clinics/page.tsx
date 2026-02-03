import Header from "@/components/Header";
import ClinicsClient from "./ClinicsClient";

export default function ClinicsPage() {
    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <ClinicsClient />
        </div>
    );
}
