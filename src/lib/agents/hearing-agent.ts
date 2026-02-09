/**
 * Hearing Agent (Stage 2)
 *
 * ユーザーとの対話で健康情報をヒアリング。
 * 1つの質問に集中し、抽出データを構造化して返す。
 * ストリーミング対応（プロンプト生成のみ、API呼び出しは呼び出し元で行う）。
 */

import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import type { HearingAgentInput, ProfileIssue } from './types';

/**
 * ヒアリングAI用のシステムプロンプトを構築
 */
export function buildHearingSystemPrompt(input: HearingAgentInput): string {
  const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
    c => c.id === input.currentQuestion.sectionId
  )?.title || input.currentQuestion.sectionId;

  const existingInfo = input.existingSectionContent
    ? `\n## このセクションの既存情報\n${input.existingSectionContent}\n\n**既に上記に含まれる情報は聞かないでください。**`
    : '\n## このセクションにはまだ情報がありません。';

  // 重複・矛盾があれば最初に指摘する指示
  let issueInstructions = '';
  if (input.issuesForUser && input.issuesForUser.length > 0) {
    issueInstructions = buildIssueInstructions(input.issuesForUser);
  }

  const greeting = input.isFirstQuestion
    ? `\n## 最初の質問について\n自然な挨拶（「健康プロフィールを充実させるために質問を進めさせてもらいますね。」等）を添えてから質問してください。`
    : `\n## 会話の流れ\n前の回答に対して簡潔な共感（「なるほど」「ありがとうございます」等）を示してから次の質問に移ってください。`;

  const nextQuestionHint = input.nextQuestion
    ? `\n## 次の質問（参考）\nユーザーが回答したら、共感を示した後、次は「${input.nextQuestion}」に自然に移ってください。ただし今は上の「現在の質問」にのみ集中してください。`
    : '';

  return `あなたはH-Hubアシスタントです。ユーザーの健康プロフィールを充実させるために対話しています。

## あなたの役割
ユーザーに1つの質問をし、回答から情報を抽出してください。
${issueInstructions}
## 現在の質問
**セクション**: ${sectionTitle}
**質問**: ${input.currentQuestion.question}
**質問の意図**: ${input.currentQuestion.intent}
**抽出すべき情報**: ${input.currentQuestion.extractionHints.join('、')}
${existingInfo}
${greeting}${nextQuestionHint}

## ルール
1. **1度に1つの質問だけ**聞いてください
2. **この質問に関連する情報のみ**を聞いてください
3. ユーザーが「スキップ」「わからない」と言ったら、その質問を飛ばしてください
4. ユーザーが以前の回答を訂正した場合は、訂正内容を抽出してください
5. ユーザーが「終わり」「保存して」と言ったらセッション終了を提案してください
6. ユーザーが別のモード（データ分析、使い方）を希望したら、応答の末尾に <!--MODE_SWITCH: data_analysis--> または <!--MODE_SWITCH: help--> を追加してください

## 出力形式

応答テキストの後に、以下の形式でJSONを出力してください:

<!--EXTRACTED_DATA
{
  "questionId": "${input.currentQuestion.id}",
  "extractedFacts": [
    {
      "hint": "抽出すべき情報の項目名",
      "value": "抽出された値",
      "confidence": 0.0-1.0
    }
  ],
  "sectionId": "${input.currentQuestion.sectionId}",
  "rawAnswer": "ユーザーの回答の要約",
  "isSkipped": false,
  "needsClarification": false
}
EXTRACTED_DATA-->

- ユーザーがまだ質問に回答していない場合（最初のメッセージ等）は、extractedFactsを空配列にしてください
- needsClarificationがtrueの場合は、追加質問を含めてください`;
}

/**
 * 重複・矛盾の指摘指示を構築
 */
function buildIssueInstructions(issues: ProfileIssue[]): string {
  const issueDescriptions = issues.map((issue, i) => {
    const typeLabel = {
      DUPLICATE: '重複',
      CONFLICT: '矛盾',
      OUTDATED: '古い情報',
    }[issue.type];
    return `${i + 1}. 【${typeLabel}】${issue.description}\n   該当テキスト: ${issue.existingTexts.join(' / ')}\n   提案: ${issue.suggestedResolution}`;
  }).join('\n');

  return `\n## ★ プロフィールの問題を先に指摘してください

質問を始める前に、以下の問題をユーザーに伝えて整理を提案してください:

${issueDescriptions}

「最新の状態に整理してもよいですか？」と聞いてください。
ユーザーが同意したら、その旨を回答に含めてください。
`;
}

/**
 * ストリーミングレスポンスからEXTRACTED_DATAを抽出
 */
export function parseExtractedData(fullResponse: string): {
  responseText: string;
  extractedData: import('./types').ExtractedData | null;
} {
  const match = fullResponse.match(/<!--EXTRACTED_DATA\n([\s\S]*?)\nEXTRACTED_DATA-->/);

  const responseText = fullResponse
    .replace(/<!--EXTRACTED_DATA[\s\S]*?EXTRACTED_DATA-->/g, '')
    .replace(/<!--MODE_SWITCH:\s*\w+\s*-->/g, '')
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();

  if (!match) {
    return { responseText, extractedData: null };
  }

  try {
    const extractedData = JSON.parse(match[1]);
    return { responseText, extractedData };
  } catch (e) {
    console.error('[HearingAgent] Failed to parse EXTRACTED_DATA:', e);
    return { responseText, extractedData: null };
  }
}
