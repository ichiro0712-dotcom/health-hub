/**
 * AIチャット モード別プロンプトシステム
 *
 * 3つのモード:
 * - profile_building: 健康プロフィール構築（質問マスター駆動）
 * - data_analysis: 診断データ分析・健康相談
 * - help: Health Hub使い方サポート
 *
 * 共通ユーティリティ（旧route.ts/stream/route.tsの重複を統合）
 */

import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import prisma from '@/lib/prisma';

// ============================================
// 型定義
// ============================================

export type ChatMode = 'profile_building' | 'data_analysis' | 'help';

export interface ModeDetectionResult {
    mode: ChatMode;
    confidence: number;
}

export interface PromptContext {
    mode: ChatMode;
    profileContent: string;
    recordsContent: string;
    answeredQuestionIds?: string[];
    currentQuestionId?: string | null;
    currentPriority?: number;
}

export interface ProfileAction {
    type: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';
    section_id: string;
    target_text?: string;
    new_text?: string;
    reason: string;
    confidence: number;
}

export interface DetectedIssue {
    type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED' | 'MISSING';
    description: string;
    suggested_resolution: string;
}

// ============================================
// 定数
// ============================================

export const CONFIDENCE_THRESHOLD_DEFAULT = 0.8;
export const CONFIDENCE_THRESHOLD_DELETE = 0.95;
export const MAX_HISTORY_MESSAGES = 20;

const MODE_LABELS: Record<ChatMode, string> = {
    profile_building: '健康プロフィール構築',
    data_analysis: 'データ分析・健康相談',
    help: '使い方サポート',
};

// ============================================
// モード検出
// ============================================

export function detectMode(message: string): ModeDetectionResult {
    const trimmed = message.trim();

    // 明示的な番号選択
    if (/^[1１]$/.test(trimmed) || /プロフィール/.test(trimmed)) {
        return { mode: 'profile_building', confidence: 1.0 };
    }
    if (/^[2２]$/.test(trimmed) || /分析|アドバイス/.test(trimmed)) {
        return { mode: 'data_analysis', confidence: 1.0 };
    }
    if (/^[3３]$/.test(trimmed) || /使い方|ヘルプ/.test(trimmed)) {
        return { mode: 'help', confidence: 1.0 };
    }

    // おまかせ・始めたい系 → プロフィール構築
    if (/おまかせ|お任せ|始め|お願い|やって|進めて/.test(trimmed)) {
        return { mode: 'profile_building', confidence: 0.9 };
    }

    // 動的番号（4以降）+ テーマキーワード
    if (/^[4-9４-９]$/.test(trimmed) || /充実|健康診断.*教|医療データ/.test(trimmed)) {
        return { mode: 'profile_building', confidence: 0.9 };
    }
    if (/スマートウォッチ|Fitbit|fitbit|Gemini|ChatGPT|連携/.test(trimmed)) {
        return { mode: 'help', confidence: 0.9 };
    }

    // 再開セッション
    if (/前回の続き/.test(trimmed)) {
        // 再開時はデフォルトでprofile_building（セッション側でmodeがあればそちら優先）
        return { mode: 'profile_building', confidence: 0.6 };
    }

    // 自由テキストのヒューリスティック
    if (/高い|低い|正常|異常|基準|数値|推移|変化|改善|血圧|コレステロール|血糖|HbA1c/.test(trimmed)) {
        return { mode: 'data_analysis', confidence: 0.7 };
    }
    if (/どうすれば|やり方|方法|ページ|画面|ボタン|設定|登録/.test(trimmed)) {
        return { mode: 'help', confidence: 0.7 };
    }

    // デフォルト: プロフィール構築
    return { mode: 'profile_building', confidence: 0.5 };
}

// ============================================
// MODE_SWITCH検出
// ============================================

export function detectModeSwitch(response: string): ChatMode | null {
    const match = response.match(/<!--MODE_SWITCH:\s*(profile_building|data_analysis|help)\s*-->/);
    return match ? (match[1] as ChatMode) : null;
}

export function stripModeSwitch(response: string): string {
    return response.replace(/<!--MODE_SWITCH:\s*\w+\s*-->/g, '').trim();
}

