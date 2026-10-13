import { BoardEngine, Cell, Move, Result, Side } from './types';
export class ConnectFour implements BoardEngine {
  readonly kind = 'connect-four' as const; readonly rows = 6; readonly cols = 7;
  side: Side = 0; result: Result | null = null; lastMove: Move | null = null;
  board: (Side | null)[][] = Array.from({ length: 6 }, () => Array(7).fill(null));
  cells(): Cell[][] { return this.board.map(row => row.map(side => side === null ? null : { side, piece: 'stone', label: '●' })); }
  check() { return false; }
  moves(): Move[] {
    if (this.result) return [];
    const result: Move[] = [];
    for (let c = 0; c < 7; c++) for (let r = 5; r >= 0; r--) if (this.board[r][c] === null) {
      result.push({ key: String(c + 1), label: `${c + 1}번 열`, to: { r, c } }); break;
    }
    return result;
  }
  normalize(text: string) {
    const key = text.trim().replace(/^!/, '');
    return this.moves().some(move => move.key === key) ? key : null;
  }
  play(text: string) {
    const key = this.normalize(text); if (!key) return false;
    const move = this.moves().find(move => move.key === key)!;
    const p = move.to!; this.board[p.r][p.c] = this.side; this.lastMove = move;
    for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      let count = 1;
      for (const sign of [-1, 1]) {
        let r = p.r + dr * sign, c = p.c + dc * sign;
        while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === this.side) { count++; r += dr * sign; c += dc * sign; }
      }
      if (count >= 4) { this.result = { winner: this.side, reason: '네 돌 연결' }; return true; }
    }
    if (this.board.every(row => row.every(cell => cell !== null))) this.result = { winner: null, reason: '빈칸이 없는 무승부' };
    this.side = this.side === 0 ? 1 : 0; return true;
  }
}
