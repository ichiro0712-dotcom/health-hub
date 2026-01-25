import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStructuredDataForAnalysis } from '@/app/actions/report';
import { getToken } from 'next-auth/jwt';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// 健康カテゴリの定義（ランク順）- 全カテゴリ平均50点基準
const HEALTH_CATEGORIES = [
    { id: 'risk_factors', name: 'リスク因子', rank: 'SS', avgScore: 50 },
    { id: 'diet_nutrition', name: '食習慣・栄養', rank: 'SS', avgScore: 50 },
    { id: 'sleep_recovery', name: '睡眠・リカバリー', rank: 'S', avgScore: 50 },
    { id: 'cardiovascular', name: '循環器・血管', rank: 'S', avgScore: 50 },
    { id: 'physical_activity', name: '運動・身体機能', rank: 'A', avgScore: 50 },
    { id: 'health_consciousness', name: '健康意識・受診行動', rank: 'A', avgScore: 50 },
    { id: 'anti_aging', name: '抗老化', rank: 'A', avgScore: 50 },
    { id: 'brain_mental', name: '脳・メンタル', rank: 'B', avgScore: 50 },
    { id: 'metabolism', name: '代謝・燃焼', rank: 'B', avgScore: 50 },
    { id: 'digestion_gut', name: '消化器・吸収', rank: 'C', avgScore: 50 },
    { id: 'immunity_barrier', name: '免疫・バリア', rank: 'C', avgScore: 50 },
];

interface CategoryScore {
    id: string;
    name: string;
    rank: string;
    score: number;
    avgScore: number;
    reasoning: string;
}

interface AdviceItem {
    category: string;
    advice: string;
}

interface AnalysisResult {
    totalScore: number;
    categories: CategoryScore[];
    evaluation: string;
    advices: {
        belowAverage: AdviceItem[];      // 平均以下のカテゴリへのアドバイス
        badHabits: AdviceItem[];          // 健康寿命に悪い習慣TOP3
        highImpact: AdviceItem[];         // 改善効果の高い施策TOP3
    };
}

