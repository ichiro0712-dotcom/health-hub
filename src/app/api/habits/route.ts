import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/habits - すべての習慣を取得
export async function GET(request: NextRequest) {
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

        const habits = await prisma.habit.findMany({
            where: { userId: user.id },
            orderBy: { order: 'asc' },
            include: {
                records: {
                    orderBy: { date: 'desc' },
                    take: 30, // 最近30日分
                },
            },
        });

        return NextResponse.json({ habits });
    } catch (error) {
        console.error('Error fetching habits:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/habits - 新しい習慣を作成
export async function POST(request: NextRequest) {
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

        const { name, type, unit, color } = await request.json();

        // バリデーション
        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
        }

        if (type !== 'yes_no' && type !== 'numeric') {
            return NextResponse.json({ error: 'Invalid type. Must be yes_no or numeric' }, { status: 400 });
        }

        if (type === 'numeric' && !unit) {
            return NextResponse.json({ error: 'Unit is required for numeric type' }, { status: 400 });
        }

        // 最大orderを取得して+1
        const maxOrderHabit = await prisma.habit.findFirst({
            where: { userId: user.id },
            orderBy: { order: 'desc' },
        });

        const newOrder = maxOrderHabit ? maxOrderHabit.order + 1 : 0;

        const habit = await prisma.habit.create({
            data: {
                userId: user.id,
                name,
                type,
                unit: unit || null,
                color: color || '#3B82F6',
                order: newOrder,
            },
        });

        return NextResponse.json({ habit }, { status: 201 });
    } catch (error) {
        console.error('Error creating habit:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/habits - 習慣の順序を更新
export async function PATCH(request: NextRequest) {
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

        const { habitIds } = await request.json(); // 新しい順序の配列

        if (!Array.isArray(habitIds)) {
            return NextResponse.json({ error: 'habitIds must be an array' }, { status: 400 });
        }

        // トランザクションで全習慣の順序を更新
        await prisma.$transaction(
            habitIds.map((habitId: string, index: number) =>
                prisma.habit.update({
                    where: { id: habitId, userId: user.id },
                    data: { order: index },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating habit order:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
