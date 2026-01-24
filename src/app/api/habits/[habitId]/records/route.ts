import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/habits/[habitId]/records - 習慣記録を作成/更新
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ habitId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { habitId } = await params;
        const { date, value } = await request.json();

        // 習慣の所有権を確認
        const habit = await prisma.habit.findFirst({
            where: { id: habitId, userId: user.id },
        });

        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        // バリデーション
        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        const recordDate = new Date(date);
        if (isNaN(recordDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // Yes/Noタイプの場合、valueは1または0
        if (habit.type === 'yes_no' && value !== undefined && value !== 0 && value !== 1) {
            return NextResponse.json({ error: 'Value must be 0 or 1 for yes_no type' }, { status: 400 });
        }

        // 記録を作成/更新 (upsert)
        const record = await prisma.habitRecord.upsert({
            where: {
                habitId_date: {
                    habitId,
                    date: recordDate,
                },
            },
            create: {
                habitId,
                userId: user.id,
                date: recordDate,
                value: value ?? null,
            },
            update: {
                value: value ?? null,
            },
        });

        return NextResponse.json({ record });
    } catch (error) {
        console.error('Error creating/updating habit record:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/habits/[habitId]/records?date=YYYY-MM-DD - 習慣記録を削除
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ habitId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { habitId } = await params;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        if (!dateParam) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const recordDate = new Date(dateParam);
        if (isNaN(recordDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // 習慣の所有権を確認
        const habit = await prisma.habit.findFirst({
            where: { id: habitId, userId: user.id },
        });

        if (!habit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        // 記録を削除
        await prisma.habitRecord.delete({
            where: {
                habitId_date: {
                    habitId,
                    date: recordDate,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting habit record:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