// ============================================
// システムプロンプト構築
// ============================================

export function buildSystemPrompt(context: PromptContext): string {
    const base = buildBasePrompt(context.mode);

    switch (context.mode) {
        case 'profile_building':
            return base + buildProfileBuildingPrompt(
                context.profileContent,
                context.answeredQuestionIds || [],
                context.currentQuestionId || null,
                context.currentPriority || 3
            );
        case 'data_analysis':
            return base + buildDataAnalysisPrompt(context.profileContent, context.recordsContent);
        case 'help':
            return base + buildHelpPrompt();
    }
}

// --- 共通ベース ---

function buildBasePrompt(mode: ChatMode): string {
    return `あなたはH-Hubアシスタントです。
現在のモード: **${MODE_LABELS[mode]}**

${buildModeTransitionInstructions(mode)}

## ウェルカムメッセージの番号選択への対応

チャット開始時にユーザーへ番号付きの選択肢を表示しています。ユーザーが数字（半角「1」、全角「１」）や番号に対応する言葉で回答した場合、該当するトピックとして解釈して応答してください。
- 「１」「1」「プロフィール」→ 健康プロフィールの作成・更新の対話を開始
- 「２」「2」「分析」「アドバイス」→ 健康データの分析・アドバイスを開始
- 「３」「3」「使い方」「ヘルプ」→ Health Hubの使い方を説明
- その他の番号 → ウェルカムメッセージで表示した順に対応するトピックを開始
- 「前回の続き」「１」（再開時）→ 直前の会話の文脈を引き継いで会話を続ける

## 設定ページへの誘導

連携や設定に関する質問には、該当する設定ページへ誘導してください：
- Fitbit連携 → /settings/fitbit
- Google Docs連携 → /settings/google-docs
- スマホデータ連携 → /settings/data-sync
- 検査項目の設定 → /profile/settings/items
- ヘルプ・FAQ → /help

`;
}

// --- モード遷移指示 ---

function buildModeTransitionInstructions(currentMode: ChatMode): string {
    return `## 会話の脱線への対応

あなたは現在「${MODE_LABELS[currentMode]}」モードで会話しています。

もしユーザーが現在のモードと異なるトピックについて質問した場合：
1. **その質問に簡潔に回答する**（持っている情報の範囲内で）
2. **回答の最後に、元のモードに自然に戻す一言を添える**（例: 「さて、プロフィールの続きですが…」）
3. **モードを切り替えない**（一時的な脱線として扱う）

ただし、ユーザーが明確にモード変更を要求した場合のみ（例: 「データを分析して」「プロフィールを更新したい」「使い方を教えて」）、
応答の末尾に以下を追加してモード変更を通知してください：
<!--MODE_SWITCH: profile_building-->
<!--MODE_SWITCH: data_analysis-->
<!--MODE_SWITCH: help-->
（該当するモード名を1つだけ記載）`;
}

// --- プロフィール構築モード ---

