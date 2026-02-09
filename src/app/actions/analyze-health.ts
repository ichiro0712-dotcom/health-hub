'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getStructuredDataForAnalysis } from '@/app/actions/report';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// 健康カテゴリの定義（ランク順）- 全カテゴリ平均50点基準
const HEALTH_CATEGORIES = [
    { id: 'risk_factors', name: 'リスク因子', rank: 'SS', avgScore: 50 },
    { id: 'diet_nutrition', name: '食習慣・栄養', rank: 'SS', avgScore: 50 },
    { id: 'sleep_recovery', name: '睡眠・リカバリー', rank: 'S', avgScore: 50 },
    { id: 'exercise_fitness', name: '運動・体力', rank: 'S', avgScore: 50 },
    { id: 'stress_mental', name: 'ストレス・メンタル', rank: 'A', avgScore: 50 },
    { id: 'social_purpose', name: '社会とのつながり', rank: 'A', avgScore: 50 },
    { id: 'preventive_care', name: '予防医療', rank: 'B', avgScore: 50 },
];

async function callGeminiAPI(prompt: string): Promise<string> {
    const responseSchema = {
        type: "object",
        properties: {
            totalScore: { type: "number" },
            categories: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        rank: { type: "string" },
                        avgScore: { type: "number" },
                        score: { type: "number" },
                        summary: { type: "string" },
                        detail: { type: "string" }
                    },
                    required: ["id", "name", "rank", "avgScore", "score", "summary", "detail"]
                }
            },
            evaluation: { type: "string" },
            advices: {
                type: "object",
                properties: {
                    belowAverage: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                advice: { type: "string" }
                            },
                            required: ["category", "advice"]
                        }
                    },
                    badHabits: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                advice: { type: "string" }
                            },
                            required: ["category", "advice"]
                        }
                    },
                    highImpact: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                advice: { type: "string" }
                            },
                            required: ["category", "advice"]
                        }
                    }
                },
                required: ["belowAverage", "badHabits", "highImpact"]
            }
        },
        required: ["totalScore", "categories", "evaluation", "advices"]
    };

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
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response structure:', JSON.stringify(data, null, 2));

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('Empty response from Gemini. Full data:', data);
        throw new Error('AI応答が空でした');
    }
    return data.candidates[0].content.parts[0].text;
}

export async function analyzeHealthData(userEmail: string) {
    try {
        console.log('🔍 Server Action called with email:', userEmail);

        // 構造化データを取得（emailを明示的に渡す）
        const result = await getStructuredDataForAnalysis(userEmail);

        console.log('🔍 Server Action data fetch result:', {
            success: result.success,
            hasData: !!result.data,
            error: result.error
        });

        if (!result.success || !result.data) {
            return { success: false, error: result.error || 'Failed to get data' };
        }

        const { user, profile, records } = result.data;

        if (!GOOGLE_API_KEY) {
            return { success: false, error: 'AI API not configured' };
        }

        // 健康プロフィールをテキスト化
        const profileText = profile && profile.length > 0
            ? profile.map(p => `【${p.title}】\n${p.content}`).join('\n\n')
            : '未登録';

        // 健康データをAI分析用のプロンプトに変換
        const prompt = `
あなたは健康分析の専門家です。以下のユーザーの健康データを分析し、各カテゴリのスコア（0-100点）と総合評価を提供してください。

【ユーザー情報】
- 名前: ${user.name || 'Unknown'}
- 年齢: ${user.age ? `${user.age}歳` : '未登録'}
- メール: ${userEmail}

【健康プロフィール】
${profileText}

【最近の健康記録】
${records && records.length > 0 ? records.map((r: any) => `
- 日付: ${r.date}
  ${r.title || '定期診断'}
  ${r.summary || ''}
  検査結果: ${r.results?.map((res: any) => `${res.item}: ${res.value}${res.unit} (${res.evaluation})`).join(', ') || 'なし'}
`).join('\n') : '記録なし'}

以下のJSON形式で回答してください：
{
  "totalScore": 70,
  "categories": [
    {
      "id": "risk_factors",
      "name": "リスク因子",
      "rank": "SS",
      "avgScore": 50,
      "score": 75,
      "summary": "喫煙なし、適度な飲酒で良好です。",
      "detail": "タバコを吸っていないことは非常に良い習慣です。アルコールも週2-3回程度の適度な量であれば健康リスクは低いと考えられます。このまま継続してください。"
    },
    // ... 他のカテゴリも同様に
  ],
  "evaluation": "総合的な健康状態の評価文章",
  "advices": {
    "belowAverage": [{"category": "運動・体力", "advice": "週に3回以上の有酸素運動を取り入れましょう。"}],
    "badHabits": [{"category": "睡眠・リカバリー", "advice": "就寝前のスマホ使用が睡眠の質を下げています。"}],
    "highImpact": [{"category": "食習慣・栄養", "advice": "野菜の摂取量を増やすことで大きな改善が見込めます。"}]
  }
}

各カテゴリの"summary"は1-2文の短い要点、"detail"は3-5文の詳しい説明としてください。

advicesの各項目は必ず{"category": "カテゴリ名", "advice": "具体的なアドバイス"}のオブジェクト形式で返してください。
- badHabits: 健康寿命に悪い習慣TOP3（最大3件）
- highImpact: 改善効果が高い施策TOP3（最大3件）
- belowAverage: 平均以下のカテゴリに対する改善アドバイス（該当カテゴリすべて）

カテゴリは以下の7つです：
${HEALTH_CATEGORIES.map(cat => `- ${cat.id}: ${cat.name} (ランク: ${cat.rank})`).join('\n')}
`;

        // Gemini APIで分析実行
        const analysisText = await callGeminiAPI(prompt);
        const analysis = JSON.parse(analysisText);

        return {
            success: true,
            analysis
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        };
    }
}
