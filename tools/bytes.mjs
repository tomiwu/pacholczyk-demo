import { chromium } from 'playwright';
const base=process.argv[2];
const b=await chromium.launch();
for (const [vn,vp] of [['mobile',{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true}],['desktop',{viewport:{width:1280,height:800}}]]) for (const scheme of ['light','dark']) {
  const ctx=await b.newContext({...vp,colorScheme:scheme}); const pg=await ctx.newPage();
  const cdp=await ctx.newCDPSession(pg); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  let total=0; const per={}; cdp.on('Network.loadingFinished',e=>{total+=e.encodedDataLength});
  await pg.goto(base,{waitUntil:'load'}); const first=total;
  const len=await pg.evaluate(()=>document.getElementById('story').offsetHeight-innerHeight);
  for(let y=0;y<=len;y+=Math.round(len/20)){await pg.evaluate(v=>scrollTo(0,v),y);await pg.waitForTimeout(250)}
  await pg.waitForTimeout(3000);
  console.log(vn,scheme,'load KB',Math.round(first/1024),'after story KB',Math.round(total/1024));
  await ctx.close();
}
await b.close();
