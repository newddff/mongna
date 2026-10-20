'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './wiki-chapters.module.css';

export type WikiChapter = { id: string; title: string; content: string };

export function readWikiChapters(value: unknown): WikiChapter[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.filter((item): item is WikiChapter => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
        !item.id.startsWith('chapter-') || ids.has(item.id) ||
        typeof item.title !== 'string' || typeof item.content !== 'string') return false;
    ids.add(item.id);
    return true;
  });
}

export default function WikiChapterEditor({ chapter, onSave, onDelete, onClose }: {
  chapter: WikiChapter | null;
  onSave: (draft: { title: string; content: string }) => Promise<void>;
  onDelete: (() => Promise<void>) | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(chapter?.title || '');
  const [content, setContent] = useState(chapter?.content || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  const run = async (operation: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await operation();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '저장하지 못했어요. 다시 시도해주세요.');
    } finally { setSaving(false); }
  };

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="wiki-chapter-editor-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (!title.trim()) { setError('목차 제목을 입력해주세요.'); return; }
      void run(() => onSave({ title: title.trim(), content }));
    }}>
      <header className={styles.editorHeader}>
        <h2 id="wiki-chapter-editor-title">{chapter ? '목차 내용 편집' : '새 목차 추가'}</h2>
        <button type="button" disabled={saving} onClick={onClose} aria-label="편집 닫기">✕</button>
      </header>
      <label className={styles.field}>목차 제목
        <input autoFocus required maxLength={80} value={title} disabled={saving}
          onChange={event => setTitle(event.target.value)} placeholder="예: 몽나의 취향" />
      </label>
      <label className={styles.field}>내용
        <textarea maxLength={60000} value={content} disabled={saving}
          onChange={event => setContent(event.target.value)} placeholder="이 목차에 보여줄 내용을 적어주세요." />
      </label>
      <p className={styles.hint}>줄바꿈은 그대로 표시돼요. 저장 전까지 방문자에게 보이지 않아요.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.actions}>
        {onDelete && <button className={styles.delete} type="button" disabled={saving} onClick={() => {
          if (window.confirm('이 목차와 내용을 삭제할까요?')) void run(onDelete);
        }}>목차 삭제</button>}
        <span />
        <button type="button" disabled={saving} onClick={onClose}>취소</button>
        <button className={styles.primary} type="submit" disabled={saving}>{saving ? '저장 중…' : '저장하기'}</button>
      </footer>
    </form>
  </dialog>;
}
