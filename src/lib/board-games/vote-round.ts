import { BoardEngine } from './types';
export class VoteRound {
  private voters = new Map<string, string>();
  private counts = new Map<string, number>();
  cast(userId: string, text: string, engine: BoardEngine) {
    if (!userId || this.voters.has(userId) || engine.result) return null;
    const key = engine.normalize(text); if (!key) return null;
    this.voters.set(userId, key); this.counts.set(key, (this.counts.get(key) || 0) + 1); return key;
  }
  get size() { return this.voters.size; }
  ranked() { return Array.from(this.counts, ([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count); }
  leaders(engine: BoardEngine) {
    const legal = new Set(engine.moves().map(move => move.key));
    const ranked = this.ranked().filter(vote => legal.has(vote.key));
    return ranked.length ? ranked.filter(vote => vote.count === ranked[0].count).map(vote => vote.key) : [];
  }
  clear() { this.voters.clear(); this.counts.clear(); }
}
