import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Adjust path if necessary
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        // 1. Authentication Check
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // 2. Parse Body
        const body = await req.json();
        const { date, data } = body;

        if (!date || !data) {
            return NextResponse.json({ success: false, error: "Missing required fields: date, data" }, { status: 400 });
        }

        // Validate types
        const steps = typeof data.steps === 'number' ? data.steps : undefined;
        const heartRate = typeof data.heartRate === 'number' ? data.heartRate : undefined;
        const weight = typeof data.weight === 'number' ? data.weight : undefined;
        const distance = typeof data.distance === 'number' ? data.distance : undefined;
        const calories = typeof data.calories === 'number' ? data.calories : undefined;
        const sleepMinutes = typeof data.sleepMinutes === 'number' ? data.sleepMinutes : undefined;
        const sleepData = data.sleepData || undefined;
        const vitals = data.vitals || undefined;
        const workouts = data.workouts || undefined;

        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return NextResponse.json({ success: false, error: "Invalid date format" }, { status: 400 });
        }

        // 3. Upsert Data
        const updatedRecord = await prisma.fitData.upsert({
            where: {
                userId_date: {
                    userId: user.id,
                    date: dateObj,
                }
            },
            update: {
                steps,
                heartRate,
                weight,
                distance,
                calories,
                sleepMinutes,
                sleepData: sleepData ? sleepData : undefined,
                vitals: vitals ? vitals : undefined,
                workouts: workouts ? workouts : undefined,
                syncedAt: new Date(),
            },
            create: {
                userId: user.id,
                date: dateObj,
                steps,
                heartRate,
                weight,
                distance,
                calories,
                sleepMinutes,
                sleepData: sleepData ? sleepData : undefined,
                vitals: vitals ? vitals : undefined,
                workouts: workouts ? workouts : undefined,
                syncedAt: new Date(),
            }
        });

        return NextResponse.json({
            success: true,
            message: "Synced successfully",
            syncedAt: updatedRecord.syncedAt
        });

    } catch (error) {
        console.error("Health Connect Sync Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
