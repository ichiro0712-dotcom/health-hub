import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INITIAL_DATA = [
    {
        categoryId: 'basic_attributes',
        title: '1. 基本属性・バイオメトリクス',
        content: `■ 基本情報
血液型：
利き手・利き足：`,
        orderIndex: 1
    },
    {
        categoryId: 'genetics',
        title: '2. 遺伝・家族歴',
        content: `■ 第一親等（両親・兄弟姉妹）
父：胃がん、元ピロリ菌保持、糖尿病
母：乳がん
兄弟姉妹：弟（痛風）
■ 第二親等（祖父母）
父方：
母方：`,
        orderIndex: 2
    },
    {
        categoryId: 'medical_history',
        title: '3. 病歴・医療ステータス',
        content: `■ 既往歴（治療済み・過去のもの）
大きな疾患：30歳で痛風発症歴あり
手術歴：大腸ポリープ切除（2025年12月26日）、LASIK（28歳時）
感染症：ピロリ菌除菌済み

■ 現在の疾患・症状（治療中・経過観察）
慢性疾患：軽度の睡眠時無呼吸症候群、軽度の逆流性食道炎（2025年12月診断・問題なし）
局所症状：いぼ痔（複数あり・年数回悪化・排便時出血）
アレルギー：なし（薬剤、食物、環境すべてなし）
■ 予防医療
ワクチン接種歴：
定期検診受診状況：`,
        orderIndex: 3
    },
    {
        categoryId: 'physiology',
        title: '4. 生理機能・体質',
        content: `■ 循環器系
血圧傾向：低血圧傾向
血管の状態：血管が弱い、軽い動脈硬化傾向（過去に首の動脈プラークあり）
心機能：


■ 血液・代謝
尿酸値：高い（食事でコントロール中）
脂質代謝：総コレステロールが高い
糖代謝：血糖値スパイクに注意が必要（糖尿病家族歴あり）
血液一般：軽い貧血傾向
■ 消化器系（胃腸）
胃の状態：ストレスで胃痛が起きやすい
排便サイクル：3日に2回（便秘気味で2日に1回）、不調時は便が細い
便の性状：最初は硬く、出始めると蓋が取れたように柔らかい
ガス（おなら）：量・回数多い。半数は無臭、半数は臭い（たまに激臭）
■ 神経・感覚器
視覚：老眼進行、グレアあり（LASIK後遺症含む）
聴覚：
自律神経：
ホルモンバランス：男性ホルモン低め（自覚）`,
        orderIndex: 4
    },
    {
        categoryId: 'circadian',
        title: '5. 生活リズム',
        content: `■ 睡眠
クロノタイプ：完全な夜型定着
就寝時刻：AM 04:00頃
起床時刻：AM 11:00頃
睡眠時間：約7時間確保
睡眠の質：時差・仕事・飲酒により不規則になりがち、軽度の無呼吸あり
■ 日内変動
活動ピーク時間：
眠気のピーク：食後`,
        orderIndex: 5
    },
    {
        categoryId: 'diet_nutrition',
        title: '6. 食生活・栄養',
        content: `■ 食事スケジュール
サイクル：「14時間断食」に近いサイクル
朝食：なし（起床後食べない）※2026年からオリーブオイル1杯予定
1st Meal：12:00-13:00（プレランチ：ブルーベリー、ヨーグルト、いちご、ナッツ）
Lunch：13:00頃（1st Meal直後にしっかり食べる）
Dinner：20:00-21:00（メイン終了）
Midnight Snack：26:00-27:00（3日に1回、おにぎり・パスタ等）
■ 栄養摂取傾向
ポジティブな習慣：納豆（ほぼ毎日）、タンパク質・食物繊維・緑黄色野菜を意識
回避しているもの：白米、グルテン（玄米・オーツ・15穀米を選択）、揚げ物、動物性油
ネガティブな傾向：スープ好き（塩分過多）、辛いものを好む
■ 食事環境
自炊・外食比率：自炊 2 : Uber 4 : 外食 4`,
        orderIndex: 6
    },
    {
        categoryId: 'substances',
        title: '7. 嗜好品・サプリメント・薬',
        content: `■ アルコール
頻度：週4回程度
摂取量：平均 焼酎水割り10杯/回（多い時は＋テキーラ8杯）
対策：飲酒時ビタミンB1 50mg、深酒時はメトホルミン中止
■ タバコ・カフェイン
喫煙：1日1箱
コーヒー：週4-5回（コンビニの薄いペットボトルコーヒー）
■ 間食
内容：チョコ、クッキー、スナック菓子、アイス
頻度：週2-3回（ストレスや小腹満たし）
■ 処方薬
脂質異常症薬：スタチン（ピタバスタチンカルシウム錠1mg）
糖尿病薬（抗老化目的）：メトホルミン 250mg（朝夜）
■ サプリメント
朝：EPA＋DHA(1g)、VitD(25mcg)、VitK2(45mcg)、CoQ10(200mg)、VitC(500mg)
夜：マグネシウム(300-400mg)、VitC(500mg)`,
        orderIndex: 7
    },
    {
        categoryId: 'exercise',
        title: '8. 運動・身体活動',
        content: `■ 運動に対する方針
マインドセット：運動嫌い。過度な運動は「老化」と考え避ける
■ 運動習慣
定期的運動：ドラム（2日に1回、2時間程度）
高強度活動：SEX（週3回程度）
■ モニタリング
デバイス：Google Pixel Watch, Fitbit`,
        orderIndex: 8
    },
    {
        categoryId: 'mental',
        title: '9. メンタル・脳機能',
        content: `■ ストレス・特性
ストレス耐性：高い、客観視能力が高い、ストレスの切り離しが可能
ストレス反応パターン：胃腸 → 頭痛・肩こり → 皮膚 → 睡眠 の順に出現
■ 脳機能・パフォーマンス
集中力：ブレインフォグなし
覚醒度：日中の耐え難い眠気なし（食後除く）
痛み：頭痛ほぼなし（年1回程度）`,
        orderIndex: 9
    },
    {
        categoryId: 'beauty_hygiene',
        title: '10. 美容・衛生習慣',
        content: `■ スキンケア
顔：風呂上がりフェイスパック（週3回）、入浴後美容液・保湿クリーム
紫外線対策：完璧ではないが比較的ブロックする
■ 入浴・洗浄
入浴：湯船にほぼ毎日入る
洗体・洗顔：2日に1回（洗いすぎない方針）
洗髪：3日に1回
■ 口腔ケア
歯磨き：朝夜（2分ほど）
その他：就寝時マウスピース使用`,
        orderIndex: 10
    },
    {
        categoryId: 'environment',
        title: '11. 環境・社会・ライフスタイル',
        content: `■ 住環境
居住地域・環境：
空気質・騒音：
■ 労働環境
デスクワーク比率：
PC/スマホ使用時間：
■ 人間関係
パートナーシップ：
ソーシャルサポート：`,
        orderIndex: 11
    }
];

async function main() {
    // Get the first user (for development)
    const user = await prisma.user.findFirst();

    if (!user) {
        console.error('No user found in database');
        process.exit(1);
    }

    console.log(`Seeding health profile for user: ${user.email}`);

    for (const data of INITIAL_DATA) {
        await prisma.healthProfileSection.upsert({
            where: {
                userId_categoryId: {
                    userId: user.id,
                    categoryId: data.categoryId
                }
            },
            update: {
                title: data.title,
                content: data.content,
                orderIndex: data.orderIndex
            },
            create: {
                userId: user.id,
                categoryId: data.categoryId,
                title: data.title,
                content: data.content,
                orderIndex: data.orderIndex
            }
        });
        console.log(`✓ ${data.title}`);
    }

    console.log('\nHealth profile seeded successfully!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
