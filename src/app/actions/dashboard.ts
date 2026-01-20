'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { DashboardResponse } from "@/types/dashboard";

const prisma = new PrismaClient();

export async function getDashboardData(): Promise<DashboardResponse> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        return { success: false, error: "User not found" };
    }

    try {
        // 1. Fetch Fit Data (Last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const fitData = await prisma.fitData.findMany({
            where: {
                userId: user.id,
                date: { gte: thirtyDaysAgo }
            },
            orderBy: { date: 'asc' }
        });

        // 2. Fetch Health Records (Verified, e.g. last 5 records)
        const healthRecords = await prisma.healthRecord.findMany({
            where: {
                userId: user.id,
                status: 'verified' // Only show verified data
            },
            orderBy: { date: 'asc' },
            take: 5
        });

        // Format data for Chart.js
        // We want to return structure like:
        // { fit: { labels: [], steps: [], heartRate: [] }, records: [...] }

        // Fit Data format
        const fitLabels = fitData.map((d: any) => d.date.toISOString().split('T')[0]); // YYYY-MM-DD
        const stepsData = fitData.map((d: any) => d.steps || 0);
        const heartRateData = fitData.map((d: any) => d.heartRate || null);
        const weightData = fitData.map((d: any) => d.weight || null);

        return {
            success: true,
            data: {
                fit: {
                    labels: fitLabels,
                    datasets: [
                        {
                            label: 'Steps',
                            data: stepsData,
                            borderColor: 'rgb(53, 162, 235)',
                            backgroundColor: 'rgba(53, 162, 235, 0.5)',
                            yAxisID: 'y',
                        },
                        {
                            label: 'Heart Rate',
                            data: heartRateData,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            yAxisID: 'y1',
                        }
                    ]
                },
                records: healthRecords
            }
        };

        // 3. Process Health Records for Trends (e.g., Weight, BMI if available)
        // We fetch ALL verified records for the chart, not just the last 5
        const allRecords = await prisma.healthRecord.findMany({
            where: {
                userId: user?.id,
                status: 'verified'
            },
            orderBy: { date: 'asc' }
        });

        // Helper to extract value by matching item name
        const extractValue = (record: any, keywords: string[]) => {
            let results: any[] = [];
            const d = record.data;
            if (Array.isArray(d)) {
                results = d;
            } else if (d?.results && Array.isArray(d.results)) {
                results = d.results;
            }

            if (!results.length) return null;

            const item = results.find((r: any) =>
                keywords.some(k => r.item && r.item.toLowerCase().includes(k.toLowerCase()))
            );
            return item ? parseFloat(item.value) : null;
        };

        const recordLabels = allRecords.map((r: any) => r.date.toISOString().split('T')[0]);
        const recordWeight = allRecords.map((r: any) => extractValue(r, ['weight', '体重']));
        const recordBmi = allRecords.map((r: any) => extractValue(r, ['bmi', 'body mass index']));

        // Merge into the return data
        // We might want to unify labels if we want to show Fit and Records on the same X-axis, 
        // but for now let's pass them as a separate "healthTrends" object to be flexible.
        return {
            success: true,
            data: {
                fit: {
                    labels: fitLabels,
                    datasets: [
                        {
                            label: 'Steps',
                            data: stepsData,
                            borderColor: 'rgb(53, 162, 235)',
                            backgroundColor: 'rgba(53, 162, 235, 0.5)',
                            yAxisID: 'y',
                        },
                        {
                            label: 'Heart Rate',
                            data: heartRateData,
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            yAxisID: 'y1',
                        },
                        {
                            label: 'Weight (Fit)',
                            data: weightData,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.5)',
                            yAxisID: 'y1',
                            hidden: true
                        }
                    ]
                },
                records: healthRecords,
                trends: {
                    labels: recordLabels,
                    datasets: [
                        {
                            label: 'Weight (Checkup)',
                            data: recordWeight,
                            borderColor: 'rgb(153, 102, 255)',
                            backgroundColor: 'rgba(153, 102, 255, 0.5)',
                            yAxisID: 'y1',
                        },
                        {
                            label: 'BMI',
                            data: recordBmi,
                            borderColor: 'rgb(255, 159, 64)',
                            backgroundColor: 'rgba(255, 159, 64, 0.5)',
                            yAxisID: 'y1', // Reuse y1 (metrics) or y
                        }
                    ]
                }
            }
        };

    } catch (error) {
        console.error("Dashboard Data Error:", error);
        return { success: false, error: "Failed to fetch data" };
    }
}
