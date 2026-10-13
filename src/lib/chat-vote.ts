// Accept an exact column number, not strings such as "1번" or "7abc".
export function parseChatVote(text: string): number | null {
  const trimmed = text.trim();
  return /^[1-7]$/.test(trimmed) ? Number(trimmed) : null;
}
