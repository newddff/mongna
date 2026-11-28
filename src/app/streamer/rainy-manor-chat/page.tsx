'use client';

import { useEffect } from 'react';
import { useSoopChat } from '../../../lib/use-soop-chat';

export default function RainyManorChatBridge() {
  const { authenticated, connected, status } = useSoopChat(({ userId, text }) => {
    const vote = /^!추리\s+([1-4])$/.exec(text.trim())?.[1];
    if (!vote || !userId || window.parent === window) return;
    window.parent.postMessage({ type: 'rainy-manor-vote', userId, vote }, window.location.origin);
  });

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage(
      { type: 'rainy-manor-chat-state', authenticated, connected, status },
      window.location.origin,
    );
  }, [authenticated, connected, status]);

  return null;
}
