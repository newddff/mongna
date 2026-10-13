export type Side = 0 | 1;
export type Point = { r: number; c: number };
export type Cell = { side: Side; label: string; piece: string } | null;
export type Move = { key: string; label: string; from?: Point; to?: Point };
export type Result = { winner: Side | null; reason: string };
export interface BoardEngine {
  kind: 'connect-four' | 'gomoku' | 'chess' | 'janggi'; rows: number; cols: number;
  side: Side; result: Result | null; lastMove: Move | null;
  cells(): Cell[][]; moves(): Move[]; normalize(text: string): string | null;
  play(key: string): boolean; check(): boolean;
}
export const coord = (point: Point, rows: number) => String.fromCharCode(97 + point.c) + (rows - point.r);
export function point(text: string, rows: number, cols: number): Point | null {
  const match = /^([a-z])(\d{1,2})$/i.exec(text);
  if (!match) return null;
  const c = match[1].toLowerCase().charCodeAt(0) - 97, r = rows - Number(match[2]);
  return c >= 0 && c < cols && r >= 0 && r < rows ? { r, c } : null;
}
export function parseTravel(text: string, rows: number, cols: number, promotion = false) {
  const match = /^!?([a-z]\d{1,2})\s*(?:-|→)?\s*([a-z]\d{1,2})([qrbn]?)$/i.exec(text.trim());
  if (!match || (!promotion && match[3])) return null;
  const from = point(match[1], rows, cols), to = point(match[2], rows, cols);
  return from && to ? { from, to, promotion: match[3].toLowerCase() } : null;
}
