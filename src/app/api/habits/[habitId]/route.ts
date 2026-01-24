import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PUT /api/habits/[habitId] - 習慣を更新
export async function PUT(
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
        const { name, type, unit, color } = await request.json();

        // 習慣の所有権を確認
        const existingHabit = await prisma.habit.findFirst({
            where: { id: habitId, userId: user.id },
        });

        if (!existingHabit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        const habit = await prisma.habit.update({
            where: { id: habitId },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(unit !== undefined && { unit }),
                ...(color && { color }),
            },
        });

        return NextResponse.json({ habit });
    } catch (error) {
        console.error('Error updating habit:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/habits/[habitId] - 習慣を削除
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

        // 習慣の所有権を確認
        const existingHabit = await prisma.habit.findFirst({
            where: { id: habitId, userId: user.id },
        });

        if (!existingHabit) {
            return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
        }

        // 関連する記録も一緒に削除される (Cascade)
        await prisma.habit.delete({
            where: { id: habitId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting habit:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
