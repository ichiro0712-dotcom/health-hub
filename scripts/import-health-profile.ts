import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const healthProfileSections = [
  {
    categoryId: "basic_attributes",
    title: "1. 基本属性・バイオメトリクス",
    orderIndex: 0,
    content: `生年月日: 1978年7月12日（2026年現在 47歳）

性別: 男性 / 血液型: B型

身長・体重: 186.9 cm / 72.2 kg (BMI 20.7) ※2024年10月時点

体脂肪・内臓脂肪: 内臓脂肪面積 44.5cm²（正常・低値）

職業: 経営者・投資家（デスクワーク中心、多忙）`,
  },
  {
    categoryId: "genetics",
    title: "2. 遺伝・家族歴",
    orderIndex: 1,
    content: `父: 胃がん、元ピロリ菌保持、糖尿病。

母: 乳がん。

弟: 痛風。

その他: 【ヒアリング中】`,
  },
  {
    categoryId: "medical_history",
    title: "3. 病歴・医療ステータス",
    orderIndex: 2,
    content: `循環器・代謝:

血管系: 血管が弱い / 低血圧傾向 / 軽い動脈硬化傾向（2021年頸動脈エコーでプラーク所見あり）。

心臓: 2024年心電図「ST上昇（早期再分極の疑い）」判定C。

血液検査:

中性脂肪(TG): 変動大。2025年11月に252mg/dLへ急上昇。2026年1月からスタチン服用開始。

LDLコレステロール: 慢性的に高値（121〜153 mg/dL）。

尿酸: 常に境界域〜高値（6.5〜7.4 mg/dL）。30歳時に痛風発作歴。

貧血: 慢性的な軽度貧血（Hb 12.3〜12.9 g/dL）。

耐糖能: 糖尿病家族歴あり。

消化器:

SIBO（小腸内細菌増殖症）: 兆候があったが、2026年1月より朝のオリーブオイル摂取で改善傾向。

大腸: ポリープができやすい体質（2021年S状結腸、2025年横行・下行結腸切除）。

肛門: いぼ痔（複数）。年に数回悪化・出血あり。

胃・食道: 逆流性食道炎（軽度）、萎縮性胃炎（ピロリ除菌済）、胃びらん。

呼吸器・睡眠:

睡眠時無呼吸症候群 (SAS): 2024/12 軽症診断（AHI 6.8）。最低SpO2 57%（飲酒時低下リスク）。

眼科: LASIK既往（28歳時）、老眼進行・グレアあり。

歯科: 虫歯・歯周ポケット（奥歯4-5mm）

アレルギー: なし（薬剤、食物、環境すべてなし）。`,
  },
  {
    categoryId: "physiology",
    title: "4. 生理機能・体質",
    orderIndex: 3,
    content: `排便・ガス:

頻度: 3日に2回（便秘時は2日に1回）。

性状: 最初は硬く、後に軟便が出る（栓が抜ける感覚）。体調不良時は細くなる。

ガス: 量・回数多い。半数は無臭だが、半数は臭い（たまに激臭）。

消化吸収: 乳糖不耐傾向。便秘でイライラする（腸脳相関）。

ホルモン:

テストステロン: 総量は良好だが、遊離テストステロンが低い（自覚症状あり）。

エストラジオール: 低値。

DHEA-S: やや低値。

ストレス反応: 胃腸 → 頭痛・肩こり → 皮膚 → 睡眠 の順に出やすい。`,
  },
  {
    categoryId: "lifestyle_rhythm",
    title: "5. 生活リズム",
    orderIndex: 4,
    content: `睡眠:

就寝: AM 04:00頃 / 起床: AM 11:00頃（睡眠時間 約7時間確保）。

傾向: 完全な夜型定着。時差・仕事・飲酒により不規則になりがち。ソファやベッドでのPC作業・ゲーム多め。週３回1.5時間ほどドラム演奏

活動: 完全夜型。`,
  },
  {
    categoryId: "diet_nutrition",
    title: "6. 食生活・栄養",
    orderIndex: 5,
    content: `スケジュール: 「14時間断食」に近いサイクル

朝食: なし。

1st Meal (12:00-13:00): 4日に3日（ブルーベリー、ヨーグルト、いちご、ナッツ、オリーブオイル大さじ1）。

Lunch (13:00頃): 1st Mealの直後にしっかり

Snack (不定期): 時間帯を問わず、小腹やストレスを感じるとチョコ、クッキー、スナック菓子を食べてしまう（3日に2日程度）。

Dinner (20:00-22:00): 1日のメイン終了目安。

Midnight Snack (26:00-27:00): 3日に1回程度、飲酒後におにぎりやスパゲッティなどを食べてしまう。

傾向:

Positive: 納豆毎日、食物繊維・タンパク質（魚・鶏・豆）意識。白米・グルテン・砂糖・揚げ物は回避傾向。

Negative: スープ好き（塩分過多）。辛いものを好む（胃粘膜・痔への刺激）。

食事環境: 自炊 2 : Uber 4 : 外食 4 の割合。`,
  },
  {
    categoryId: "supplements_medication",
    title: "7. 嗜好品・サプリメント・薬",
    orderIndex: 6,
    content: `服用中の薬:

[朝] スタチン（ピタバスタチンカルシウム錠 1mg） ※2026/01〜開始

[朝/夜] メトホルミン 250mg

[必要時] タダラフィル

DHEA

サプリメント:

[ベースライン] EPA＋DHA(1,000mg), VitD(2000IU), VitK2(45mcg), CoQ10(200mg), VitC(500mg), Mg(300〜400mg)

[飲酒時] VitB1(50mg)

[ルール] 大量飲酒時は乳酸アシドーシス予防のためメトホルミン（夜）をスキップ。

嗜好品:

飲酒: 週4回程度（平均：芋焼酎ソーダ割 10杯 / Max：焼酎10杯＋テキーラ8杯）。

喫煙: 1日1箱。

カフェイン: コーヒー週4-5回（薄いペットボトル）。

間食: ストレスや小腹満たしでチョコ、クッキー等を摂取。`,
  },
  {
    categoryId: "exercise",
    title: "8. 運動・身体活動",
    orderIndex: 7,
    content: `方針: 運動嫌い。

習慣:

ドラム（2024年8月〜）：2日に1回、2時間程度。

高強度の身体活動（週3回程度）

デバイス: Google Pixel Watch, Fitbitでログ管理。`,
  },
  {
    categoryId: "mental_brain",
    title: "9. メンタル・脳機能",
    orderIndex: 8,
    content: `性格(MBTI): ENFP（広報運動家型）

数値・身体感覚に敏感、「予防・長期最適化」重視。感覚よりロジックや構造で理解したいタイプ。

客観視する能力が高く、ストレス耐性が高い。ストレスを事象として切り離すことが可能。

神経系:

頭痛: ほぼない（年1回程度）。

眠気: 日中の眠気はないが、食後は眠い`,
  },
  {
    categoryId: "beauty_hygiene",
    title: "10. 美容・衛生習慣",
    orderIndex: 9,
    content: `スキンケア（2024年〜）:

風呂上がりにフェイスパック（週3日）。

毎入浴後に美容液、保湿クリームを使用。紫外線ブロック意識あり。

入浴・洗浄習慣:

湯船: ほぼ毎日入る。

身体・洗顔: 2日に1回（洗いすぎない方針・常在菌保護）。

洗髪: 3日に1回。

口腔ケア:

朝夜歯磨き（2分ほど）。

就寝時マウスピース使用。`,
  },
  {
    categoryId: "environment_social",
    title: "11. 環境・社会・ライフスタイル",
    orderIndex: 10,
    content: `パートナーと仲が良く充実

飲み屋の仲間、バンドの仲間、経営者の友人など広く複数のコミニティ

10-20歳ほど年下と仲良くなる傾向

社会的立場や資金力があり自己肯定感を高く保てる`,
  },
];

async function main() {
  // Get ichiro user
  const user = await prisma.user.findUnique({
    where: { email: "ichiro0712@gmail.com" },
  });
  if (user === null) {
    throw new Error("User not found");
  }

  console.log("Importing health profile for user:", user.id);

  // Also update birthDate on user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      birthDate: new Date("1978-07-12"),
    },
  });
  console.log("  - Updated birthDate");

  // Import health profile sections
  for (const section of healthProfileSections) {
    await prisma.healthProfileSection.upsert({
      where: {
        userId_categoryId: {
          userId: user.id,
          categoryId: section.categoryId,
        },
      },
      update: {
        title: section.title,
        content: section.content,
        orderIndex: section.orderIndex,
      },
      create: {
        userId: user.id,
        categoryId: section.categoryId,
        title: section.title,
        content: section.content,
        orderIndex: section.orderIndex,
      },
    });
    console.log("  - Imported:", section.title);
  }

  const count = await prisma.healthProfileSection.count({
    where: { userId: user.id },
  });

  console.log("\n✅ Import complete!");
  console.log("  Health profile sections:", count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
