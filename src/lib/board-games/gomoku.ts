import { BoardEngine, Cell, Move, Result, Side, coord, point } from './types';
export class Gomoku implements BoardEngine {
  readonly kind = 'gomoku' as const; readonly rows = 15; readonly cols = 15;
  side: Side = 0; result: Result | null = null; lastMove: Move | null = null;
  board: (Side | null)[][] = Array.from({ length: 15 }, () => Array(15).fill(null));
  cells(): Cell[][] { return this.board.map(row => row.map(side => side === null ? null : { side, piece: 'stone', label: side === 0 ? '●' : '○' })); }
  check() { return false; }
  moves(): Move[] {
    if (this.result) return [];
    const result: Move[] = [];
    this.board.forEach((row, r) => row.forEach((value, c) => {
      if (value === null) { const key = coord({ r, c }, 15); result.push({ key, label: key.toUpperCase(), to: { r, c } }); }
    }));
    return result;
  }
  normalize(text: string) {
    const key = text.trim().replace(/^!/, '').toLowerCase();
    const p = point(key, 15, 15);
    return p && !this.result && this.board[p.r][p.c] === null ? coord(p, 15) : null;
  }
  play(text: string) {
    const key = this.normalize(text); if (!key) return false;
    const p = point(key, 15, 15)!; this.board[p.r][p.c] = this.side;
    this.lastMove = { key, label: key.toUpperCase(), to: p };
    const side = this.side;
    for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let count = 1;
      for (const sign of [-1, 1]) {
        let r = p.r + dr * sign, c = p.c + dc * sign;
        while (r >= 0 && r < 15 && c >= 0 && c < 15 && this.board[r][c] === side) { count++; r += dr * sign; c += dc * sign; }
      }
      if (count >= 5) { this.result = { winner: side, reason: '다섯 돌 연결' }; return true; }
    }
    if (this.board.every(row => row.every(cell => cell !== null))) this.result = { winner: null, reason: '빈칸이 없는 무승부' };
    this.side = side === 0 ? 1 : 0;
    return true;
  }
}