function buildProfileBuildingPrompt(
    profileContent: string,
    answeredQuestionIds: string[],
    currentQuestionId: string | null,
    currentPriority: number
): string {
    const sectionIdList = DEFAULT_PROFILE_CATEGORIES
        .map(cat => `${cat.id}（${cat.title}）`)
        .join('\n  ');

    const { guidance, nextQuestion } = buildQuestionGuidance(
        profileContent, answeredQuestionIds, currentQuestionId, currentPriority
    );

    return `## あなたの役割: 健康プロフィールの構築・改善

ユーザーとの対話から健康情報を聞き取り、プロフィールに追加・更新・削除します。

## 現在の健康プロフィール
${profileContent || '（まだ情報がありません）'}

## 利用可能なセクションID
  ${sectionIdList}

${guidance}

## ★最重要ルール: 既存情報は絶対に再質問しない

**プロフィールに既に記載されている情報は、どんな場合でも再度質問しないでください。**
例えば、プロフィールに「1978年7月12日生まれ」とあれば、生年月日や年齢の質問はスキップし、次の未回答の質問に進んでください。

各質問の「抽出ヒント」に含まれるキーワードがプロフィールに既にあるかを確認してから質問を決めてください。

## ★重要ルール: ユーザーが始めたいと言ったら即座に質問開始

ユーザーが番号を選んだり「おまかせ」「始めたい」「お願い」などと言った場合は、確認や説明なしに**すぐに次の未回答の質問を1つ聞いてください**。
「何から始めますか？」「どのセクションを更新しますか？」のような再確認は不要です。

${nextQuestion ? `**今すぐ聞くべき次の質問**: ${nextQuestion.question}（質問ID: ${nextQuestion.id}）` : ''}

## その他のルール

1. **質問リストを厳密に使う**: 上記のヒアリングガイドの「⬜未回答」質問のみを聞く。「✅回答済み」はスキップ
2. **1度に1つの質問**: ユーザーが圧倒されないよう、1回のメッセージで質問は1つだけ
3. **確認が必要な場合**: confidence < 0.8 の更新は実行前に確認を求める
4. **削除は慎重に**: confidence 0.95以上でないと自動実行しない
5. **必ず質問を含める**: 終了希望以外は必ず1つ質問を含める
6. **自然な相槌**: 回答に対して簡潔な共感を示してから次の質問へ
7. **回答済みIDの報告**: PROFILE_ACTIONのanswered_question_idに、この回答で回答された質問IDを記載

## 出力形式

応答テキストの後に、以下の形式でJSONを出力:

<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID",
      "target_text": "更新/削除対象のテキスト",
      "new_text": "追加/更新後のテキスト",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ],
  "detected_issues": [],
  "follow_up_topic": "次に聞くと良いトピック",
  "answered_question_id": "回答された質問ID（例: 1-1）またはnull"
}
PROFILE_ACTION-->

## 会話の進め方

- ユーザーが「保存して」「終わり」と言ったらセッション終了を提案
- 上記の次の質問から順番に1つずつ進める
- 1つの質問に対するユーザーの回答を受け取ったら、PROFILE_ACTIONで情報を保存し、次の未回答質問へ進む`;
}

// --- 質問ガイダンス（プロフィール構築モード用） ---
// extractionHintsを使って質問単位で回答済みかを精密判定

function isQuestionAnsweredByProfile(q: typeof HEALTH_QUESTIONS[number], profileContent: string): boolean {
    if (!profileContent || profileContent.length < 10) return false;
    const profileLower = profileContent.toLowerCase();

    // extractionHintsのうち、1つでもプロフィール内に含まれていれば「回答済み」とみなす
    const matchCount = q.extractionHints.filter(hint =>
        profileLower.includes(hint.toLowerCase())
    ).length;

    // ヒントの半分以上がマッチすれば回答済みと判定
    return matchCount >= Math.max(1, Math.ceil(q.extractionHints.length * 0.4));
}

