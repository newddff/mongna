const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),Module=require('node:module'),path=require('node:path'),ts=require('typescript');
const file=path.resolve(__dirname,'../src/lib/broadcast-notice.ts'),mod=new Module(file,module);mod.filename=file;mod.paths=module.paths;mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {latestBroadcastNotice}=mod.exports;
const now=Date.parse('2026-10-18T10:00:00Z');
const author='jOsCYY7SXyDXrlliUvwiYyVgJpyI7ZTSbtga9eKkbH8';
const row=(id,timestamp=now-10000)=>({type:'ARTICLE',item:{cafeId:31747136,menuId:5,articleId:id,subject:'오늘은',summary:'쉬어가겠습니다!\n내일 뵈어요!',writeDateTimestamp:timestamp,openArticle:true,blindArticle:false,writerInfo:{memberKey:author,nickName:'몽나'}}});
const payload=rows=>({result:{articleList:rows}});
test('picks the newest broadcast-alert article, not the first pinned notice',()=>{
 const pinned={...row(2,now-100),type:'NOTICE'};
 const result=latestBroadcastNotice(payload([pinned,row(3,now-20000),row(4,now-10000)]),now);
 assert.equal(result.id,'4');assert.equal(result.summary,'쉬어가겠습니다!\n내일 뵈어요!');assert.equal(result.url,'https://cafe.naver.com/nightofmongna/4');
});
test('filters by stable Mongna identity and the exact cafe and board',()=>{
 for(const changes of [{writerInfo:{memberKey:'someone-else',nickName:'몽나'}},{menuId:13},{cafeId:1234}]){
 const item=row(1);Object.assign(item.item,changes);assert.equal(latestBroadcastNotice(payload([item]),now),null);
 }
 const renamed=row(1);renamed.item.writerInfo.nickName='몽나 새이름';assert.equal(latestBroadcastNotice(payload([renamed]),now).author,'몽나 새이름');
});
test('does not display member-only, blinded, malformed or future posts',()=>{
 for(const changes of [{openArticle:false},{blindArticle:true},{writeDateTimestamp:0},{writeDateTimestamp:now+1},{articleId:'bad'},{subject:''}]){
 const item=row(1);Object.assign(item.item,changes);assert.equal(latestBroadcastNotice(payload([item]),now),null);
 }
});
test('decodes display entities and escaped emoji as text and never returns raw HTML',()=>{
 const item=row(1);item.item.subject='오늘 &amp; 내일';item.item.summary='함께 \\uD83E\\uDD0D &lt;script&gt;x&lt;/script&gt;';
 const result=latestBroadcastNotice(payload([item]),now);assert.equal(result.title,'오늘 & 내일');assert.equal(result.summary,'함께 🤍 <script>x</script>');assert.ok(!('html' in result));assert.ok(!('memberKey' in result));
});
test('distinguishes a valid empty list from an invalid API response',()=>{
 assert.equal(latestBroadcastNotice(payload([]),now),null);for(const value of [{},null,{result:{articleList:{}}}])assert.throws(()=>latestBroadcastNotice(value,now));
});
