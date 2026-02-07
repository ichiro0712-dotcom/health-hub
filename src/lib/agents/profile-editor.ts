/**
 * Profile Editor Agent (Stage 3)
 *
 * ヒアリングAIの抽出結果からプロフィール編集アクションを生成。
 * ADD vs UPDATE の判定に特化。バックグラウンド実行。
 */

import type { ProfileEditorInput, ProfileEditorOutput } from './types';
import type { ProfileAction } from '@/lib/chat-prompts';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * 抽出データからプロフィール編集アクションを生成
 */
export async function generateProfileActions(input: ProfileEditorInput): Promise<ProfileEditorOutput> {
  // 抽出データが空またはスキップの場合はNONEを返す
  if (
    input.extractedData.isSkipped ||
    input.extractedData.extractedFacts.length === 0 ||
    input.extractedData.needsClarification
  ) {
    return {
      actions: [{
        type: 'NONE',
        section_id: input.sectionId,
        reason: input.extractedData.isSkipped ? 'ユーザーがスキップ' : '情報抽出なし',
        confidence: 1.0,
      }],
      answeredQuestionId: input.extractedData.isSkipped ? input.extractedData.questionId : '',
    };
  }

  if (!GOOGLE_API_KEY) {
    // APIキーがない場合はシンプルなADDアクションを生成
    return buildFallbackActions(input);
  }

  try {
    return await callEditorAI(input);
  } catch (error) {
    console.error('[ProfileEditor] AI call failed, using fallback:', error);
    return buildFallbackActions(input);
  }
}

/**
 * フォールバック: LLMなしでシンプルなアクションを生成
 */
function buildFallbackActions(input: ProfileEditorInput): ProfileEditorOutput {
  const factsText = input.extractedData.extractedFacts
    .filter(f => f.confidence >= 0.7)
    .map(f => `${f.hint}: ${f.value}`)
    .join('\n');

  if (!factsText) {
    return {
      actions: [{ type: 'NONE', section_id: input.sectionId, reason: '高信頼度の情報なし', confidence: 1.0 }],
      answeredQuestionId: input.extractedData.questionId,
    };
  }

  const hasExisting = input.existingSectionContent && input.existingSectionContent.trim().length > 5;

  return {
    actions: [{
      type: hasExisting ? 'ADD' : 'ADD',
      section_id: input.sectionId,
      new_text: factsText,
      reason: `質問${input.extractedData.questionId}への回答から抽出`,
      confidence: 0.85,
    }],
    answeredQuestionId: input.extractedData.questionId,
  };
}

/**
 * Gemini APIを使ってプロフィール編集アクションを生成
 */
async function callEditorAI(input: ProfileEditorInput): Promise<ProfileEditorOutput> {
  const factsJson = JSON.stringify(input.extractedData.extractedFacts, null, 2);

  const prompt = `あなたは健康プロフィール編集AIです。抽出された情報をプロフィールに反映するアクションを生成してください。

## 既存のセクション内容（${input.sectionTitle}）
${input.existingSectionContent || '（まだ情報がありません）'}

## 抽出された情報
質問ID: ${input.extractedData.questionId}
ユーザーの回答: ${input.extractedData.rawAnswer}
抽出された項目:
${factsJson}

## 編集ルール
1. **既存情報がない場合** → ADDで追加
2. **既存情報と同じテーマの情報がある場合** → UPDATEで置き換え（target_textに既存テキスト、new_textに新テキスト）
3. **絶対にADDで重複を作らない** → 同じテーマの情報が既にあるなら必ずUPDATE
4. new_textは自然な日本語で簡潔に書く（箇条書きまたは短文）

## 出力形式（JSONのみ）
{
  "actions": [
    {
      "type": "ADD" | "UPDATE",
      "section_id": "${input.sectionId}",
      "target_text": "UPDATEの場合、既存テキストの該当行",
      "new_text": "追加または更新後のテキスト",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Profile editor API call failed');
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse editor response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as { actions: ProfileAction[] };

  return {
    actions: parsed.actions || [],
    answeredQuestionId: input.extractedData.questionId,
  };
}
