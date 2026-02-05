import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { HEALTH_QUESTIONS, getNextQuestion, getAllPriority3Questions } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// AIでプロフィール内容を検証し、質問が回答済みかどうかを判定
async function validateExistingContent(
  userId: string,
  existingProfiles: { categoryId: string; content: string }[]
): Promise<{ questionId: string; isAnswered: boolean }[]> {
  console.log('[AI Validation] Starting validation for user:', userId);
  console.log('[AI Validation] Received profiles:', existingProfiles.map(p => ({
    categoryId: p.categoryId,
    contentLength: p.content?.length || 0,
    contentPreview: p.content?.substring(0, 100) || '(empty)'
  })));

  if (!GOOGLE_API_KEY) {
    console.warn('[AI Validation] GOOGLE_API_KEY not set, skipping AI validation');
    return [];
  }

  // 内容があるセクションのみ検証対象
  const sectionsWithContent = existingProfiles.filter(p => p.content && p.content.trim().length > 10);
  console.log('[AI Validation] Sections with content (>10 chars):', sectionsWithContent.length);

  if (sectionsWithContent.length === 0) {
    console.log('[AI Validation] No sections with content, returning empty');
    return [];
  }

  // 検証対象の質問を収集（内容があるセクションの質問のみ）
  const questionsToValidate = HEALTH_QUESTIONS.filter(q =>
    sectionsWithContent.some(s => s.categoryId === q.sectionId)
  );
  console.log('[AI Validation] Questions to validate:', questionsToValidate.map(q => q.id));

  if (questionsToValidate.length === 0) {
    console.log('[AI Validation] No questions to validate, returning empty');
    return [];
  }

  // セクション別に質問と既存内容をまとめる
  const validationData = sectionsWithContent.map(section => {
    const sectionQuestions = questionsToValidate.filter(q => q.sectionId === section.categoryId);
    const sectionName = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === section.categoryId)?.title || section.categoryId;
    return {
      sectionId: section.categoryId,
      sectionName,
      content: section.content,
      questions: sectionQuestions.map(q => ({
        id: q.id,
        question: q.question,
        extractionHints: q.extractionHints
      }))
    };
  }).filter(s => s.questions.length > 0);

  if (validationData.length === 0) {
    console.log('[AI Validation] No validation data after filtering, returning empty');
    return [];
  }

  console.log('[AI Validation] Validation data prepared:', validationData.map(s => ({
    sectionId: s.sectionId,
    questionCount: s.questions.length,
    questionIds: s.questions.map(q => q.id)
  })));

  // AIに一括検証を依頼
  const prompt = `あなたは健康プロフィールの内容を検証するAIです。

## タスク
以下の各セクションについて、既存のプロフィール内容に各質問への有効な回答が含まれているか判定してください。

## 判定基準
- 質問の「抽出すべき情報」に対応する具体的な情報が含まれている → 回答済み (true)
- 内容が曖昧、不完全、または意味をなさない（例：「あああ」「テスト」「ぼぼぼ」） → 未回答 (false)
- 数値が必要な項目に数値がない → 未回答 (false)
- 情報が全くない → 未回答 (false)

## 入力データ
${validationData.map(s => `
### セクション: ${s.sectionName}
既存の内容:
${s.content}

質問一覧:
${s.questions.map(q => `- ${q.id}: ${q.question} (抽出すべき情報: ${q.extractionHints.join(', ')})`).join('\n')}
`).join('\n')}

## 出力形式（JSON配列のみ、他の文字は不要）
[
  {"questionId": "1-1", "isAnswered": true},
  {"questionId": "1-2", "isAnswered": false},
  ...
]`;

  console.log('[AI Validation] Sending prompt to Gemini API...');

  try {
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
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Validation] API error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[AI Validation] AI response (first 500 chars):', responseText.substring(0, 500));

    // JSONを抽出
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('[AI Validation] Failed to extract JSON from response:', responseText);
      return [];
    }

    const results = JSON.parse(jsonMatch[0]) as { questionId: string; isAnswered: boolean }[];
    console.log('[AI Validation] Parsed results:', results);

    // 回答済みと判定された質問を明示的にログ
    const answeredQuestions = results.filter(r => r.isAnswered);
    console.log('[AI Validation] Questions marked as ANSWERED:', answeredQuestions.map(r => r.questionId));

    return results;
  } catch (error) {
    console.error('[AI Validation] Error:', error);
    return [];
  }
}

