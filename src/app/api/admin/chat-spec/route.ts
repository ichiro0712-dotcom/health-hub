import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

const SPEC_FILES = [
  {
    id: 'v2-architecture',
    label: 'v2 アーキテクチャ設計',
    filename: 'NEW_CHAT_ARCHITECTURE.md',
  },
  {
    id: 'v1-spec',
    label: 'v1 仕様書（参考）',
    filename: 'CHAT_HEARING_SPEC.md',
  },
];

/**
 * GET /api/admin/chat-spec
 * 仕様マークダウンファイルを読み取って返す
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const docsDir = path.join(process.cwd(), 'docs');

    const specs = SPEC_FILES.map(spec => {
      const filePath = path.join(docsDir, spec.filename);
      let content = '';
      let lastModified: string | null = null;

      try {
        content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        lastModified = stats.mtime.toISOString();
      } catch {
        content = `ファイルが見つかりません: ${spec.filename}`;
      }

      return {
        id: spec.id,
        label: spec.label,
        filename: spec.filename,
        content,
        lastModified,
      };
    });

    return NextResponse.json({ success: true, data: specs });
  } catch (error) {
    console.error('GET /api/admin/chat-spec error:', error);
    return NextResponse.json(
      { success: false, error: '仕様ドキュメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}
