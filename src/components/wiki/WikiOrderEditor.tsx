'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './wiki-chapters.module.css';

export type WikiNavigationItem = { id: string; title: string; icon?: string };

// 저장된 순서에서 중복·삭제된 항목은 빼고, 새 목차는 마지막에 붙입니다.
export function orderWikiItems(items: WikiNavigationItem[], order: unknown): WikiNavigationItem[] {
  const byId = new Map(items.map(item => [item.id, item]));
  const ordered: WikiNavigationItem[] = [];
  for (const id of Array.isArray(order) ? order : []) {
    const item = byId.get(id);
    if (item) { ordered.push(item); byId.delete(id); }
  }
  return [...ordered, ...Array.from(byId.values())];
}

export default function WikiOrderEditor({ items, onSave, onClose }: {
  items: WikiNavigationItem[];
  onSave: (ids: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(items);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  const move = (index: number, direction: number) => {
    const next = index + direction;
    if (next < 0 || next >= draft.length) return;
    setDraft(current => {
      const reordered = [...current];
      [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
      return reordered;
    });
  };

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="wiki-order-title"
    onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={async event => {
      event.preventDefault();
      if (saving) return;
      setSaving(true); setError('');
      try {
        await onSave(draft.map(item => item.id));
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '순서를 저장하지 못했어요. 다시 시도해주세요.');
      } finally { setSaving(false); }
    }}>
      <header className={styles.editorHeader}>
        <h2 id="wiki-order-title">목차 순서 편집</h2>
        <button type="button" disabled={saving} onClick={onClose} aria-label="순서 편집 닫기">✕</button>
      </header>
      <p className={styles.hint}>화살표로 위치를 옮긴 후 저장해주세요. 목차 번호도 함께 바뀌어요.</p>
      <ol className={styles.orderList} aria-label="목차 순서">
        {draft.map((item, index) => <li key={item.id} className={styles.orderRow}>
          <span className={styles.orderNumber}>{index + 1}</span>
          <span className={styles.orderTitle}>{item.icon ? `${item.icon} ` : ''}{item.title}</span>
          <button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)} aria-label={`${item.title} 위로 이동`}>↑</button>
          <button type="button" disabled={saving || index === draft.length - 1} onClick={() => move(index, 1)} aria-label={`${item.title} 아래로 이동`}>↓</button>
        </li>)}
      </ol>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer className={styles.actions}>
        <span />
        <button type="button" disabled={saving} onClick={onClose}>취소</button>
        <button className={styles.primary} type="submit" disabled={saving}>{saving ? '저장 중…' : '순서 저장하기'}</button>
      </footer>
    </form>
  </dialog>;
}
