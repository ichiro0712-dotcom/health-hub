import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { getExternalDataPreview, importExternalData } from '@/lib/external-data-importer';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface ChatRequest {
  message: string;
  sessionId?: string;
}

// システムプロンプトを生成
function buildSystemPrompt(
  currentQuestion: typeof HEALTH_QUESTIONS[0] | null,
  existingContent: string,
  answeredCount: number,
  totalPriority3: number
): string {
  // 既存内容から不足を判定するための追加指示
  const existingContentAnalysis = existingContent
    ? `
## 既存の情報（このセクションに記録済み）
${existingContent}

【重要】上記の既存情報を確認してください。
- 抽出すべき情報（${currentQuestion?.extractionHints.join(', ') || ''}）がすでに含まれている場合、「既に○○の情報がありますね」と確認してから次の質問へ進んでください
- 既存情報が曖昧、不完全、または意味をなさない場合は、改めて質問してください
- 質問の意図に沿った具体的な情報がない場合は質問してください`
    : '- このセクションにはまだ情報がありません';

  return `あなたは健康プロフィールのヒアリングを行うAIアシスタントです。

## 役割
- ユーザーから健康に関する情報を丁寧に聞き取る
- 1つずつ質問し、回答を待つ
- 回答から必要な情報を抽出し、プロフィールに反映できる形でまとめる
- **既存の情報がある場合は内容を確認し、不足があれば追加質問する**

## ルール
1. 1度に1つの質問のみ行う
2. 回答が曖昧な場合は確認の質問をする
3. 「ここまで保存して」と言われたら、保存完了を伝えて会話を終了する
4. 回答に対して簡潔な相槌やコメントを入れてから次の質問へ進む
5. ユーザーの回答から健康プロフィールに記載すべき情報を抽出する
6. **既存情報が意味をなさない場合（例：「あああ」「テスト」など）は無効とみなし、改めて質問する**

## 現在の状態
- 回答済み質問数: ${answeredCount}/${totalPriority3}（必須質問）
${existingContentAnalysis}

## 次の質問
${currentQuestion ? `
質問ID: ${currentQuestion.id}
セクション: ${DEFAULT_PROFILE_CATEGORIES.find(c => c.id === currentQuestion.sectionId)?.title || currentQuestion.sectionId}
質問: ${currentQuestion.question}
意図: ${currentQuestion.intent}
抽出すべき情報: ${currentQuestion.extractionHints.join(', ')}
` : '（すべての質問が完了しています）'}

## 回答形式
ユーザーの回答に対して:
1. 簡潔な相槌（1文）
2. 抽出した情報の確認（必要な場合）
3. 次の質問

回答から抽出した情報は、以下のJSON形式で最後に含めてください（ユーザーには見せません）:
<!--EXTRACTED_DATA
{
  "questionId": "${currentQuestion?.id || ''}",
  "sectionId": "${currentQuestion?.sectionId || ''}",
  "extractedInfo": {
    "項目名": "値"
  },
  "profileText": "プロフィールに追記するテキスト（箇条書き形式）",
  "existingDataValid": true または false（既存データが有効かどうか）
}
EXTRACTED_DATA-->`;
}

