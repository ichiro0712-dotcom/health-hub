/**
 * 3エージェント間で共有する型定義
 *
 * Profile Analyzer → Hearing AI → Profile Editor の3段階パイプライン
 */

import type { ProfileAction } from '@/lib/chat-prompts';

// ============================================
// Profile Analyzer (Stage 1)
// ============================================

export interface ProfileAnalyzerInput {
  profileContent: string;
  answeredQuestionIds: string[];
}

export interface ProfileIssue {
  type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED';
  sectionId: string;
  description: string;
  existingTexts: string[];
  suggestedResolution: string;
  suggestedAction: ProfileAction;
}

export interface MissingQuestion {
  questionId: string;
  question: string;
  sectionId: string;
  priority: number;
  reason: string;
}

export interface ProfileAnalyzerOutput {
  issues: ProfileIssue[];
  missingQuestions: MissingQuestion[];
}

// ============================================
// Hearing Agent (Stage 2)
// ============================================

export interface HearingAgentInput {
  currentQuestion: {
    id: string;
    question: string;
    sectionId: string;
    intent: string;
    extractionHints: string[];
  };
  existingSectionContent: string;
  conversationHistory: { role: string; content: string }[];
  isFirstQuestion: boolean;
  issuesForUser?: ProfileIssue[];
}

export interface ExtractedFact {
  hint: string;
  value: string;
  confidence: number;
}

export interface ExtractedData {
  questionId: string;
  extractedFacts: ExtractedFact[];
  sectionId: string;
  rawAnswer: string;
  isSkipped: boolean;
  needsClarification: boolean;
}

// ============================================
// Profile Editor (Stage 3)
// ============================================

export interface ProfileEditorInput {
  extractedData: ExtractedData;
  existingSectionContent: string;
  sectionId: string;
  sectionTitle: string;
}

export interface ProfileEditorOutput {
  actions: ProfileAction[];
  answeredQuestionId: string;
}
