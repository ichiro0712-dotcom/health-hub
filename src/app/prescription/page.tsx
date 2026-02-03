import Header from "@/components/Header";
import PrescriptionClient from "./PrescriptionClient";

export default function PrescriptionPage() {
    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />
            <PrescriptionClient />
        </div>
    );
}