// セッション状態の取得（再開用）
export async function GET(req: NextRequest) {
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

    // アクティブまたは一時停止中のセッションを取得
    const session = await prisma.healthChatSession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'paused'] }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // 回答済み質問を取得（チャットで回答したもののみ）
    // 注: 直接入力された内容はAIが会話中に検証して、有効かどうか判断する
    const answeredProgress = await prisma.healthQuestionProgress.findMany({
      where: { userId: user.id, isAnswered: true }
    });
    const answeredIds = answeredProgress.map((p: { questionId: string }) => p.questionId);

    // 進捗状況を計算
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

    // 次の質問を取得
    const currentPriority = (session?.currentPriority || 3) as 3 | 2 | 1;
    const nextQuestion = getNextQuestion(answeredIds, currentPriority);

    // 重要度3完了チェック
    const priority3Questions = getAllPriority3Questions();
    const allPriority3Complete = priority3Questions.every(q => answeredIds.includes(q.id));

    return NextResponse.json({
      hasActiveSession: !!session,
      sessionId: session?.id || null,
      sessionStatus: session?.status || null,
      canResume: session?.status === 'paused',
      lastMessage: session?.messages[0]?.content || null,
      nextQuestion: nextQuestion ? {
        id: nextQuestion.id,
        question: nextQuestion.question,
        sectionId: nextQuestion.sectionId,
        sectionName: DEFAULT_PROFILE_CATEGORIES.find(c => c.id === nextQuestion.sectionId)?.title || nextQuestion.sectionId
      } : null,
      allPriority3Complete,
      progress: {
        overall: overallPercentage,
        answeredCount: answeredQuestions,
        totalCount: totalQuestions,
        sections: Object.entries(sectionProgress).map(([id, data]) => ({
          id,
          name: DEFAULT_PROFILE_CATEGORIES.find(c => c.id === id)?.title || id,
          ...data
        }))
      }
    });

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json({ error: 'セッション情報の取得に失敗しました' }, { status: 500 });
  }
}

