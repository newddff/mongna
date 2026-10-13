const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..'); const cache = new Map();
function load(relative) {
 const file = path.resolve(root, relative); if (cache.has(file)) return cache.get(file).exports;
 const mod = new Module(file, module);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,mod);
 const req=mod.require.bind(mod);mod.require=name=>name.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(file),name)+'.ts')):req(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return mod.exports;
}
const {Gomoku}=load('src/lib/board-games/gomoku.ts');
const {ConnectFour}=load('src/lib/board-games/connect-four.ts');
const {ChessGame}=load('src/lib/board-games/chess.ts');
const {Janggi,emptyJanggi,initialJanggi,janggiTargets,janggiCheck,generalsFace}=load('src/lib/board-games/janggi.ts');
const {VoteRound}=load('src/lib/board-games/vote-round.ts');
const {point}=load('src/lib/board-games/types.ts');
const target=(board,from,to)=>janggiTargets(board,point(from,10,9)).some(p=>p.r===point(to,10,9).r&&p.c===point(to,10,9).c);
const put=(board,square,side,type)=>{const p=point(square,10,9);board[p.r][p.c]={side,type};};
function position(pieces){const board=emptyJanggi();put(board,'e2',0,'g');put(board,'e9',1,'g');for(const [square,side,type] of pieces)put(board,square,side,type);return board;}
test('gomoku validates coordinates, occupied cells and garbage commands',()=>{
 const game=new Gomoku();assert.equal(game.normalize('H8'),'h8');assert.equal(game.normalize('!h8'),'h8');
 for(const text of ['p8','a0','a16','h8 hello','h88'])assert.equal(game.normalize(text),null);
 assert.ok(game.play('h8'));assert.equal(game.normalize('h8'),null);assert.equal(game.side,1);
});
test('gomoku finds wins in all four directions at the board edge',()=>{
 for(const cells of [['a1','b1','c1','d1','e1'],['a1','a2','a3','a4','a5'],['a1','b2','c3','d4','e5'],['a5','b4','c3','d2','e1']]){
  const g=new Gomoku();cells.forEach((p,i)=>{assert.ok(g.play(p));if(i<4)assert.ok(g.play('o'+(15-i)));});
  assert.equal(g.result.winner,0);assert.equal(g.moves().length,0);assert.equal(g.play('h8'),false);
 }
});
test('gomoku freestyle recognizes six-in-a-row',()=>{
 const g=new Gomoku();for(const sq of ['a1','b1','c1','e1','f1']){const p=point(sq,15,15);g.board[p.r][p.c]=0;}assert.ok(g.play('d1'));assert.equal(g.result.winner,0);
});
test('connect-four maintains gravity, rejects full columns and declares victory',()=>{
 const g=new ConnectFour();for(let i=0;i<6;i++)assert.ok(g.play('1'));assert.equal(g.play('1'),false);assert.equal(g.normalize('1abc'),null);
 const win=new ConnectFour();for(const move of ['1','2','1','2','1','2','1'])assert.ok(win.play(move));assert.equal(win.result.winner,0);
});
test('chess rejects illegal moves and accepts case/coordinate separators',()=>{
 const g=new ChessGame();assert.equal(g.normalize('e2e5'),null);assert.equal(g.normalize('E2 E4'),'e2e4');assert.equal(g.normalize('e2e4junk'),null);assert.ok(g.play('e2e4'));assert.equal(g.side,1);
});
test('chess implements castling and forbids castling through attacked squares',()=>{
 const g=new ChessGame('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');assert.ok(g.play('e1g1'));assert.equal(g.rules.get('f1').type,'r');
 const blocked=new ChessGame('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');assert.equal(blocked.normalize('e1g1'),null);
});
test('chess supports en passant and all four promotions',()=>{
 const ep=new ChessGame();for(const move of ['e2e4','a7a6','e4e5','d7d5'])assert.ok(ep.play(move));assert.ok(ep.play('e5d6'));assert.equal(ep.rules.get('d5'),undefined);
 for(const type of ['q','r','b','n']){const g=new ChessGame('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.ok(g.play('a7a8'+type));assert.equal(g.rules.get('a8').type,type);}
 const queen=new ChessGame('7k/P7/8/8/8/8/8/7K w - - 0 1');assert.equal(queen.normalize('a7a8'),'a7a8q');
});
test('chess detects checkmate, stalemate and threefold repetition',()=>{
 const mate=new ChessGame();for(const move of ['f2f3','e7e5','g2g4','d8h4'])assert.ok(mate.play(move));assert.equal(mate.result.reason,'체크메이트');assert.equal(mate.result.winner,1);
 const stale=new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');assert.equal(stale.result.reason,'스테일메이트');
 const repeated=new ChessGame();for(let i=0;i<2;i++)for(const move of ['g1f3','g8f6','f3g1','f6g8'])assert.ok(repeated.play(move));assert.equal(repeated.result.reason,'동일 국면 3회 반복');
});
test('janggi initial placement has 32 pieces and independent selectable formations',()=>{
 const b=initialJanggi('hehe','eheh');assert.equal(b.flat().filter(Boolean).length,32);assert.equal(b[9][1].type,'h');assert.equal(b[0][1].type,'e');assert.equal(b[8][4].type,'g');assert.equal(b[1][4].side,1);
});
test('janggi generals/guards stay within their own palace and use drawn diagonals',()=>{
 const b=position([['d1',0,'a']]);assert.ok(target(b,'e2','d3'));assert.equal(target(b,'e2','e4'),false);assert.equal(target(b,'d1','e1'),true);assert.equal(target(b,'d1','e2'),false);assert.equal(target(b,'d1','e3'),false);
});
test('janggi rook slides in a straight line, including palace diagonals',()=>{
 const b=emptyJanggi();put(b,'d10',0,'r');assert.ok(target(b,'d10','f8'));put(b,'e9',1,'s');assert.equal(target(b,'d10','f8'),false);assert.ok(target(b,'d10','e9'));
 const off=emptyJanggi();put(off,'d9',0,'r');assert.equal(target(off,'d9','e10'),false);
});
test('janggi cannon needs exactly one non-cannon screen and cannot capture cannons',()=>{
 const b=emptyJanggi();put(b,'a1',0,'c');assert.equal(target(b,'a1','a4'),false);put(b,'a2',0,'s');assert.ok(target(b,'a1','a4'));put(b,'a4',1,'c');assert.equal(target(b,'a1','a4'),false);put(b,'a2',0,'c');assert.equal(target(b,'a1','a3'),false);
 const diagonal=emptyJanggi();put(diagonal,'d10',0,'c');put(diagonal,'e9',1,'s');assert.ok(target(diagonal,'d10','f8'));assert.equal(target(diagonal,'d10','e9'),false);
});
test('janggi horse and elephant both obey their blocked movement legs',()=>{
 const b=emptyJanggi();put(b,'e5',0,'h');assert.ok(target(b,'e5','f7'));put(b,'e6',1,'s');assert.equal(target(b,'e5','f7'),false);assert.ok(target(b,'e5','g6'));
 const e=emptyJanggi();put(e,'e5',0,'e');assert.ok(target(e,'e5','g8'));put(e,'f7',1,'s');assert.equal(target(e,'e5','g8'),false);e[3][5]=null;put(e,'e6',1,'s');assert.equal(target(e,'e5','g8'),false);
});
test('janggi soldiers move forward/sideways, never backward, and use enemy palace forward diagonals',()=>{
 const b=emptyJanggi();put(b,'e9',0,'s');assert.ok(target(b,'e9','d10'));assert.equal(target(b,'e9','d8'),false);assert.ok(target(b,'e9','d9'));
 const own=emptyJanggi();put(own,'e2',0,'s');assert.equal(target(own,'e2','d3'),false);
 const red=emptyJanggi();put(red,'e2',1,'s');assert.ok(target(red,'e2','d1'));assert.equal(target(red,'e2','e3'),false);
});
test('janggi disallows self-check and passing while in check',()=>{
 const b=position([['e6',1,'r'],['e4',0,'r'],['a4',0,'s']]);const g=new Janggi('heeh','heeh',b);assert.equal(g.check(),false);assert.equal(g.normalize('e4d4'),null);assert.ok(g.normalize('e4e6'));
 const checked=new Janggi('heeh','heeh',position([['e4',1,'r']]));assert.equal(checked.check(),true);assert.equal(checked.normalize('쉼'),null);assert.equal(checked.normalize('빅장'),null);
});
test('janggi allows friendly pass and detects two consecutive passes',()=>{
 const g=new Janggi();assert.ok(g.play('쉼'));assert.ok(g.play('pass'));assert.equal(g.result.reason,'양쪽 한 수 쉼');
});
test('janggi bikjang can be accepted or resolved without treating generals as rook attacks',()=>{
 const b=position([['e5',0,'r'],['a4',0,'s'],['a7',1,'s']]);const g=new Janggi('heeh','heeh',b);assert.ok(g.play('e5d5'));assert.ok(generalsFace(g.board));assert.equal(g.check(),false);assert.equal(g.normalize('빅장'),'draw');assert.ok(g.play('빅장'));assert.equal(g.result.winner,null);
 const resolve=new Janggi('heeh','heeh',b);assert.ok(resolve.play('e5d5'));assert.ok(resolve.play('e9f9'));assert.equal(resolve.result,null);assert.equal(generalsFace(resolve.board),false);
});
test('janggi declares checkmate and never allows capturing the general',()=>{
 const b=emptyJanggi();put(b,'e2',0,'g');put(b,'e9',1,'g');put(b,'d4',0,'r');put(b,'f4',0,'r');put(b,'e5',0,'r');put(b,'a8',0,'r');
 const g=new Janggi('heeh','heeh',b);assert.equal(g.normalize('e5e9'),null);assert.ok(g.play('e5e8'));assert.equal(g.result.reason,'외통수');assert.equal(g.result.winner,0);
});
test('janggi threefold repetition includes the side to move',()=>{
 const b=position([['a1',0,'r'],['a10',1,'r'],['e5',0,'s']]);const g=new Janggi('heeh','heeh',b);
 for(let i=0;i<2;i++)for(const move of ['a1b1','a10b10','b1a1','b10a10'])assert.ok(g.play(move));assert.equal(g.result.reason,'동일 국면 3회 반복');
});
test('legal janggi moves preserve both generals and never leave own general attacked',()=>{
 const g=new Janggi();for(let step=0;step<50&&!g.result;step++){
 const moves=g.moves().filter(m=>m.from);assert.ok(moves.length);const move=moves[(step*7)%moves.length];const side=g.side;assert.ok(g.play(move.key));assert.equal(janggiCheck(g.board,side),false);assert.equal(g.board.flat().filter(p=>p?.type==='g').length,2);
 }
});
test('vote round counts only the first valid vote per user and distinguishes tied leaders',()=>{
 const g=new Gomoku(),v=new VoteRound();assert.equal(v.cast('u','bad',g),null);assert.equal(v.cast('u','H8',g),'h8');assert.equal(v.cast('u','h9',g),null);assert.equal(v.cast('v','h9',g),'h9');assert.deepEqual(v.leaders(g),['h8','h9']);assert.equal(v.size,2);
 assert.equal(v.cast('','h8',g),null);v.clear();assert.equal(v.size,0);assert.deepEqual(v.leaders(g),[]);
});
test('vote rounds reject occupied/illegal/stale moves and remain independent',()=>{
 const g=new Gomoku(),v=new VoteRound(),other=new VoteRound();v.cast('u','h8',g);assert.ok(g.play('h8'));assert.deepEqual(v.leaders(g),[]);assert.equal(other.size,0);
 const c=new ChessGame();assert.equal(other.cast('x','e2e5',c),null);assert.equal(other.cast('x','e2e4',c),'e2e4');
});
