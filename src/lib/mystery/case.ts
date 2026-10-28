import scenario from './scenario.json';
export const blocks = scenario.blocks as Record<string, { title: string; lines: string[] }>;
export const spots = scenario.spots as { id: string; name: string; clue: string | null; text: string; room: string }[];
export const suspects = [
 {id:'dohyeon',name:'서도현',role:'재단 이사장 대행',age:44,position:'0% 0%',intro:'숙부의 그늘 아래 재단을 이끌어 온 실무형 후계자.',questions:['dialogue_01','dialogue_02','dialogue_03'],fallback:'dialogue_29'},
 {id:'taeo',name:'강태오',role:'가문 담당 변호사',age:56,position:'100% 0%',intro:'내일 아침 서류에 서명을 받으러 온 오랜 법률 자문.',questions:['dialogue_09','dialogue_10','dialogue_11'],fallback:'dialogue_30'},
 {id:'serin',name:'오세린',role:'양녀 · 화가',age:31,position:'0% 100%',intro:'열 살부터 이 집에서 자란, 말수 적은 화가.',questions:['dialogue_15','dialogue_16','dialogue_17'],fallback:'dialogue_31'},
 {id:'hayoon',name:'문하윤',role:'수석 큐레이터',age:38,position:'100% 100%',intro:'11년 동안 컬렉션을 보관하고 기록한 사람.',questions:['dialogue_21','dialogue_22','dialogue_23'],fallback:'dialogue_32'},
];
export const rooms = [
 {id:'study',name:'2층 서재',subtitle:'마지막 대화가 멈춘 자리',position:'0% 0%'},
 {id:'hall',name:'현관 · 응접실',subtitle:'젖은 옷과 남겨진 말들',position:'100% 0%'},
 {id:'outside',name:'테라스 · 차고',subtitle:'관리실의 기록을 찾아서',position:'0% 100%'},
 {id:'vault',name:'지하 수장고',subtitle:'닫힌 문 너머의 진실',position:'100% 100%'},
];
export type GameState={started:boolean;prologue:number;found:string[];seen:string[];links:string[];notes:string;hint:number;vaultOpen:boolean;won:boolean};
export const fresh=():GameState=>({started:false,prologue:0,found:[],seen:[],links:[],notes:'',hint:0,vaultOpen:false,won:false});
export const unique=(values:string[])=>Array.from(new Set(values));
export function restore(raw:unknown):GameState {
 if(!raw||typeof raw!=='object') return fresh();const d=raw as Partial<GameState>;
 const strings=(v:unknown)=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
 return{started:d.started===true,prologue:Math.max(0,Math.min(6,Number(d.prologue)||0)),found:strings(d.found).filter(x=>spots.some(s=>s.clue===x)),seen:strings(d.seen).filter(x=>!!blocks[x]),links:strings(d.links).filter(x=>rules.some(r=>r.id===x)),notes:typeof d.notes==='string'?d.notes.slice(0,3000):'',hint:Math.max(0,Math.min(3,Number(d.hint)||0)),vaultOpen:d.vaultOpen===true,won:d.won===true};
}
export const rules = [
 {id:'link_01',person:'dohyeon',clue:'clue_06',requires:['dialogue_03'],dialogue:'dialogue_04',title:'응접실에만 있었다는 거짓말'},
 {id:'link_02',person:'dohyeon',clue:'clue_08',requires:['dialogue_04'],dialogue:'dialogue_06',title:'테라스에 혼자가 아니었다'},
 {id:'link_03',person:'taeo',clue:'clue_08',requires:['dialogue_11'],dialogue:'dialogue_12',title:'객실이 아닌 테라스'},
 {id:'link_04',person:'serin',clue:'clue_07',requires:['dialogue_17'],dialogue:'dialogue_18',title:'방 밖으로 나간 화가'},
 {id:'link_05',person:'serin',clue:'clue_09',requires:['dialogue_18'],dialogue:'dialogue_19',title:'짐을 싣고 있던 이유'},
 {id:'link_06a',person:'dohyeon',clue:'clue_05',requires:['dialogue_04'],dialogue:'dialogue_07',title:'재단 이체 내역과 동기'},
 {id:'link_06b',person:'taeo',clue:'clue_05',requires:['dialogue_10'],dialogue:'dialogue_13',title:'변호사가 숨긴 자문료'},
 {id:'link_07a',person:'dohyeon',clue:'clue_10',requires:['dialogue_03'],dialogue:'dialogue_08',title:'도현의 소재 확인'},
 {id:'link_07b',person:'taeo',clue:'clue_10',requires:['dialogue_11'],dialogue:'dialogue_14',title:'태오의 소재 확인'},
 {id:'link_08',person:'serin',clue:'clue_10',requires:['dialogue_17'],dialogue:'dialogue_20',title:'세린의 소재와 장갑 증언'},
 {id:'link_09',person:'hayoon',clue:'clue_11',requires:['dialogue_23'],dialogue:'dialogue_26',title:'수장고 밖의 29분'},
 {id:'link_10',person:'hayoon',clue:'clue_12',requires:['dialogue_26'],dialogue:'dialogue_28',title:'사라진 서류철의 행방'},
 {id:'link_11',person:'hayoon',clue:'clue_02',requires:['dialogue_22'],dialogue:'dialogue_24',title:'면담 메모만으로는 부족하다'},
 {id:'link_12',person:'hayoon',clue:'clue_04',requires:['dialogue_22'],dialogue:'dialogue_25',title:'덧신만으로는 지목할 수 없다'},
];
export function roomOpen(room:string,s:GameState){return room==='study'||room==='hall'||(room==='outside'&&s.links.includes('link_01'))||(room==='vault'&&['link_07a','link_07b','link_08'].every(x=>s.links.includes(x)));}
export function openVault(s:GameState){return s.found.includes('clue_05')&&s.found.includes('clue_11')&&s.links.includes('link_09');}
export function finalOpen(s:GameState){return s.links.includes('link_10')&&['clue_10','clue_11','clue_12'].every(x=>s.found.includes(x));}
export function present(s:GameState,person:string,clue:string){
 if(!s.found.includes(clue))return{state:s,dialogue:'',message:'먼저 현장에서 증거를 수집해주세요.'};
 const rule=rules.find(r=>r.person===person&&r.clue===clue);
 if(rule&&!rule.requires.every(q=>s.seen.includes(q)))return{state:s,dialogue:'',message:'이 증거와 비교할 증언을 먼저 들어보세요. 기본 질문 또는 앞서 달라진 진술을 확인해주세요.'};
 if(!rule)return{state:s,dialogue:suspects.find(p=>p.id===person)?.fallback||'',message:''};
 return{state:{...s,seen:unique([...s.seen,rule.dialogue]),links:unique([...s.links,rule.id])},dialogue:rule.dialogue,message:''};
}
export function phase(s:GameState){return finalOpen(s)?5:s.found.includes('clue_12')?4:s.links.includes('link_09')?4:roomOpen('vault',s)?3:s.found.includes('clue_10')?2:roomOpen('outside',s)?1:0;}
export const reasons=[
 {id:'route',text:'21:38 수장고에서 나와 뒷계단·서고 옆문으로 서재에 들어갔다. 범행 뒤 문진을 닦고 창문을 열었으며, 서류철을 가지고 나왔다. 정전 복구와 점검이 끝난 22:07 수장고에 서류철과 장갑을 숨겼다.'},
 {id:'blackout',text:'22:00 정전 이후 어둠을 틈타 서재 정문으로 들어가 범행했다.'},
 {id:'window',text:'창문과 외벽을 통해 밖에서 침입했고 서류철만 가져갔다.'},
 {id:'front',text:'21:50 정문으로 들어가 범행했고 서류철은 그 자리에서 불태웠다.'},
];
export function verdict(s:GameState,person:string,evidence:string,reason:string){
 if(!finalOpen(s))return{correct:false,message:'조사와 마지막 증거 확인이 아직 끝나지 않았어요.'};
 if(person!=='hayoon')return{correct:false,message:person==='serin'?'세린의 현관 통과 시각과 서재까지의 이동 시간을 다시 비교해보세요.':'그 사람의 거짓말과 CCTV에 찍힌 실제 소재를 구분해보세요.'};
 if(evidence!=='clue_12')return{correct:false,message:'동기나 범행 도구만으로는 부족해요. 서재에서 사라진 물건이 어디서 발견됐나요?'};
 if(reason!=='route')return{correct:false,message:'몽나가 지킨 정문, 시신을 확인한 시각, 수장고의 기록을 한 흐름으로 이어보세요.'};
 return{correct:true,message:''};
}
export class AudiencePoll {
 private votes=new Map<string,number>();deadline=0;
 start(now:number){this.votes.clear();this.deadline=now+30000;}stop(){this.deadline=0;}
 cast(userId:string,text:string,now:number){if(!userId||!this.deadline||now>=this.deadline||this.votes.has(userId))return false;const match=/^!투표\s+([1-4])$/.exec(text.trim());if(!match)return false;this.votes.set(userId,Number(match[1])-1);return true;}
 counts(){const c=[0,0,0,0];this.votes.forEach(v=>c[v]++);return c;}get size(){return this.votes.size;}
}