// Gemini APIを呼び出す（チャット用: Flash モデルで高速応答）
async function callGeminiAPI(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error('AI応答の取得に失敗しました');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// 抽出データをパースする
function parseExtractedData(response: string): {
  cleanResponse: string;
  extractedData: {
    questionId: string;
    sectionId: string;
    extractedInfo: Record<string, string>;
    profileText: string;
  } | null;
} {
  // 完全な形式でマッチを試みる
  const extractMatch = response.match(/<!--EXTRACTED_DATA\n([\s\S]*?)\nEXTRACTED_DATA-->/);

  // 不完全なEXTRACTED_DATAも含めて全て除去（AIが途中で切れた場合の対策）
  // <!--EXTRACTED_DATA 以降を全て除去
  let cleanResponse = response.replace(/<!--EXTRACTED_DATA[\s\S]*/g, '').trim();

  // もしcleanResponseが空になった場合（全体がEXTRACTED_DATAだった場合）、
  // 元のレスポンスから<!--より前を取得
  if (!cleanResponse && response.includes('<!--')) {
    cleanResponse = response.split('<!--')[0].trim();
  }

  // それでも空なら、デフォルトメッセージ
  if (!cleanResponse) {
    cleanResponse = 'ありがとうございます。次の質問に進みます。';
  }

  if (!extractMatch) {
    return { cleanResponse, extractedData: null };
  }

  try {
    const extractedData = JSON.parse(extractMatch[1]);
    return { cleanResponse, extractedData };
  } catch {
    return { cleanResponse, extractedData: null };
  }
}

// 進捗状況を計算
async function calculateProgress(userId: string) {
  const progress = await prisma.healthQuestionProgress.findMany({
    where: { userId, isAnswered: true }
  });

  const answeredIds = progress.map((p: { questionId: string }) => p.questionId);

  // セクション別の進捗
  const sectionProgress: Record<string, { priority3: { total: number; completed: number }; priority2: { total: number; completed: number }; priority1: { total: number; completed: number } }> = {};

  for (const category of DEFAULT_PROFILE_CATEGORIES) {
    const sectionQuestions = HEALTH_QUESTIONS.filter(q => q.sectionId === category.id);
    sectionProgress[category.id] = {
      priority3: {
        total: sectionQuestions.filter(q => q.priority === 3).length,
        completed: sectionQuestions.filter(q => q.priority === 3 && answeredIds.includes(q.id)).length
      },
      priority2: {
        total: sectionQuestions.filter(q => q.priority === 2).length,
        completed: sectionQuestions.filter(q => q.priority === 2 && answeredIds.includes(q.id)).length
      },
      priority1: {
        total: sectionQuestions.filter(q => q.priority === 1).length,
        completed: sectionQuestions.filter(q => q.priority === 1 && answeredIds.includes(q.id)).length
      }
    };
  }

  const totalQuestions = HEALTH_QUESTIONS.length;
  const answeredQuestions = answeredIds.length;
  const overallPercentage = Math.round((answeredQuestions / totalQuestions) * 100);

  return {
    overall: overallPercentage,
    answeredCount: answeredQuestions,
    totalCount: totalQuestions,
    sections: Object.entries(sectionProgress).map(([id, data]) => ({
      id,
      name: DEFAULT_PROFILE_CATEGORIES.find(c => c.id === id)?.title || id,
      ...data
    }))
  };
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'AI API not configured' }, { status: 500 });
    }

    // リクエストボディのパース
    let body: ChatRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { message, sessionId } = body;

    // 入力バリデーション
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // sessionIdのバリデーション（指定された場合）
    if (sessionId && typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    // 「ここまで保存して」の検出
    const isSaveRequest = /ここまで保存|保存して|終わり|やめ|中断/.test(trimmedMessage);

    // 「外部データ取り込み」コマンドの検出
    const isImportRequest = /診断データ|健診データ|検査データ|フィットネスデータ|fitbit|外部データ|データ.*読み込|データ.*取り込|インポート/.test(trimmedMessage.toLowerCase());

    // セッションを取得または作成（所有者検証付き）
    let session = sessionId
      ? await prisma.healthChatSession.findFirst({
          where: {
            id: sessionId,
            userId: user.id  // 🔒 所有者検証
          },
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        })
      : null;

    // セッションIDが指定されたが見つからない場合はエラー
    if (sessionId && !session) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    if (!session) {
      // 新しいセッションを作成
      session = await prisma.healthChatSession.create({
        data: {
          userId: user.id,
          status: 'active',
          currentPriority: 3,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });
    }

    // 以降はtrimmedMessageを使用（userMessageとして参照）
    const userMessage = trimmedMessage;

    // 回答済み質問を取得
    const answeredProgress = await prisma.healthQuestionProgress.findMany({
      where: { userId: user.id, isAnswered: true }
    });
    const answeredIds = answeredProgress.map((p: { questionId: string }) => p.questionId);

    // 次の質問を取得
    const currentPriority = session.currentPriority as 3 | 2 | 1;
    const nextQuestion = getNextQuestion(answeredIds, currentPriority);

    // 既存のセクション内容を取得
    const existingSection = nextQuestion
      ? await prisma.healthProfileSection.findUnique({
          where: { userId_categoryId: { userId: user.id, categoryId: nextQuestion.sectionId } }
        })
      : null;

    // 会話履歴を構築
    const conversationHistory = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content
    }));
    conversationHistory.push({ role: 'user', content: userMessage });

    // 保存リクエストの処理
    if (isSaveRequest) {
      await prisma.healthChatSession.update({
        where: { id: session.id },
        data: { status: 'paused' }
      });

      await prisma.healthChatMessage.createMany({
        data: [
          { sessionId: session.id, role: 'user', content: userMessage },
          { sessionId: session.id, role: 'assistant', content: 'ここまでの回答を保存しました。続きはいつでも再開できます。お疲れさまでした！' }
        ]
      });

      const progress = await calculateProgress(user.id);

      return NextResponse.json({
        success: true,
        response: 'ここまでの回答を保存しました。続きはいつでも再開できます。お疲れさまでした！',
        sessionId: session.id,
        sessionStatus: 'paused',
        progress
      });
    }

    // 外部データ取り込みリクエストの処理
    if (isImportRequest) {
      // 利用可能な外部データを確認
      const preview = await getExternalDataPreview(user.id);

      if (!preview.hasNewData && Object.keys(preview.available).length === 0) {
        // データがない場合
        const noDataResponse = '現在、取り込み可能な外部データはありません。\n\n健康診断データやFitbitなどのフィットネスデータを登録すると、こちらから取り込むことができます。';

        await prisma.healthChatMessage.createMany({
          data: [
            { sessionId: session.id, role: 'user', content: userMessage },
            { sessionId: session.id, role: 'assistant', content: noDataResponse }
          ]
        });

        const progress = await calculateProgress(user.id);

        return NextResponse.json({
          success: true,
          response: noDataResponse,
          sessionId: session.id,
          sessionStatus: 'active',
          progress
        });
      }

      // データがある場合は取り込み実行
      const sources: ('healthRecord' | 'fitData' | 'detailedSleep' | 'hrvData' | 'supplement')[] = [];
      if (preview.available.healthRecord) sources.push('healthRecord');
      if (preview.available.fitData) sources.push('fitData');
      if (preview.available.detailedSleep) sources.push('detailedSleep');
      if (preview.available.hrvData) sources.push('hrvData');
      if (preview.available.supplement) sources.push('supplement');

      const importResult = await importExternalData(user.id, sources, session.id);

      // レスポンスメッセージを構築
      let importResponse = '外部データを取り込みました！\n\n';

      if (importResult.questionsAnswered.length > 0) {
        importResponse += '【取り込んだ情報】\n';
        importResponse += importResult.questionsAnswered
          .map(q => `・${q.value}`)
          .join('\n');
        importResponse += '\n\n';
      }

      importResponse += importResult.summary;

      // 次の質問を取得
      const updatedAnsweredProgress = await prisma.healthQuestionProgress.findMany({
        where: { userId: user.id, isAnswered: true }
      });
      const updatedAnsweredIds = updatedAnsweredProgress.map((p: { questionId: string }) => p.questionId);
      const nextQuestionAfterImport = getNextQuestion(updatedAnsweredIds, currentPriority);

      if (nextQuestionAfterImport) {
        importResponse += `\n\nそれでは質問を続けます。\n\n${nextQuestionAfterImport.question}`;
      }

      await prisma.healthChatMessage.createMany({
        data: [
          { sessionId: session.id, role: 'user', content: userMessage },
          { sessionId: session.id, role: 'assistant', content: importResponse }
        ]
      });

      const progress = await calculateProgress(user.id);

      return NextResponse.json({
        success: true,
        response: importResponse,
        sessionId: session.id,
        sessionStatus: 'active',
        progress,
        updatedContent: importResult.profileUpdates.length > 0 ? {
          sectionId: importResult.profileUpdates[0].sectionId,
          appendedText: importResult.profileUpdates[0].addedText
        } : null
      });
    }

    // 重要度3完了チェック
    const priority3Questions = HEALTH_QUESTIONS.filter(q => q.priority === 3);
    const priority3Answered = priority3Questions.filter(q => answeredIds.includes(q.id));
    const allPriority3Complete = priority3Answered.length >= priority3Questions.length;

    // システムプロンプトを生成
    const systemPrompt = buildSystemPrompt(
      nextQuestion,
      existingSection?.content || '',
      answeredIds.length,
      priority3Questions.length
    );

    // AIからの応答を取得
    let aiResponse = await callGeminiAPI(conversationHistory, systemPrompt);

    // 抽出データをパース
    const { cleanResponse, extractedData } = parseExtractedData(aiResponse);

    // セッション状態を更新（先に次の質問を計算）
    const updatedAnsweredIds = extractedData
      ? [...answeredIds, extractedData.questionId]
      : answeredIds;
    const newNextQuestion = getNextQuestion(updatedAnsweredIds, currentPriority);

    // AIの応答に次の質問が含まれていない場合、追加する
    let finalResponse = cleanResponse;
    if (newNextQuestion && !cleanResponse.includes('？')) {
      finalResponse = `${cleanResponse}\n\nそれでは次の質問です。\n\n${newNextQuestion.question}`;
    }

    // DB処理を並列実行（パフォーマンス最適化）
    const dbOperations: Promise<unknown>[] = [
      // ユーザーメッセージを保存
      prisma.healthChatMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: userMessage
        }
      }),
      // AIレスポンスを保存
      prisma.healthChatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: finalResponse,
          questionId: newNextQuestion?.id
        }
      }),
      // セッション状態を更新
      prisma.healthChatSession.update({
        where: { id: session.id },
        data: {
          currentQuestionId: newNextQuestion?.id || null,
          currentSectionId: newNextQuestion?.sectionId || null
        }
      })
    ];

    // 抽出データがある場合、進捗と健康プロフを並列で更新
    if (extractedData && extractedData.questionId && extractedData.profileText) {
      // 質問進捗を更新
      dbOperations.push(
        prisma.healthQuestionProgress.upsert({
          where: { userId_questionId: { userId: user.id, questionId: extractedData.questionId } },
          create: {
            userId: user.id,
            questionId: extractedData.questionId,
            sectionId: extractedData.sectionId,
            priority: nextQuestion?.priority || 3,
            isAnswered: true,
            answerSummary: extractedData.profileText
          },
          update: {
            isAnswered: true,
            answerSummary: extractedData.profileText
          }
        })
      );

      // 健康プロフィールを更新（既存データ取得後に実行）
      const section = await prisma.healthProfileSection.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId: extractedData.sectionId } }
      });

      const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === extractedData.sectionId)?.title || extractedData.sectionId;
      const newContent = section?.content
        ? `${section.content}\n${extractedData.profileText}`
        : extractedData.profileText;

      dbOperations.push(
        prisma.healthProfileSection.upsert({
          where: { userId_categoryId: { userId: user.id, categoryId: extractedData.sectionId } },
          create: {
            userId: user.id,
            categoryId: extractedData.sectionId,
            title: sectionTitle,
            content: newContent,
            orderIndex: DEFAULT_PROFILE_CATEGORIES.findIndex(c => c.id === extractedData.sectionId) + 1
          },
          update: {
            content: newContent
          }
        })
      );
    }

    // 全DB操作を並列実行
    await Promise.all(dbOperations);

    const progress = await calculateProgress(user.id);

    return NextResponse.json({
      success: true,
      response: finalResponse,
      sessionId: session.id,
      sessionStatus: 'active',
      progress,
      allPriority3Complete,
      updatedContent: extractedData ? {
        sectionId: extractedData.sectionId,
        appendedText: extractedData.profileText
      } : null
    });

  } catch (error) {
    console.error('Health chat error:', error);
    return NextResponse.json({ error: 'チャット処理に失敗しました' }, { status: 500 });
  }
}