// 新しいセッションを開始、または一時停止中のセッションを再開
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

    // 一時停止中のセッションがあれば再開
    const pausedSession = await prisma.healthChatSession.findFirst({
      where: {
        userId: user.id,
        status: 'paused'
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (pausedSession) {
      console.log('[Session Resume] Resuming paused session:', pausedSession.id);

      // セッションを再開
      await prisma.healthChatSession.update({
        where: { id: pausedSession.id },
        data: { status: 'active' }
      });

      // 既存の健康プロフィール内容を取得してAIで検証（再開時も最新状態を反映）
      const existingProfiles = await prisma.healthProfileSection.findMany({
        where: { userId: user.id },
        select: { categoryId: true, content: true }
      });
      console.log('[Session Resume] Found existing profiles:', existingProfiles.length);

      // AIで既存内容を検証
      const validationResults = await validateExistingContent(user.id, existingProfiles);
      console.log('[Session Resume] Validation results count:', validationResults.length);

      // 検証結果を HealthQuestionProgress に記録
      let upsertedCount = 0;
      for (const result of validationResults) {
        if (result.isAnswered) {
          const question = HEALTH_QUESTIONS.find(q => q.id === result.questionId);
          if (question) {
            await prisma.healthQuestionProgress.upsert({
              where: { userId_questionId: { userId: user.id, questionId: result.questionId } },
              create: {
                userId: user.id,
                questionId: result.questionId,
                sectionId: question.sectionId,
                priority: question.priority,
                isAnswered: true,
                answerSummary: '（既存プロフィールにて回答済み - AI検証）'
              },
              update: {} // 既に回答済みなら更新しない
            });
            upsertedCount++;
            console.log('[Session Resume] Upserted progress for question:', result.questionId);
          }
        }
      }
      console.log('[Session Resume] Total questions marked as answered:', upsertedCount);

      // 回答済み質問を取得して次の質問を決定
      const answeredProgress = await prisma.healthQuestionProgress.findMany({
        where: { userId: user.id, isAnswered: true }
      });
      const answeredIds = answeredProgress.map((p: { questionId: string }) => p.questionId);
      console.log('[Session Resume] All answered question IDs:', answeredIds);

      const currentPriority = pausedSession.currentPriority as 3 | 2 | 1;
      const nextQuestion = getNextQuestion(answeredIds, currentPriority);
      console.log('[Session Resume] Next question:', nextQuestion?.id || 'none');

      const sectionName = nextQuestion
        ? DEFAULT_PROFILE_CATEGORIES.find(c => c.id === nextQuestion.sectionId)?.title
        : '';

      // 再開メッセージを追加
      const resumeMessage = nextQuestion
        ? `お帰りなさい！前回の続きから再開しましょう。\n\n次の質問です。\n\n${nextQuestion.question}`
        : '前回のセッションを再開しました。';

      await prisma.healthChatMessage.create({
        data: {
          sessionId: pausedSession.id,
          role: 'assistant',
          content: resumeMessage,
          questionId: nextQuestion?.id || null
        }
      });

      // 既存のメッセージ + 再開メッセージを返す
      const existingMessages = pausedSession.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content
      }));

      return NextResponse.json({
        success: true,
        sessionId: pausedSession.id,
        isResumed: true,
        messages: [...existingMessages, { role: 'assistant', content: resumeMessage }],
        welcomeMessage: resumeMessage,
        nextQuestion: nextQuestion ? {
          id: nextQuestion.id,
          question: nextQuestion.question,
          sectionId: nextQuestion.sectionId,
          sectionName
        } : null
      });
    }

    // 新しいセッションを作成
    console.log('[Session New] Creating new session for user:', user.id);

    // 既存のアクティブセッションを一時停止
    await prisma.healthChatSession.updateMany({
      where: {
        userId: user.id,
        status: 'active'
      },
      data: { status: 'paused' }
    });

    // 既存の健康プロフィール内容を取得してAIで検証
    const existingProfiles = await prisma.healthProfileSection.findMany({
      where: { userId: user.id },
      select: { categoryId: true, content: true }
    });
    console.log('[Session New] Found existing profiles:', existingProfiles.length);

    // AIで既存内容を検証し、回答済みの質問を特定
    const validationResults = await validateExistingContent(user.id, existingProfiles);
    console.log('[Session New] Validation results count:', validationResults.length);

    // 検証結果を HealthQuestionProgress に記録
    let upsertedCount = 0;
    for (const result of validationResults) {
      if (result.isAnswered) {
        const question = HEALTH_QUESTIONS.find(q => q.id === result.questionId);
        if (question) {
          await prisma.healthQuestionProgress.upsert({
            where: { userId_questionId: { userId: user.id, questionId: result.questionId } },
            create: {
              userId: user.id,
              questionId: result.questionId,
              sectionId: question.sectionId,
              priority: question.priority,
              isAnswered: true,
              answerSummary: '（既存プロフィールにて回答済み - AI検証）'
            },
            update: {} // 既に回答済みなら更新しない
          });
          upsertedCount++;
          console.log('[Session New] Upserted progress for question:', result.questionId);
        }
      }
    }
    console.log('[Session New] Total questions marked as answered:', upsertedCount);

    // 回答済み質問を取得して次の質問を決定
    const answeredProgress = await prisma.healthQuestionProgress.findMany({
      where: { userId: user.id, isAnswered: true }
    });
    const answeredIds = answeredProgress.map((p: { questionId: string }) => p.questionId);
    console.log('[Session New] All answered question IDs:', answeredIds);

    const nextQuestion = getNextQuestion(answeredIds, 3);
    console.log('[Session New] Next question:', nextQuestion?.id || 'none');

    // 新しいセッションを作成
    const session = await prisma.healthChatSession.create({
      data: {
        userId: user.id,
        status: 'active',
        currentPriority: 3,
        currentSectionId: nextQuestion?.sectionId || null,
        currentQuestionId: nextQuestion?.id || null
      }
    });

    // 初期メッセージを追加
    const sectionName = nextQuestion
      ? DEFAULT_PROFILE_CATEGORIES.find(c => c.id === nextQuestion.sectionId)?.title
      : '';

    const welcomeMessage = nextQuestion
      ? `こんにちは！健康プロフィールを一緒に埋めていきましょう。\n\n途中で辞めたいときは「ここまで保存して」と言ってください。\n\nそれでは、「${sectionName}」から始めましょう。\n\n${nextQuestion.question}`
      : 'こんにちは！健康プロフィールはすでに完成しています。追加で質問があれば何でもお聞きください。';

    await prisma.healthChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: welcomeMessage,
        questionId: nextQuestion?.id || null
      }
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      isResumed: false,
      messages: [{ role: 'assistant', content: welcomeMessage }],
      welcomeMessage,
      nextQuestion: nextQuestion ? {
        id: nextQuestion.id,
        question: nextQuestion.question,
        sectionId: nextQuestion.sectionId,
        sectionName
      } : null
    });

  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json({ error: 'セッション作成に失敗しました' }, { status: 500 });
  }
}
