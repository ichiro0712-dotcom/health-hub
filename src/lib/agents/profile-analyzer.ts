/**
 * Profile Analyzer Agent (Stage 1)
 *
 * 既存プロフィールの重複・矛盾検出 + 未入力情報のリストアップ
 * セッション開始時に1回実行。JSON出力のみ。
 */

import { HEALTH_QUESTIONS } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import type { ProfileAnalyzerInput, ProfileAnalyzerOutput, ProfileIssue, MissingQuestion } from './types';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * プロフィールを分析し、重複・矛盾・未入力情報を返す
 */
export async function analyzeProfile(input: ProfileAnalyzerInput): Promise<ProfileAnalyzerOutput> {
  if (!GOOGLE_API_KEY || !input.profileContent || input.profileContent.length < 20) {
    // プロフィールがなければ全質問を未入力として返す
    return {
      issues: [],
      missingQuestions: buildAllMissingQuestions(input.answeredQuestionIds),
    };
  }

  try {
    const result = await callAnalyzerAI(input);
    return result;
  } catch (error) {
    console.error('[ProfileAnalyzer] AI call failed, falling back:', error);
    // フォールバック: 問題検出なし、DB未記録の質問を未入力として返す
    return {
      issues: [],
      missingQuestions: buildAllMissingQuestions(input.answeredQuestionIds),
    };
  }
}

/**
 * DB未記録の質問をpriority順にリストアップ
 */
function buildAllMissingQuestions(answeredQuestionIds: string[]): MissingQuestion[] {
  const answeredSet = new Set(answeredQuestionIds);

  return HEALTH_QUESTIONS
    .filter(q => !answeredSet.has(q.id))
    .sort((a, b) => {
      // priority降順（3が最優先）
      if (a.priority !== b.priority) return b.priority - a.priority;
      // 同priority内はセクション順
      const sectionOrder = DEFAULT_PROFILE_CATEGORIES.map(c => c.id);
      const aIdx = sectionOrder.indexOf(a.sectionId);
      const bIdx = sectionOrder.indexOf(b.sectionId);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.id.localeCompare(b.id);
    })
    .map(q => ({
      questionId: q.id,
      question: q.question,
      sectionId: q.sectionId,
      priority: q.priority,
      reason: 'DB未記録',
    }));
}

/**
 * Gemini APIを使ってプロフィール分析
 */
async function callAnalyzerAI(input: ProfileAnalyzerInput): Promise<ProfileAnalyzerOutput> {
  const answeredSet = new Set(input.answeredQuestionIds);

  // 未回答質問のコンパクトリスト
  const unansweredQuestions = HEALTH_QUESTIONS
    .filter(q => !answeredSet.has(q.id))
    .map(q => {
      const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === q.sectionId)?.title || q.sectionId;
      return `${q.id}|${sectionTitle}|P${q.priority}|${q.question}|抽出: ${q.extractionHints.join(',')}`;
    })
    .join('\n');

  // section_idの有効値リスト（AIが正しいIDを使うよう指示）
  const sectionIdMap = DEFAULT_PROFILE_CATEGORIES
    .map(c => `"${c.id}" = ${c.title}`)
    .join('\n');

  const prompt = `あなたは健康プロフィール分析AIです。以下の2つのタスクを**必ず両方**実行してください。

## セクションIDマッピング（★重要: sectionId と section_id には必ず以下の英語IDを使ってください。タイトル文字列は使わないこと）
${sectionIdMap}

## タスク1: 重複・矛盾の検出（重要）

以下のプロフィール内容を**1行ずつ丁寧に**分析し、以下のパターンを探してください：

1. **DUPLICATE（重複）**: 同じ情報・同じ意味の記述が複数箇所にある（例: 「身長170cm」が2回書かれている、同じ薬が別の場所にも記載）
2. **CONFLICT（矛盾）**: 同じテーマについて異なる値がある（例: ある場所で「運動習慣あり」、別の場所で「運動していない」）
3. **OUTDATED（古い情報）**: 明らかに古い日付の情報が残っている

**重複の検出基準**: 同じセクション内で同じ情報が2回以上書かれている場合、または異なるセクションに同じ情報がある場合は必ずDUPLICATEとして報告してください。少しでも似た内容があれば報告してください。

## タスク2: 未入力情報の判定

以下の質問リストについて、プロフィールに既に情報がある質問を特定してください。
プロフィールに少しでも関連情報があれば「回答済み」と判定してください。

## プロフィール内容
${input.profileContent}

## 未回答とされている質問リスト（ID|セクション|優先度|質問文|抽出すべき情報）
${unansweredQuestions}

## 出力形式（JSONのみ、説明文は不要）
{
  "issues": [
    {
      "type": "DUPLICATE" | "CONFLICT" | "OUTDATED",
      "sectionId": "英語のセクションID（例: basic_attributes, exercise など。タイトルではない）",
      "description": "問題の説明（日本語、具体的にどの行が重複/矛盾しているか記述）",
      "existingTexts": ["重複テキスト1", "重複テキスト2"],
      "suggestedResolution": "推奨される解決方法（日本語）",
      "suggestedAction": {
        "type": "UPDATE" | "DELETE",
        "section_id": "英語のセクションID（例: basic_attributes, exercise など。必ず上記マッピングの英語IDを使うこと）",
        "target_text": "削除または更新する対象テキスト（プロフィール内の正確な文字列）",
        "new_text": "新しいテキスト（UPDATEの場合のみ）",
        "reason": "理由",
        "confidence": 0.0-1.0
      }
    }
  ],
  "alreadyAnsweredIds": ["1-1", "2-3"]
}

**重要**: 重複や矛盾が見つからなかった場合のみissuesを空配列にしてください。少しでも疑わしい重複があれば報告してください。
alreadyAnsweredIdsには、質問リストの中でプロフィールに既に情報がある質問のIDを入れてください。`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ProfileAnalyzer] API error:', errorText);
    throw new Error('Profile analyzer API call failed');
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSONを抽出
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[ProfileAnalyzer] Failed to extract JSON:', responseText.substring(0, 500));
    throw new Error('Failed to parse analyzer response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    issues: ProfileIssue[];
    alreadyAnsweredIds: string[];
  };

  console.log(`[ProfileAnalyzer] Result: ${parsed.issues.length} issues found, ${(parsed.alreadyAnsweredIds || []).length} already answered`);

  // alreadyAnsweredIdsを使って未入力質問リストを構築
  const allAnsweredIds = new Set([
    ...input.answeredQuestionIds,
    ...(parsed.alreadyAnsweredIds || []),
  ]);

  const missingQuestions = buildAllMissingQuestions(Array.from(allAnsweredIds));

  return {
    issues: parsed.issues || [],
    missingQuestions,
  };
}