async function callGeminiAPI(prompt: string): Promise<string> {
    // Gemini 2.5 Pro を使用（高精度な分析のため）
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GOOGLE_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText
        });
        let errorMessage = 'AI分析に失敗しました';
        try {
            const errorData = JSON.parse(errorText);
            if (errorData.error?.message) {
                errorMessage = `AI API エラー: ${errorData.error.message}`;
            }
            console.error('Parsed error:', errorData);
        } catch (e) {
            console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in response:', data);
        throw new Error('AI応答が空でした');
    }
    return data.candidates[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(req: NextRequest) {
    try {
        // App RouterではgetTokenを使用してJWTトークンを取得
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

        console.log('🔍 Auth debug:', {
            hasToken: !!token,
            hasEmail: !!token?.email,
            email: token?.email
        });

        if (!token?.email) {
            console.error('❌ No token or email found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'AI API not configured' }, { status: 500 });
        }

        // 構造化データを取得
        const result = await getStructuredDataForAnalysis();
        if (!result.success || !result.data) {
            return NextResponse.json({ error: result.error || 'Failed to get data' }, { status: 500 });
        }

        const { user, profile, records } = result.data;

        // ステップ1: 総合スコア・カテゴリ別スコア・総合評価を一括で算出
        const analysisPrompt = buildAnalysisPrompt(user, profile, records);
        const analysisResponse = await callGeminiAPI(analysisPrompt);
        const { totalScore, categoryScores, evaluation } = parseAnalysisResponse(analysisResponse);

        // ステップ2: 3種類のアドバイスを生成
        const belowAvgCategories = categoryScores
            .filter(c => c.score < c.avgScore)
            .sort((a, b) => (a.avgScore - a.score) - (b.avgScore - b.score))
            .reverse();

        const advicePrompt = buildAdvicePrompt(user, profile, records, categoryScores, belowAvgCategories);
        const adviceResponse = await callGeminiAPI(advicePrompt);
        const advices = parseAdviceResponse(adviceResponse, categoryScores);

        const analysis: AnalysisResult = {
            totalScore,
            categories: categoryScores,
            evaluation,
            advices
        };

        return NextResponse.json({
            success: true,
            analysis
        });

    } catch (error) {
        console.error('Analysis error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function buildAnalysisPrompt(
    user: { age: number | null; name: string | null },
    profile: { title: string; content: string }[],
    records: { date: string; title: string | null; results: { item: string; value: string; unit: string; evaluation: string }[] }[]
): string {
    const profileText = profile.map(p => `【${p.title}】\n${p.content}`).join('\n\n');
    const recordsText = records.map(r => {
        const resultsText = r.results.map(res =>
            `  ${res.item}: ${res.value}${res.unit ? ' ' + res.unit : ''}${res.evaluation ? ' (' + res.evaluation + ')' : ''}`
        ).join('\n');
        return `日付: ${r.date}${r.title ? ' - ' + r.title : ''}\n${resultsText}`;
    }).join('\n\n');

    return `あなたは健康データ分析の専門家です。以下のユーザーデータを総合的に分析してください。

## ユーザー情報
- 年齢: ${user.age || '不明'}歳
- 性別: 健康プロフィールから推測してください

## 健康プロフィール
${profileText || '（データなし）'}

## 直近の検査結果
${recordsText || '（データなし）'}

## 評価カテゴリと定義（重要度順）

### SS（最重要）
1. **リスク因子 (risk_factors)**
   がん、心疾患、脳卒中など、致死的な疾患に直結する危険因子の有無。喫煙、飲酒、家族歴など。ここが崩れると他が良くても健康寿命は維持できない。

2. **食習慣・栄養 (diet_nutrition)**
   身体を構成する材料の供給と、臓器への負担管理。毎日の食事内容に加え、サプリメント等による不足栄養素の適切な補充も評価対象。

### S（非常に重要）
3. **睡眠・リカバリー (sleep_recovery)**
   脳の老廃物除去および身体組織の修復プロセス。活動によるダメージを翌日に持ち越さないための回復機能。

4. **循環器・血管 (cardiovascular)**
   血液を全身に送り届けるポンプとパイプの状態。血管の老化は全身の老化と同義であり、突然死リスクの管理に直結。

### A（重要）
5. **運動・身体機能 (physical_activity)**
   「動ける体」を維持する能力。心肺機能や筋肉量は死亡リスクと強力に逆相関。日常的な活動量や運動習慣を含む。

6. **健康意識・受診行動 (health_consciousness)**
   自身の身体への関心度と医療へのアクセス頻度。定期的な健康診断の受診、不調時の早期受診、専門家のアドバイスを受け入れる姿勢。

7. **抗老化 (anti_aging)**
   細胞レベルの老化進行度と抗老化対策の実施状況。酸化ストレス・糖化・慢性炎症の管理、抗酸化物質やNMN等の摂取、肌・髪・外見の若々しさ。生物学的年齢と暦年齢の乖離を評価。

### B（標準）
8. **脳・メンタル (brain_mental)**
   認知機能の維持とストレス耐性。社会的活動や幸福感に関わり、長期的なQOLと自立生活の可否を決定。

9. **代謝・燃焼 (metabolism)**
   エネルギーの処理能力とホルモンバランス。糖尿病予備軍のリスクや基礎代謝量など。

### C（基礎・補足）
10. **消化器・吸収 (digestion_gut)**
    栄養素の吸収効率と腸内環境。腸は「第二の脳」とも呼ばれ、免疫力やメンタルにも影響。

11. **免疫・バリア (immunity_barrier)**
    外部環境からの防御機能。皮膚や粘膜の健康状態を含み、感染症リスクや外見的な若々しさに影響。

## 回答形式
**重要**: 必ず有効なJSON形式で回答してください。JSONのみを出力し、説明やマークダウンは含めないでください。

正確なJSON形式:
{
  "totalScore": 数値,
  "evaluation": "文字列",
  "scores": [
    { "id": "risk_factors", "score": 数値, "reasoning": "文字列" },
    { "id": "diet_nutrition", "score": 数値, "reasoning": "文字列" },
    { "id": "sleep_recovery", "score": 数値, "reasoning": "文字列" },
    { "id": "cardiovascular", "score": 数値, "reasoning": "文字列" },
    { "id": "physical_activity", "score": 数値, "reasoning": "文字列" },
    { "id": "health_consciousness", "score": 数値, "reasoning": "文字列" },
    { "id": "anti_aging", "score": 数値, "reasoning": "文字列" },
    { "id": "brain_mental", "score": 数値, "reasoning": "文字列" },
    { "id": "metabolism", "score": 数値, "reasoning": "文字列" },
    { "id": "digestion_gut", "score": 数値, "reasoning": "文字列" },
    { "id": "immunity_barrier", "score": 数値, "reasoning": "文字列" }
  ]
}

フィールド仕様:
- totalScore: 0-100の整数。全データを複合的に見た健康寿命延伸の総合評価点（同年代平均50点）
- evaluation: 300-500字。構成「\\n\\n【良い点】\\n具体的な良好項目2-3個\\n\\n【注意点】\\n改善必要項目2-3個\\n\\n【総括】\\n全体総括1-2文」
- scores: 全11カテゴリ必須。各scoreは0-100整数、reasoningは50字程度

JSON作成時の注意:
- 文字列内の改行は \\n でエスケープ
- 最後のカンマを付けない
- 文字列はダブルクォートで囲む
- 「SEX」「性行為」等の表現は使わず「適度な運動」「身体活動」に置き換え`;
}

function buildAdvicePrompt(
    user: { age: number | null; name: string | null },
    profile: { title: string; content: string }[],
    records: { date: string; title: string | null; results: { item: string; value: string; unit: string; evaluation: string }[] }[],
    categoryScores: CategoryScore[],
    belowAvgCategories: CategoryScore[]
): string {
    const profileText = profile.map(p => `【${p.title}】\n${p.content}`).join('\n\n');
    const recordsText = records.map(r => {
        const resultsText = r.results.map(res =>
            `  ${res.item}: ${res.value}${res.unit ? ' ' + res.unit : ''}${res.evaluation ? ' (' + res.evaluation + ')' : ''}`
        ).join('\n');
        return `日付: ${r.date}${r.title ? ' - ' + r.title : ''}\n${resultsText}`;
    }).join('\n\n');

    const scoresText = categoryScores.map(c =>
        `- ${c.name} [${c.rank}]: ${c.score}点 (平均${c.avgScore}点) ${c.score < c.avgScore ? '【要改善】' : ''}`
    ).join('\n');

    const belowAvgText = belowAvgCategories.length > 0
        ? belowAvgCategories.map(c => `- ${c.name}（${c.avgScore - c.score}点不足）: ${c.reasoning}`).join('\n')
        : '（すべて平均以上）';

    return `あなたは健康アドバイザーです。以下のユーザーデータを分析し、3種類のアドバイスを提供してください。

## ユーザー情報
- 年齢: ${user.age || '不明'}歳

## 健康プロフィール
${profileText || '（データなし）'}

## 直近の検査結果
${recordsText || '（データなし）'}

## カテゴリ別スコア
${scoresText}

## 改善が必要なカテゴリ（平均以下、乖離が大きい順）
${belowAvgText}

## 回答形式
以下のJSON形式で回答してください。JSONのみを出力し、他の説明は不要です。

{
  "belowAverage": [
    // 平均以下のカテゴリへの改善アドバイス（該当カテゴリがある場合のみ）
    ${belowAvgCategories.length > 0
        ? belowAvgCategories.map(c => `{ "category": "${c.name}", "advice": "<80-120字。${c.name}を改善するための具体的アドバイス>" }`).join(',\n    ')
        : '// 該当なしの場合は空配列'}
  ],
  "badHabits": [
    // 健康寿命を縮める悪い習慣TOP3（プロフィールや検査結果から読み取れるもの）
    { "category": "<習慣の名前>", "advice": "<80-120字。なぜ悪いのか、どう改善すべきか>" },
    { "category": "<習慣の名前>", "advice": "<80-120字。なぜ悪いのか、どう改善すべきか>" },
    { "category": "<習慣の名前>", "advice": "<80-120字。なぜ悪いのか、どう改善すべきか>" }
  ],
  "highImpact": [
    // 改善効果が最も高い施策TOP3（少ない努力で大きな効果が期待できるもの）
    { "category": "<施策の名前>", "advice": "<80-120字。具体的な実行方法と期待される効果>" },
    { "category": "<施策の名前>", "advice": "<80-120字。具体的な実行方法と期待される効果>" },
    { "category": "<施策の名前>", "advice": "<80-120字。具体的な実行方法と期待される効果>" }
  ]
}

## 各セクションの詳細

### belowAverage（平均以下のカテゴリ）
- 平均スコアを下回っているカテゴリに対する具体的な改善策
- 該当がなければ空配列

### badHabits（悪い習慣TOP3）
- ユーザーの健康プロフィールや検査結果から読み取れる、健康寿命に悪影響を与えている習慣
- 例: 喫煙、過度の飲酒、運動不足、睡眠不足、偏った食生活など
- 深刻度の高い順に3つ

### highImpact（改善効果TOP3）
- ユーザーの現状を踏まえ、最も費用対効果（努力対効果）が高い改善策
- 例: 禁煙（喫煙者の場合）、毎日30分の散歩、野菜を1品追加など
- 実行しやすく効果が大きいものを優先

注意事項:
- 医学的な診断は行わず、一般的な健康アドバイスとして回答
- ユーザーの現在の生活習慣や体質を考慮した現実的なアドバイスを提供
- 検査結果の異常値がある場合は特に注意喚起
- 回答文中で「SEX」「性行為」「性的活動」「パートナーとの親密な時間」などの表現は一切使用せず、「適度な運動」「軽い運動」「身体活動」などの一般的な運動表現に置き換えてください`;
}

function parseAnalysisResponse(response: string): {
    totalScore: number;
    categoryScores: CategoryScore[];
    evaluation: string;
} {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            console.log('Attempting to parse JSON, length:', jsonStr.length);
            const parsed = JSON.parse(jsonStr);
            const scores = parsed.scores || [];

            const categoryScores = HEALTH_CATEGORIES.map(cat => {
                const found = scores.find((s: any) => s.id === cat.id);
                return {
                    id: cat.id,
                    name: cat.name,
                    rank: cat.rank,
                    score: found ? Math.min(100, Math.max(0, parseInt(found.score) || 50)) : 50,
                    avgScore: cat.avgScore,
                    reasoning: found?.reasoning || ''
                };
            });

            return {
                totalScore: Math.min(100, Math.max(0, parseInt(parsed.totalScore) || 50)),
                categoryScores,
                evaluation: parsed.evaluation || '評価を生成できませんでした'
            };
        }
    } catch (e) {
        console.error('Failed to parse analysis response:', e);
        console.error('Response excerpt:', response.substring(0, 500));
        if (e instanceof SyntaxError) {
            console.error('JSON parse error at:', e.message);
        }
    }

    // フォールバック
    return {
        totalScore: 50,
        categoryScores: HEALTH_CATEGORIES.map(cat => ({
            id: cat.id,
            name: cat.name,
            rank: cat.rank,
            score: 50,
            avgScore: cat.avgScore,
            reasoning: 'データ不足'
        })),
        evaluation: '評価を生成できませんでした'
    };
}

function parseAdviceResponse(
    response: string,
    categoryScores: CategoryScore[]
): {
    belowAverage: AdviceItem[];
    badHabits: AdviceItem[];
    highImpact: AdviceItem[];
} {
    const defaultResult = {
        belowAverage: [],
        badHabits: [],
        highImpact: []
    };

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            const mapAdvices = (arr: any[]): AdviceItem[] => {
                if (!Array.isArray(arr)) return [];
                return arr
                    .filter((a: any) => a && a.advice)
                    .map((a: any) => ({
                        category: a.category || '',
                        advice: a.advice || ''
                    }));
            };

            return {
                belowAverage: mapAdvices(parsed.belowAverage),
                badHabits: mapAdvices(parsed.badHabits),
                highImpact: mapAdvices(parsed.highImpact)
            };
        }
    } catch (e) {
        console.error('Failed to parse advice response:', e);
    }
    return defaultResult;
}
