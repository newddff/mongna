import { BoardEngine, Cell, Move, Point, Result, Side, coord, parseTravel } from './types';
export type JanggiPiece = { side: Side; type: 'g' | 'a' | 'r' | 'c' | 'h' | 'e' | 's' };
export type JanggiBoard = (JanggiPiece | null)[][];
export type Formation = 'heeh' | 'hehe' | 'eheh' | 'ehhe';
const inside = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 9;
const palace = (p: Point) => p.c >= 3 && p.c <= 5 && (p.r <= 2 || p.r >= 7) ? (p.r <= 2 ? 0 : 7) : -1;
const diagonalLines = [[{ r: 0, c: 3 }, { r: 1, c: 4 }, { r: 2, c: 5 }], [{ r: 0, c: 5 }, { r: 1, c: 4 }, { r: 2, c: 3 }], [{ r: 7, c: 3 }, { r: 8, c: 4 }, { r: 9, c: 5 }], [{ r: 7, c: 5 }, { r: 8, c: 4 }, { r: 9, c: 3 }]];
const same = (a: Point, b: Point) => a.r === b.r && a.c === b.c;
export function emptyJanggi(): JanggiBoard { return Array.from({ length: 10 }, () => Array(9).fill(null)); }
export function initialJanggi(cho: Formation = 'heeh', han: Formation = 'heeh'): JanggiBoard {
  const board = emptyJanggi();
  for (const side of [0, 1] as Side[]) {
    const back = side === 0 ? 9 : 0, king = side === 0 ? 8 : 1, cannon = side === 0 ? 7 : 2, soldier = side === 0 ? 6 : 3;
    board[back][0] = { side, type: 'r' }; board[back][8] = { side, type: 'r' };
    board[back][3] = { side, type: 'a' }; board[back][5] = { side, type: 'a' };
    const formation = side === 0 ? cho : han;
    [1, 2, 6, 7].forEach((c, i) => { board[back][c] = { side, type: formation[i] as 'h' | 'e' }; });
    board[king][4] = { side, type: 'g' };
    for (const c of [1, 7]) board[cannon][c] = { side, type: 'c' };
    for (const c of [0, 2, 4, 6, 8]) board[soldier][c] = { side, type: 's' };
  }
  return board;
}
function moveBoard(board: JanggiBoard, from: Point, to: Point): JanggiBoard {
  const next = board.map(row => row.slice()); next[to.r][to.c] = next[from.r][from.c]; next[from.r][from.c] = null; return next;
}
// Geometric attacks intentionally include the enemy general. Legal moves exclude
// general capture and filter self-check; palace diagonals follow drawn lines only.
export function janggiTargets(board: JanggiBoard, from: Point): Point[] {
  const piece = board[from.r]?.[from.c]; if (!piece) return [];
  const output: Point[] = [];
  const add = (r: number, c: number) => {
    if (inside(r, c) && board[r][c]?.side !== piece.side) output.push({ r, c });
  };
  const diagonalNeighbors = diagonalLines.flatMap(line => {
    const index = line.findIndex(p => same(p, from));
    return index < 0 ? [] : [line[index - 1], line[index + 1]].filter(Boolean);
  });
  if (piece.type === 'g' || piece.type === 'a') {
    const ownPalace = piece.side === 0 ? 7 : 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const target = { r: from.r + dr, c: from.c + dc }; if (palace(target) === ownPalace && inside(target.r, target.c)) add(target.r, target.c);
    }
    for (const target of diagonalNeighbors) if (palace(target) === ownPalace) add(target.r, target.c);
  } else if (piece.type === 's') {
    const forward = piece.side === 0 ? -1 : 1;
    add(from.r + forward, from.c); add(from.r, from.c - 1); add(from.r, from.c + 1);
    for (const target of diagonalNeighbors) if (target.r - from.r === forward && palace(target) === (piece.side === 0 ? 0 : 7)) add(target.r, target.c);
  } else if (piece.type === 'h' || piece.type === 'e') {
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const leg = { r: from.r + dr, c: from.c + dc };
      if (!inside(leg.r, leg.c) || board[leg.r][leg.c]) continue;
      for (const sign of [-1, 1]) {
        const diagonal = dr ? { r: dr, c: sign } : { r: sign, c: dc };
        const middle = { r: leg.r + diagonal.r, c: leg.c + diagonal.c };
        if (piece.type === 'h') add(middle.r, middle.c);
        else if (inside(middle.r, middle.c) && !board[middle.r][middle.c]) add(middle.r + diagonal.r, middle.c + diagonal.c);
      }
    }
  } else {
    const rays: Point[][] = [];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ray: Point[] = []; let r = from.r + dr, c = from.c + dc;
      while (inside(r, c)) { ray.push({ r, c }); r += dr; c += dc; } rays.push(ray);
    }
    for (const line of diagonalLines) {
      const index = line.findIndex(p => same(p, from));
      if (index >= 0) { rays.push(line.slice(index + 1)); rays.push(line.slice(0, index).reverse()); }
    }
    for (const ray of rays) {
      let screen = false;
      for (const target of ray) {
        const occupant = board[target.r][target.c];
        if (piece.type === 'r') {
          add(target.r, target.c); if (occupant) break;
        } else if (!screen) {
          if (occupant) { if (occupant.type === 'c') break; screen = true; }
        } else {
          if (occupant?.type !== 'c') add(target.r, target.c);
          if (occupant) break;
        }
      }
    }
  }
  return output;
}
export function janggiCheck(board: JanggiBoard, side: Side) {
  let general: Point | null = null;
  board.forEach((row, r) => row.forEach((piece, c) => { if (piece?.side === side && piece.type === 'g') general = { r, c }; }));
  if (!general) return true;
  return board.some((row, r) => row.some((piece, c) => piece && piece.side !== side && janggiTargets(board, { r, c }).some(p => same(p, general!))));
}
export function generalsFace(board: JanggiBoard) {
  const generals: Point[] = [];
  board.forEach((row, r) => row.forEach((piece, c) => { if (piece?.type === 'g') generals.push({ r, c }); }));
  if (generals.length !== 2 || generals[0].c !== generals[1].c) return false;
  for (let r = generals[0].r + 1; r < generals[1].r; r++) if (board[r][generals[0].c]) return false;
  return true;
}
const LABELS = { g: '궁', a: '사', r: '차', c: '포', h: '마', e: '상', s: '졸' };
export class Janggi implements BoardEngine {
  readonly kind = 'janggi' as const; readonly rows = 10; readonly cols = 9;
  board: JanggiBoard; side: Side = 0; result: Result | null = null; lastMove: Move | null = null;
  bikjangOffer: Side | null = null; passes = 0;
  private repetition = new Map<string, number>();
  constructor(cho: Formation = 'heeh', han: Formation = 'heeh', board?: JanggiBoard) { this.board = board || initialJanggi(cho, han); this.remember(); }
  cells(): Cell[][] { return this.board.map(row => row.map(piece => piece ? { side: piece.side, piece: piece.type, label: piece.type === 'g' ? (piece.side === 0 ? '楚' : '漢') : piece.type === 's' && piece.side === 1 ? '병' : LABELS[piece.type] } : null)); }
  check() { return janggiCheck(this.board, this.side); }
  moves(): Move[] {
    if (this.result) return [];
    const moves: Move[] = [];
    this.board.forEach((row, r) => row.forEach((piece, c) => {
      if (!piece || piece.side !== this.side) return;
      const from = { r, c };
      for (const to of janggiTargets(this.board, from)) {
        if (this.board[to.r][to.c]?.type === 'g' || janggiCheck(moveBoard(this.board, from, to), this.side)) continue;
        const key = coord(from, 10) + coord(to, 10);
        moves.push({ key, label: `${LABELS[piece.type]} ${coord(from, 10).toUpperCase()} → ${coord(to, 10).toUpperCase()}`, from, to });
      }
    }));
    if (!this.check()) {
      moves.push({ key: 'pass', label: '한 수 쉼' });
      if (generalsFace(this.board) && this.bikjangOffer !== this.side) moves.push({ key: 'draw', label: '빅장 수락' });
    }
    return moves;
  }
  normalize(text: string) {
    const value = text.trim().toLowerCase().replace(/^!/, '');
    let key: string;
    if (value === '쉼' || value === '한수쉼' || value === 'pass') key = 'pass';
    else if (value === '빅장' || value === 'draw') key = 'draw';
    else { const move = parseTravel(value, 10, 9); if (!move) return null; key = coord(move.from, 10) + coord(move.to, 10); }
    return this.moves().some(move => move.key === key) ? key : null;
  }
  play(text: string) {
    const key = this.normalize(text); if (!key) return false;
    const move = this.moves().find(move => move.key === key)!;
    const actor = this.side; this.lastMove = move;
    if (key === 'draw') { this.result = { winner: null, reason: '빅장 수락' }; return true; }
    if (move.from && move.to) { this.board = moveBoard(this.board, move.from, move.to); this.passes = 0; }
    else this.passes++;
    const facing = generalsFace(this.board);
    if (this.bikjangOffer !== null && this.bikjangOffer !== actor && facing) { this.result = { winner: null, reason: '빅장에 응한 무승부' }; return true; }
    if (this.passes >= 2) { this.result = { winner: null, reason: '양쪽 한 수 쉼' }; return true; }
    this.side = actor === 0 ? 1 : 0;
    this.bikjangOffer = facing && !this.check() ? actor : null;
    if (this.check() && !this.moves().length) { this.result = { winner: actor, reason: '외통수' }; return true; }
    if (this.board.every(row => row.every(piece => !piece || piece.type === 'g' || piece.type === 'a'))) { this.result = { winner: null, reason: '공격 가능한 기물이 없는 무승부' }; return true; }
    if (this.remember() >= 3) this.result = { winner: null, reason: '동일 국면 3회 반복' };
    return true;
  }
  private remember() {
    const key = JSON.stringify([this.side, this.board, this.bikjangOffer]);
    const count = (this.repetition.get(key) || 0) + 1; this.repetition.set(key, count); return count;
  }
}
