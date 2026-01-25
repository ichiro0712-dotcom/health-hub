/**
 * 本番環境のAPIを通じて習慣データをシードするスクリプト
 * 使い方: npx tsx scripts/seed-habits-via-api.ts <production-url> <session-token>
 */

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
    const baseUrl = process.argv[2] || 'https://health-hub-eight.vercel.app';
    const sessionToken = process.argv[3];

    if (!sessionToken) {
        console.error('使い方: npx tsx scripts/seed-habits-via-api.ts <production-url> <session-token>');
        console.error('');
        console.error('セッショントークンは、本番環境でログイン後にブラウザの開発者ツールから');
        console.error('Cookieの"next-auth.session-token"の値を取得してください。');
        process.exit(1);
    }

    console.log(`本番環境に習慣データをシードしています... (${baseUrl})`);
    console.log('');

    // まず既存の習慣を取得
    console.log('既存の習慣を取得中...');
    const getResponse = await fetch(`${baseUrl}/api/habits`, {
        headers: {
            'Cookie': `next-auth.session-token=${sessionToken}`,
        },
    });

    if (!getResponse.ok) {
        console.error('習慣の取得に失敗しました:', await getResponse.text());
        process.exit(1);
    }

    const existingHabits = await getResponse.json();
    console.log(`既存の習慣: ${existingHabits.length}個`);

    // 既存の習慣を削除
    if (existingHabits.length > 0) {
        console.log('既存の習慣を削除中...');
        for (const habit of existingHabits) {
            const deleteResponse = await fetch(`${baseUrl}/api/habits/${habit.id}`, {
                method: 'DELETE',
                headers: {
                    'Cookie': `next-auth.session-token=${sessionToken}`,
                },
            });

            if (!deleteResponse.ok) {
                console.error(`習慣の削除に失敗しました (${habit.name}):`, await deleteResponse.text());
            } else {
                console.log(`✓ ${habit.name} を削除しました`);
            }
        }
    }

    console.log('');
    console.log('新しい習慣を作成中...');

    // 新しい習慣を作成
    let successCount = 0;
    for (let i = 0; i < HABITS_DATA.length; i++) {
        const habit = HABITS_DATA[i];
        const response = await fetch(`${baseUrl}/api/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `next-auth.session-token=${sessionToken}`,
            },
            body: JSON.stringify({
                name: habit.name,
                type: habit.type,
                unit: habit.unit,
                color: habit.color,
                order: i,
            }),
        });

        if (!response.ok) {
            console.error(`✗ ${habit.name} の作成に失敗しました:`, await response.text());
        } else {
            successCount++;
            console.log(`✓ ${habit.name} を作成しました`);
        }
    }

    console.log('');
    console.log(`${successCount}/${HABITS_DATA.length}個の習慣を作成しました！`);
}

main().catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
});