function buildQuestionGuidance(
    profileContent: string,
    answeredQuestionIds: string[],
    currentQuestionId: string | null,
    currentPriority: number
): { guidance: string; nextQuestion: typeof HEALTH_QUESTIONS[number] | null } {
    const answeredSet = new Set(answeredQuestionIds);

    // 各質問の回答状態を判定（DB記録 OR プロフィール内容から推定）
    const questionStatus = HEALTH_QUESTIONS.map(q => {
        const dbAnswered = answeredSet.has(q.id);
        const profileAnswered = isQuestionAnsweredByProfile(q, profileContent);
        return {
            question: q,
            isAnswered: dbAnswered || profileAnswered,
        };
    });

    // 未回答質問をpriority順・セクション順で取得
    const sectionOrder = [
        'basic_attributes', 'genetics', 'medical_history', 'physiology',
        'circadian', 'diet_nutrition', 'substances', 'exercise',
        'mental', 'beauty_hygiene', 'environment'
    ];

    const unansweredByPriority = (priority: number) =>
        questionStatus
            .filter(qs => !qs.isAnswered && qs.question.priority === priority)
            .sort((a, b) => {
                const aIdx = sectionOrder.indexOf(a.question.sectionId);
                const bIdx = sectionOrder.indexOf(b.question.sectionId);
                if (aIdx !== bIdx) return aIdx - bIdx;
                return a.question.id.localeCompare(b.question.id);
            });

    const unanswered3 = unansweredByPriority(3);
    const unanswered2 = unansweredByPriority(2);
    const answered3 = questionStatus.filter(qs => qs.isAnswered && qs.question.priority === 3);
    const answered2 = questionStatus.filter(qs => qs.isAnswered && qs.question.priority === 2);

    // 次の質問を決定
    let nextQuestion: typeof HEALTH_QUESTIONS[number] | null = null;

    // currentQuestionIdが指定されていて未回答ならそれを優先
    if (currentQuestionId) {
        const currentQ = questionStatus.find(qs => qs.question.id === currentQuestionId);
        if (currentQ && !currentQ.isAnswered) {
            nextQuestion = currentQ.question;
        }
    }

    // なければ、現在のpriorityの未回答から
    if (!nextQuestion) {
        const currentUnanswered = currentPriority === 3 ? unanswered3 :
            currentPriority === 2 ? unanswered2 : unansweredByPriority(1);
        if (currentUnanswered.length > 0) {
            nextQuestion = currentUnanswered[0].question;
        } else if (unanswered3.length > 0) {
            nextQuestion = unanswered3[0].question;
        } else if (unanswered2.length > 0) {
            nextQuestion = unanswered2[0].question;
        }
    }

    // ガイダンステキスト生成
    let guidance = `\n## ヒアリングガイド（質問リスト + 回答状態）\n\n`;
    guidance += `進捗: 優先度3は ${answered3.length}/${answered3.length + unanswered3.length} 回答済み、`;
    guidance += `優先度2は ${answered2.length}/${answered2.length + unanswered2.length} 回答済み\n\n`;

    if (unanswered3.length > 0) {
        guidance += `### 優先度3（最重要）- 未回答の質問\n`;
        for (const qs of unanswered3.slice(0, 20)) {
            const q = qs.question;
            const sectionName = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === q.sectionId)?.title || q.sectionId;
            const marker = nextQuestion?.id === q.id ? '👉' : '⬜';
            guidance += `${marker} **[${sectionName}]** ${q.question}（ID: ${q.id}）\n  → 抽出ヒント: ${q.extractionHints.join('、')}\n`;
        }
    } else {
        guidance += `### ✅ 優先度3の質問はすべて回答済みです！\n`;
    }

    if (unanswered3.length === 0 && unanswered2.length > 0) {
        guidance += `\n### 優先度2（詳細情報）- 未回答の質問\n`;
        for (const qs of unanswered2.slice(0, 15)) {
            const q = qs.question;
            const marker = nextQuestion?.id === q.id ? '👉' : '⬜';
            guidance += `${marker} [${q.sectionId}] ${q.question}（ID: ${q.id}）\n`;
        }
    }

    // 回答済み質問の一覧（AI確認用、コンパクト）
    if (answered3.length > 0) {
        guidance += `\n### 回答済み（スキップすること）\n`;
        guidance += answered3.map(qs => `✅ ${qs.question.id}: ${qs.question.extractionHints.slice(0, 2).join('、')}`).join('\n') + '\n';
    }

    return { guidance, nextQuestion };
}

// --- データ分析モード ---

function buildDataAnalysisPrompt(profileContent: string, recordsContent: string): string {
    return `## あなたの役割: 健康データの分析・アドバイス

ユーザーの健康プロフィールと診断記録データを読み取り、質問に対して分析・傾向の指摘・生活改善のアドバイスを提供します。

## 現在の健康プロフィール
${profileContent || '（まだ情報がありません）'}

## 診断記録データ
${recordsContent ? `${recordsContent.substring(0, 8000)}${recordsContent.length > 8000 ? '\n...(以下省略)' : ''}` : '（まだ記録がありません）'}

## 分析の進め方

1. **データに基づいた回答**: 推測ではなく、上記のデータに記録されている事実に基づいて回答する
2. **傾向の指摘**: 経年変化や基準値との比較があれば指摘する
3. **具体的なアドバイス**: 「〜した方がいい」だけでなく、具体的なアクションを提案する
4. **免責事項**: 深刻な健康問題については医師への相談を勧める
5. **質問を含める**: データが不足している場合は追加情報を聞く

## 重要なルール

- プロフィールの更新は行わない（このモードではPROFILE_ACTIONを出力しないでください）
- 医学的な診断は行わない（「〜の可能性があります」「医師にご相談ください」等）
- データがない場合は正直に「データが見つかりません」と伝える`;
}

