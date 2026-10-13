import { Chess as ChessRules } from 'chess.js';
import { BoardEngine, Cell, Move, Result, Side, coord, parseTravel, point } from './types';
const SYMBOLS = { w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } };
export class ChessGame implements BoardEngine {
  readonly kind = 'chess' as const; readonly rows = 8; readonly cols = 8;
  rules: ChessRules; lastMove: Move | null = null;
  constructor(fen?: string) { this.rules = fen ? new ChessRules(fen) : new ChessRules(); }
  get side(): Side { return this.rules.turn() === 'w' ? 0 : 1; }
  get result(): Result | null {
    if (this.rules.isCheckmate()) return { winner: this.side === 0 ? 1 : 0, reason: '체크메이트' };
    if (this.rules.isStalemate()) return { winner: null, reason: '스테일메이트' };
    if (this.rules.isThreefoldRepetition()) return { winner: null, reason: '동일 국면 3회 반복' };
    if (this.rules.isInsufficientMaterial()) return { winner: null, reason: '체크메이트 불가능한 기물' };
    if (this.rules.isDraw()) return { winner: null, reason: '무승부' };
    return null;
  }
  check() { return this.rules.inCheck(); }
  cells(): Cell[][] { return this.rules.board().map(row => row.map(piece => piece ? { side: piece.color === 'w' ? 0 : 1, label: SYMBOLS[piece.color][piece.type], piece: piece.type } : null)); }
  moves(): Move[] {
    if (this.result) return [];
    return this.rules.moves({ verbose: true }).map(move => ({ key: move.from + move.to + (move.promotion || ''), label: move.san, from: point(move.from, 8, 8)!, to: point(move.to, 8, 8)! }));
  }
  normalize(text: string) {
    const parsed = parseTravel(text, 8, 8, true); if (!parsed || this.result) return null;
    const base = coord(parsed.from, 8) + coord(parsed.to, 8);
    const moves = this.moves();
    const exact = base + parsed.promotion;
    if (moves.some(move => move.key === exact)) return exact;
    // No promotion suffix means queen; explicit q/r/b/n is always respected.
    if (!parsed.promotion && moves.some(move => move.key === base + 'q')) return base + 'q';
    return null;
  }
  play(text: string) {
    const key = this.normalize(text); if (!key) return false;
    const selected = this.moves().find(move => move.key === key)!;
    try { this.rules.move({ from: key.slice(0, 2), to: key.slice(2, 4), ...(key[4] ? { promotion: key[4] } : {}) }); }
    catch { return false; }
    this.lastMove = selected; return true;
  }
}
