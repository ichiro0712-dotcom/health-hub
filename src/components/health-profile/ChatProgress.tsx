'use client';

interface SectionProgress {
  id: string;
  name: string;
  priority3: { total: number; completed: number };
  priority2: { total: number; completed: number };
  priority1: { total: number; completed: number };
}

interface ChatProgressProps {
  sections: SectionProgress[];
}

// 完了率に応じた色
function getProgressColor(completed: number, total: number): string {
  if (total === 0) return 'bg-slate-300';
  const pct = (completed / total) * 100;
  if (pct === 100) return 'bg-teal-500';
  if (pct > 0) return 'bg-amber-400';
  return 'bg-slate-300 dark:bg-slate-600';
}

export default function ChatProgress({ sections }: ChatProgressProps) {
  // セクション番号を抽出
  const getSectionNumber = (name: string) => {
    const match = name.match(/^(\d+)\./);
    return match ? match[1] : '';
  };

  // セクション名を短縮（3文字）
  const getShortName = (name: string) => {
    const withoutNumber = name.replace(/^\d+\.\s*/, '');
    const firstPart = withoutNumber.split('・')[0];
    return firstPart.length > 3 ? firstPart.slice(0, 3) : firstPart;
  };

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
      {sections.map((section) => {
        const total = section.priority3.total + section.priority2.total + section.priority1.total;
        const completed = section.priority3.completed + section.priority2.completed + section.priority1.completed;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        const isComplete = percentage === 100;

        // 各優先度の完了状態（ドットで表現）
        const p3Done = section.priority3.total > 0 && section.priority3.completed === section.priority3.total;
        const p2Done = section.priority2.total > 0 && section.priority2.completed === section.priority2.total;
        const p1Done = section.priority1.total === 0 || section.priority1.completed === section.priority1.total;

        return (
          <div
            key={section.id}
            className={`px-1.5 py-1 rounded text-center ${
              isComplete
                ? 'bg-teal-100 dark:bg-teal-900/40'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {/* セクション番号・名前 */}
            <div className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate">
              {getSectionNumber(section.name)}.{getShortName(section.name)}
            </div>

            {/* 星3つ横並び + パーセント */}
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <span className={`text-[8px] ${p3Done ? 'text-red-500' : 'text-red-300 dark:text-red-900'}`}>★</span>
              <span className={`text-[8px] ${p2Done ? 'text-amber-500' : 'text-amber-300 dark:text-amber-900'}`}>★</span>
              <span className={`text-[8px] ${p1Done ? 'text-slate-500' : 'text-slate-300 dark:text-slate-700'}`}>★</span>
              <span className={`text-[9px] ml-0.5 font-bold ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                {percentage}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