// --- 使い方サポートモード ---

function buildHelpPrompt(): string {
    return `## あなたの役割: Health Hubの使い方サポート

Health Hubの機能や使い方について質問に回答します。以下のFAQ情報をもとに回答してください。

## Health Hub FAQ情報

### 主な機能
- **健康プロフィール** (/health-profile): H-Hubアシスタントで対話しながら健康情報を整理。11のカテゴリ（基本属性、遺伝・家族歴、病歴、生理機能、生活リズム、食生活、嗜好品・薬、運動、メンタル、美容、環境）で管理
- **診断記録** (/records): 健康診断の結果を管理。写真のアップロード、AI自動読み取り（OCR）、手入力に対応
- **データ推移** (/trends): 検査値やスマホデータの推移をグラフ・表で可視化
- **習慣トラッキング** (/habits): 日々の生活習慣やサプリメントの記録
- **動画** (/videos): 健康に関する動画コンテンツ
- **提携クリニック** (/clinics): 提携クリニック情報
- **オンライン処方** (/prescription): オンライン処方サービス

### データ連携
- **Fitbit連携** (/settings/fitbit): OAuth認証で心拍数、睡眠、HRV、歩数などを自動同期
- **Android Health Connect** (/settings/data-sync): スマホのHealth Connectアプリ経由でGarmin、Samsung等のデータも同期可能
- **Google Docs連携** (/settings/google-docs): 健康データをGoogle Docsに自動エクスポート。ChatGPTやGeminiなど外部AIとのデータ共有に利用可能

### データの入力方法
- **AI自動入力**: 健康診断結果の写真をアップロード → AIが自動で読み取り
- **手入力**: 検査値を直接入力
- **デバイス連携**: Fitbit・Health Connectからの自動取り込み

## 回答ルール

- 設定や連携の質問には、必ず該当する設定ページのパスを案内する
- 操作の具体的な手順を説明する
- スクリーンショットは表示できないので、テキストで分かりやすく説明する
- プロフィールの更新は行わない（このモードではPROFILE_ACTIONを出力しないでください）
- 知らない機能について聞かれたら「その機能はまだ対応していないかもしれません」と正直に伝える`;
}

// ============================================
// 共通ユーティリティ
// ============================================

export function sanitizeUserInput(input: string): string {
    return input
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/PROFILE_ACTION/gi, '')
        .replace(/EXTRACTED_DATA/gi, '')
        .replace(/MODE_SWITCH/gi, '')
        .replace(/システムプロンプト/gi, '')
        .replace(/system\s*prompt/gi, '')
        .replace(/ignore\s*(all|previous)\s*(instructions?)?/gi, '')
        .trim();
}

export function summarizeHistory(messages: { role: string; content: string }[]): { role: string; content: string }[] {
    if (messages.length <= MAX_HISTORY_MESSAGES) {
        return messages;
    }

    const oldMessages = messages.slice(0, messages.length - MAX_HISTORY_MESSAGES);
    const recentMessages = messages.slice(messages.length - MAX_HISTORY_MESSAGES);

    const topics = new Set<string>();
    for (const msg of oldMessages) {
        const keywords = msg.content.match(/(?:について|に関して|の話|を記録|を追加|を削除)/g);
        if (keywords) {
            topics.add(msg.content.slice(0, 50));
        }
    }

    const summaryText = topics.size > 0
        ? `【これまでの会話サマリー】\n過去の会話で以下のトピックについて話しました: ${Array.from(topics).slice(0, 5).join('、')}...\n\n`
        : '';

    if (summaryText) {
        return [
            { role: 'user', content: summaryText },
            ...recentMessages
        ];
    }

    return recentMessages;
}

/**
 * 質問の回答進捗を更新し、セッションのチェックポイントも更新する
 */
