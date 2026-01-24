import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HABITS_DATA = [
    // サプリ・健康食品系（赤系）
    { name: 'サプリ薬', type: 'yes_no', unit: null, color: '#EF4444' },
    { name: 'フルーツと発酵食品', type: 'yes_no', unit: null, color: '#F87171' },
    { name: 'オリーブオイル', type: 'yes_no', unit: null, color: '#DC2626' },
    { name: '納豆', type: 'yes_no', unit: null, color: '#B91C1C' },

    // 運動系（緑系）
    { name: 'スクワット', type: 'numeric', unit: '回', color: '#10B981' },
    { name: '休肝日', type: 'yes_no', unit: null, color: '#34D399' },
    { name: '7時間以上睡眠', type: 'yes_no', unit: null, color: '#059669' },
    { name: '14時間断食', type: 'yes_no', unit: null, color: '#047857' },

    // メンタル・習慣系（紫・ピンク系）
    { name: '禁煙、減煙', type: 'yes_no', unit: null, color: '#8B5CF6' },
    { name: '汗かく運動', type: 'yes_no', unit: null, color: '#EC4899' },

    // 学習・趣味系（青系）
    { name: 'ドラム', type: 'numeric', unit: '時間', color: '#3B82F6' },
    { name: 'クリエイティブ', type: 'numeric', unit: '時間', color: '#60A5FA' },
    { name: 'プログラミング勉強', type: 'numeric', unit: '時間', color: '#2563EB' },
    { name: 'AIツール勉強', type: 'numeric', unit: '時間', color: '#1D4ED8' },
];

async function main() {
    console.log('習慣データをシードしています...');

    // 最初のユーザーを取得（テスト用）
    const users = await prisma.user.findMany({ take: 1 });

    if (users.length === 0) {
        console.error('ユーザーが見つかりません。先にユーザーを作成してください。');
        return;
    }

    const user = users[0];
    console.log(`ユーザー: ${user.email} (ID: ${user.id})`);

    // 既存の習慣を削除
    await prisma.habit.deleteMany({
        where: { userId: user.id }
    });

    // 新しい習慣を作成
    for (let i = 0; i < HABITS_DATA.length; i++) {
        const habit = HABITS_DATA[i];
        await prisma.habit.create({
            data: {
                userId: user.id,
                name: habit.name,
                type: habit.type as 'yes_no' | 'numeric',
                unit: habit.unit,
                color: habit.color,
                order: i,
            },
        });
        console.log(`✓ ${habit.name} を作成しました`);
    }

    console.log(`\n${HABITS_DATA.length}個の習慣を作成しました！`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
