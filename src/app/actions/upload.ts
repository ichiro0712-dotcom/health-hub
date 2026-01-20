'use server';

import { createClient } from '@supabase/supabase-js';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Server-side client with Service Role (Admin) access
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadImage(formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, error: "No file provided" };
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error } = await supabaseAdmin.storage
            .from('health-records')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error("Supabase Upload Error:", error);
            return { success: false, error: error.message };
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('health-records')
            .getPublicUrl(filePath);

        return { success: true, url: publicUrl };
    } catch (error) {
        console.error("Upload Action Error:", error);
        return { success: false, error: "Upload failed" };
    }
}
