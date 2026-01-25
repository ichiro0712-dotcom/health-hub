'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Activity, Save, Plus, Copy, ChevronDown, ChevronUp, Trash2, Check, Loader2
} from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';
import {
    saveAllHealthProfileSections,
    addCustomCategory,
    deleteCategory,
} from '@/app/actions/health-profile';
import { DEFAULT_PROFILE_CATEGORIES, HealthProfileSectionData } from '@/constants/health-profile';

interface Props {
    initialSections: HealthProfileSectionData[];
}

export default function HealthProfileClient({ initialSections }: Props) {
    const [sections, setSections] = useState<HealthProfileSectionData[]>(initialSections);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(
        initialSections.filter(s => s.content.trim()).map(s => s.categoryId)
    ));
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryTitle, setNewCategoryTitle] = useState('');
    const textAreaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

    // セクションの展開/折りたたみ
    const toggleSection = (categoryId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
            // 展開時に高さを調整（次のレンダリング後に実行）
            setTimeout(() => {
                const textarea = textAreaRefs.current.get(categoryId);
                if (textarea) {
                    autoResizeTextarea(textarea);
                }
            }, 0);
        }
        setExpandedSections(newExpanded);
    };

    // 全展開/全折りたたみ
    const toggleAll = (expand: boolean) => {
        if (expand) {
            setExpandedSections(new Set(sections.map(s => s.categoryId)));
        } else {
            setExpandedSections(new Set());
        }
    };

    // テキストエリアの高さを自動調整
    const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const minHeight = 120; // 最小高さ（約5行）
        textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
    };

    // コンテンツ更新
    const updateContent = (categoryId: string, content: string) => {
        setSections(prev => prev.map(s =>
            s.categoryId === categoryId ? { ...s, content } : s
        ));
        setHasChanges(true);

        // 高さを自動調整
        const textarea = textAreaRefs.current.get(categoryId);
        if (textarea) {
            autoResizeTextarea(textarea);
        }
    };

    // 保存
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await saveAllHealthProfileSections(
                sections.map(s => ({
                    categoryId: s.categoryId,
                    title: s.title,
                    content: s.content,
                    orderIndex: s.orderIndex
                }))
            );

            if (result.success) {
                toast.success('保存しました');
                setHasChanges(false);
            } else {
                toast.error(result.error || '保存に失敗しました');
            }
        } catch {
            toast.error('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    // 新しいカテゴリを追加
    const handleAddCategory = async () => {
        if (!newCategoryTitle.trim()) {
            toast.error('カテゴリ名を入力してください');
            return;
        }

        const result = await addCustomCategory(newCategoryTitle.trim());
        if (result.success && result.categoryId) {
            const newSection: HealthProfileSectionData = {
                categoryId: result.categoryId,
                title: newCategoryTitle.trim(),
                content: '',
                orderIndex: sections.length + 1
            };
            setSections([...sections, newSection]);
            setExpandedSections(new Set([...expandedSections, result.categoryId]));
            setNewCategoryTitle('');
            setShowAddCategory(false);
            toast.success('カテゴリを追加しました');
        } else {
            toast.error(result.error || '追加に失敗しました');
        }
    };

    // カテゴリ削除
    const handleDeleteCategory = async (categoryId: string) => {
        const isDefault = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === categoryId);
        const message = isDefault
            ? 'このカテゴリの内容をクリアしますか？'
            : 'このカテゴリを削除しますか？';

        if (!confirm(message)) return;

        const result = await deleteCategory(categoryId);
        if (result.success) {
            if (isDefault) {
                setSections(prev => prev.map(s =>
                    s.categoryId === categoryId ? { ...s, content: '' } : s
                ));
                toast.success('内容をクリアしました');
            } else {
                setSections(prev => prev.filter(s => s.categoryId !== categoryId));
                toast.success('カテゴリを削除しました');
            }
        } else {
            toast.error(result.error || '削除に失敗しました');
        }
    };

    // 全情報をコピー
    const handleCopyAll = useCallback(() => {
        const lines: string[] = [];
        lines.push('【健康プロフィール】');
        lines.push(`出力日時: ${new Date().toLocaleString('ja-JP')}`);
        lines.push('');

        sections.forEach(section => {
            if (section.content.trim()) {
                lines.push(`【${section.title}】`);
                lines.push(section.content);
                lines.push('');
            }
        });

        const text = lines.join('\n');

        navigator.clipboard.writeText(text).then(() => {
            toast.success('全情報をコピーしました');
        }).catch(() => {
            toast.error('コピーに失敗しました');
        });
    }, [sections]);

    // 入力されているセクション数をカウント
    const filledCount = sections.filter(s => s.content.trim()).length;

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />

            {/* ヘッダー */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 md:top-16 z-30">
                <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-teal-500" />
                                健康プロフ
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {filledCount}/{sections.length} カテゴリ入力済み
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyAll}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                            >
                                <Copy className="w-4 h-4" />
                                <span className="hidden sm:inline">情報コピー</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !hasChanges}
                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : hasChanges ? (
                                    <Save className="w-4 h-4" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {isSaving ? '保存中...' : hasChanges ? '保存' : '保存済み'}
                            </button>
                        </div>
                    </div>

                    {/* 展開/折りたたみボタン */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => toggleAll(true)}
                            className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                        >
                            すべて展開
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                            onClick={() => toggleAll(false)}
                            className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                        >
                            すべて折りたたむ
                        </button>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
                <div className="space-y-3">
                    {sections.map((section) => {
                        const isExpanded = expandedSections.has(section.categoryId);
                        const hasContent = section.content.trim().length > 0;
                        const isCustom = !DEFAULT_PROFILE_CATEGORIES.find(c => c.id === section.categoryId);

                        return (
                            <div
                                key={section.categoryId}
                                className={`bg-white dark:bg-slate-800 rounded-xl border transition-all ${isExpanded
                                        ? 'border-teal-200 dark:border-teal-700 shadow-sm'
                                        : hasContent
                                            ? 'border-slate-200 dark:border-slate-700'
                                            : 'border-slate-100 dark:border-slate-700/50'
                                    }`}
                            >
                                {/* カテゴリヘッダー */}
                                <div
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl cursor-pointer"
                                    onClick={() => toggleSection(section.categoryId)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleSection(section.categoryId);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${hasContent ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {section.title}
                                        </span>
                                        {hasContent && (
                                            <span className="text-xs bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full font-medium">
                                                入力済み
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCategory(section.categoryId);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title={isCustom ? 'カテゴリを削除' : '内容をクリア'}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                </div>

                                {/* 編集エリア */}
                                {isExpanded && (
                                    <div className="px-4 pb-4">
                                        <textarea
                                            ref={(el) => {
                                                if (el) {
                                                    textAreaRefs.current.set(section.categoryId, el);
                                                    // 初期表示時に高さを調整
                                                    autoResizeTextarea(el);
                                                }
                                            }}
                                            value={section.content}
                                            onChange={(e) => updateContent(section.categoryId, e.target.value)}
                                            placeholder="ここに情報を入力..."
                                            className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-y font-mono leading-relaxed transition-[height] duration-75"
                                            style={{ minHeight: '120px' }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* カテゴリ追加 */}
                <div className="mt-6">
                    {showAddCategory ? (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newCategoryTitle}
                                    onChange={(e) => setNewCategoryTitle(e.target.value)}
                                    placeholder="新しいカテゴリ名（例：12. 趣味・その他）"
                                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCategory();
                                        if (e.key === 'Escape') {
                                            setShowAddCategory(false);
                                            setNewCategoryTitle('');
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
                                >
                                    追加
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddCategory(false);
                                        setNewCategoryTitle('');
                                    }}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddCategory(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:border-teal-300 dark:hover:border-teal-600 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            カテゴリを追加
                        </button>
                    )}
                </div>
            </div>

            {/* 未保存の変更がある場合の警告 */}
            {hasChanges && (
                <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
                    未保存の変更があります
                </div>
            )}
        </div>
    );
}