export async function updateQuestionProgress(
    userId: string,
    sessionId: string,
    answeredQuestionId: string,
    answerSummary?: string
): Promise<void> {
    const question = HEALTH_QUESTIONS.find(q => q.id === answeredQuestionId);
    if (!question) return;

    // HealthQuestionProgress をupsert
    await prisma.healthQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId: answeredQuestionId } },
        create: {
            userId,
            questionId: answeredQuestionId,
            sectionId: question.sectionId,
            priority: question.priority,
            isAnswered: true,
            answerSummary: answerSummary || null,
        },
        update: {
            isAnswered: true,
            answerSummary: answerSummary || undefined,
        }
    });

    // 次の質問を算出してセッションのチェックポイントを更新
    const allAnswered = await prisma.healthQuestionProgress.findMany({
        where: { userId, isAnswered: true },
        select: { questionId: true }
    });
    const answeredIds = allAnswered.map(a => a.questionId);

    // 現在のセッションのpriorityを取得
    const session = await prisma.healthChatSession.findUnique({
        where: { id: sessionId },
        select: { currentPriority: true }
    });
    const currentPriority = (session?.currentPriority || 3) as 3 | 2 | 1;

    const nextQ = getNextQuestion(answeredIds, currentPriority);

    if (nextQ) {
        await prisma.healthChatSession.update({
            where: { id: sessionId },
            data: {
                currentQuestionId: nextQ.id,
                currentSectionId: nextQ.sectionId,
                currentPriority: nextQ.priority,
            }
        });
    } else {
        // 現在のpriorityが完了 → 次のpriorityへ
        const nextPriority = currentPriority === 3 ? 2 : currentPriority === 2 ? 1 : null;
        if (nextPriority) {
            const nextQInLowerPriority = getNextQuestion(answeredIds, nextPriority as 3 | 2 | 1);
            await prisma.healthChatSession.update({
                where: { id: sessionId },
                data: {
                    currentQuestionId: nextQInLowerPriority?.id || null,
                    currentSectionId: nextQInLowerPriority?.sectionId || null,
                    currentPriority: nextPriority,
                }
            });
        }
    }
}

/**
 * ユーザーの回答済み質問IDリストを取得
 */
export async function getAnsweredQuestionIds(userId: string): Promise<string[]> {
    const progress = await prisma.healthQuestionProgress.findMany({
        where: { userId, isAnswered: true },
        select: { questionId: true }
    });
    return progress.map(p => p.questionId);
}

export async function executeProfileAction(
    userId: string,
    action: ProfileAction
): Promise<{ success: boolean; error?: string }> {
    if (action.type === 'NONE') {
        return { success: true };
    }

    const sectionId = action.section_id;
    const sectionMeta = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === sectionId);
    if (!sectionMeta) {
        return { success: false, error: `Unknown section: ${sectionId}` };
    }

    const existingSection = await prisma.healthProfileSection.findUnique({
        where: { userId_categoryId: { userId, categoryId: sectionId } }
    });

    let newContent = existingSection?.content || '';

    switch (action.type) {
        case 'ADD':
            if (action.new_text) {
                newContent = newContent
                    ? `${newContent}\n${action.new_text}`
                    : action.new_text;
            }
            break;

        case 'UPDATE':
            if (action.target_text && action.new_text) {
                const lines = newContent.split('\n');
                const updatedLines = lines.map(line =>
                    line.includes(action.target_text!) ? action.new_text! : line
                );
                newContent = updatedLines.join('\n');
            }
            break;

        case 'DELETE':
            if (action.target_text) {
                const lines = newContent.split('\n');
                const filteredLines = lines.filter(line =>
                    !line.includes(action.target_text!)
                );
                newContent = filteredLines.join('\n').trim();
            }
            break;
    }

    await prisma.healthProfileSection.upsert({
        where: { userId_categoryId: { userId, categoryId: sectionId } },
        create: {
            userId,
            categoryId: sectionId,
            title: sectionMeta.title,
            content: newContent,
            orderIndex: sectionMeta.order
        },
        update: { content: newContent }
    });

    return { success: true };
}
