(function(){
var d=document.documentElement,N=32,story=document.getElementById('story'),cv=document.getElementById('cv'),cx=cv.getContext('2d'),hd=document.getElementById('hd'),
 caps=[].slice.call(document.querySelectorAll('.cap')),steps=[].slice.call(document.querySelectorAll('.steps li')),bar=document.querySelector('.prog i'),
 mq=matchMedia('(prefers-color-scheme: dark)'),rm=matchMedia('(prefers-reduced-motion: reduce)'),tgl=document.getElementById('tgl'),sb=document.querySelector('.scr-b'),st=document.querySelector('.scr-t'),
 sdt=typeof CSS!=='undefined'&&CSS.supports&&CSS.supports('animation-timeline: view()');
function theme(){return d.dataset.theme||(mq.matches?'dark':'light')}
function setLabel(){tgl.setAttribute('aria-label',theme()==='dark'?'Zmień motyw na jasny':'Zmień motyw na ciemny')}
setLabel();
tgl.addEventListener('click',function(){var t=theme()==='dark'?'light':'dark';d.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(e){}setLabel();load()});
mq.addEventListener&&mq.addEventListener('change',function(){if(!d.dataset.theme){setLabel();load()}});

/* key frames + crossfade */
var frames=[],key='',cur=0,target=0,raf=0,W=0,H=0,ext='webp',idleStarted=false;
function set(){return (innerWidth/innerHeight<0.8)?'m':'d'}
function pad(i){return String(i).padStart(3,'0')}
function srcOf(k,i){if(i===0){var p=k.split('/');return 's/poster-'+p[0]+'-'+p[1]+'.'+ext}return 'f/'+k+'/'+pad(i)+'.'+ext}
function near(i){if(frames[i]&&frames[i]!=='p')return i;for(var k=1;k<N;k++){if(frames[i-k]&&frames[i-k]!=='p')return i-k;if(frames[i+k]&&frames[i+k]!=='p')return i+k}return -1}
function paint(im,a){var iw=im.naturalWidth,ih=im.naturalHeight,s=Math.max(W/iw,H/ih),w=iw*s,h=ih*s;cx.globalAlpha=a;cx.drawImage(im,(W-w)/2,(H-h)/2,w,h)}
function draw(){
 if(!W)return;
 var f=cur*(N-1),i0=Math.floor(f),i1=Math.min(N-1,i0+1),a=f-i0,j0=near(i0);
 if(j0<0)return;
 var A=frames[j0];
 if(a>0.02&&frames[i1]&&frames[i1]!=='p'&&j0===i0){
  paint(A,1-a);paint(frames[i1],a);
 }else{
  paint(A,1);
 }
 cx.globalAlpha=1;
}
function show(){if(!cv.classList.contains('on')){var i=near(Math.round(cur*(N-1)));if(i>=0)cv.classList.add('on')}}
function loadOne(k,i,my){
 if(my!==key||i<0||i>=N||frames[i])return Promise.resolve();
 frames[i]='p';
 var im=new Image();im.decoding='async';im.src=srcOf(k,i);
 return (im.decode?im.decode():new Promise(function(r,j){im.onload=r;im.onerror=j})).then(function(){
  if(my!==key)return;frames[i]=im;show();draw();
 },function(){if(my===key&&frames[i]==='p')frames[i]=undefined});
}
function pickNext(){
 var c=Math.round(cur*(N-1)),best=-1,bd=1e9;
 for(var i=0;i<N;i++)if(!frames[i]){var d=Math.abs(i-c);if(d<bd){bd=d;best=i}}
 return best;
}
function pump(k,my,limit){
 var active=0;
 function next(){
  if(my!==key)return;
  while(active<(limit||4)){
   var i=pickNext();if(i<0)return;
   active++;
   loadOne(k,i,my).then(function(){active--;next()});
  }
 }
 next();
}
function load(){
 if(rm.matches)return;
 var k=theme()+'/'+set();if(k===key)return;key=k;frames=new Array(N);idleStarted=false;
 var my=k,iNow=Math.round(cur*(N-1));
 loadOne(k,0,my).then(function(){if(iNow)return loadOne(k,iNow,my)}).then(function(){
  function rest(){if(my!==key||idleStarted)return;idleStarted=true;pump(k,my,4)}
  if(document.readyState==='complete')(window.requestIdleCallback||setTimeout)(rest,{timeout:500});
  else addEventListener('load',function(){(window.requestIdleCallback||setTimeout)(rest,{timeout:500})});
 });
}
function size(){var r=Math.min(devicePixelRatio||1,2);W=cv.width=Math.round(cv.clientWidth*r);H=cv.height=Math.round(cv.clientHeight*r);if(set()!==(key.split('/')[1]||set()))load();draw()}
function prog(){var r=story.getBoundingClientRect(),len=story.offsetHeight-innerHeight;return Math.max(0,Math.min(1,-r.top/len))}
function ui(p){
 var ob=0,ot=0,dk=innerWidth>=960;
 caps.forEach(function(c){var r=c.dataset.r.split(',').map(Number),o,isB=c.classList.contains('b');
  if(p<r[0]||p>r[3])o=0;else if(p<r[1])o=(p-r[0])/(r[1]-r[0]);else if(p<=r[2])o=1;else o=1-(p-r[2])/(r[3]-r[2]);
  o=Math.max(0,Math.min(1,o));var e=o*o*(3-2*o);if(isB)ob=Math.max(ob,e);else ot=Math.max(ot,e);c.style.opacity=e;c.style.transform=(dk&&isB?'translateY(calc(-50% + ':'translateY(calc(0px + ')+((1-e)*(p<(r[1]+r[2])/2?24:-24))+'px))';
  c.style.visibility=e<.01?'hidden':'visible';c.setAttribute('aria-hidden',e<.5?'true':'false')});
 sb.style.opacity=Math.max(ob,.15);st.style.opacity=ot;
 var s=p<.22?0:p<.52?1:p<.8?2:3;steps.forEach(function(l,i){l.classList.toggle('on',i===s)});
 if(!sdt)bar.style.setProperty('--p',p);
 hd.classList.toggle('solid',story.getBoundingClientRect().bottom<80);
}
function tick(){raf=0;var dlt=target-cur;cur=Math.abs(dlt)<.0004?target:cur+dlt*.14;draw();ui(cur);if(cur!==target)raf=requestAnimationFrame(tick)}
function onScroll(){target=prog();if(!raf)raf=requestAnimationFrame(tick);if(idleStarted){var k=key,my=key;var i0=Math.floor(cur*(N-1));loadOne(k,i0,my);loadOne(k,Math.min(N-1,i0+1),my)}}
if(!rm.matches){
 var boot=function(){size();load();target=cur=prog();ui(cur)};
 var probe=new Image();
 probe.onload=function(){ext='avif';boot()};
 probe.onerror=function(){ext='webp';boot()};
 probe.src='data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAIAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBAAwAAAAAE2NvbHJuY2x4AAEADQAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAKG1kYXQSAAoIGAAGyAhoNCAyEh2Hh4WdwAAsAAAAkDWOPH6TwA==';
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('resize',size);
}else{hd.classList.add('solid')}

/* reveal fallback */
if(!sdt&&'IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -10% 0px'});document.querySelectorAll('.rv').forEach(function(el){io.observe(el)})}

/* form (demo: no sending) */
var form=document.getElementById('zgloszenie'),msg=document.getElementById('msg');
form.addEventListener('submit',function(e){e.preventDefault();msg.innerHTML='Dziękujemy. To jest wersja demonstracyjna — formularz jeszcze nie wysyła danych. Prosimy o telefon: <a href="tel:+48609731454">609 731 454</a>. Odbieramy całą dobę.';msg.classList.add('on');msg.focus&&msg.setAttribute('tabindex','-1');msg.focus()});
})();
