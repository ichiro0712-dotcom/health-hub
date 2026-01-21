import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import GoogleDocsSettingsClient from "./GoogleDocsSettingsClient";
import { getGoogleDocsSettings } from "@/app/actions/google-docs-settings";

export const dynamic = 'force-dynamic';

export default async function GoogleDocsSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/");
    }

    const { data: settings } = await getGoogleDocsSettings();

    return <GoogleDocsSettingsClient initialSettings={settings} />;
}
