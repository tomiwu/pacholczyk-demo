(function(){
var d=document.documentElement,N=120,
 story=document.getElementById('story'),
 cv=document.getElementById('cv'),
 cx=cv.getContext('2d',{alpha:false}),
 hd=document.getElementById('hd'),
 caps=[].slice.call(document.querySelectorAll('.cap')),
 steps=[].slice.call(document.querySelectorAll('.steps li')),
 bar=document.querySelector('.prog i'),
 mq=matchMedia('(prefers-color-scheme: dark)'),
 rm=matchMedia('(prefers-reduced-motion: reduce)'),
 tgl=document.getElementById('tgl'),
 sb=document.querySelector('.scr-b'),
 st=document.querySelector('.scr-t'),
 sdt=typeof CSS!=='undefined'&&CSS.supports&&CSS.supports('animation-timeline: view()'),
 next=document.getElementById('o-nas');

function theme(){return d.dataset.theme||(mq.matches?'dark':'light')}
function orient(){return (innerWidth/innerHeight<0.8)?'m':'d'}
function setLabel(){tgl.setAttribute('aria-label',theme()==='dark'?'Zmień motyw na jasny':'Zmień motyw na ciemny')}
setLabel();
tgl.addEventListener('click',function(){var t=theme()==='dark'?'light':'dark';d.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(e){}setLabel();load()});
mq.addEventListener&&mq.addEventListener('change',function(){if(!d.dataset.theme){setLabel();load()}});

/* Linear scroll -> frame. No easing. Bitmaps stay in memory. */
var bitmaps=new Array(N),key='',W=0,H=0,raf=0,dirty=0,storyTop=0,scrollLen=1,lastF=-1,loaded=0,gen=0,
 useBitmap=typeof createImageBitmap==='function',
 draws=0,rafMs=0,rafGaps=0;

function pad(i){return String(i).padStart(3,'0')}
function srcOf(k,i){return 'f/'+k+'/'+pad(i)+'.webp'}

function measure(){
 var y=0,el=story;
 while(el){y+=el.offsetTop;el=el.offsetParent}
 storyTop=y;
 scrollLen=Math.max(1,story.offsetHeight-innerHeight);
 var r=Math.min(devicePixelRatio||1,3);
 var w=Math.round(cv.clientWidth*r),h=Math.round(cv.clientHeight*r);
 if(w!==W||h!==H){W=cv.width=w;H=cv.height=h;lastF=-1}
}

function prog(){return Math.max(0,Math.min(1,(window.scrollY-storyTop)/scrollLen))}

function paint(im,a){
 var iw=im.width,ih=im.height,s=Math.max(W/iw,H/ih),w=iw*s,h=ih*s;
 cx.globalAlpha=a;cx.drawImage(im,(W-w)/2,(H-h)/2,w,h);
}

function draw(p){
 if(!W)return false;
 var f=p*(N-1);
 if(Math.abs(f-lastF)<1e-4)return false;
 var i0=Math.floor(f),a=f-i0,i1=Math.min(N-1,i0+1),b0=bitmaps[i0],b1=bitmaps[i1];
 if(!b0){
  for(var k=1;k<N;k++){
   if(bitmaps[i0-k]){b0=bitmaps[i0-k];a=0;break}
   if(bitmaps[i0+k]){b0=bitmaps[i0+k];a=0;break}
  }
  if(!b0)return false;
 }
 lastF=f;
 if(a>0.001&&b1){paint(b0,1-a);paint(b1,a)}else{paint(b0,1)}
 cx.globalAlpha=1;
 if(!cv.classList.contains('on'))cv.classList.add('on');
 draws++;
 return true;
}

function ui(p){
 var ob=0,ot=0,dk=innerWidth>=960;
 caps.forEach(function(c){var r=c.dataset.r.split(',').map(Number),o,isB=c.classList.contains('b');
  if(p<r[0]||p>r[3])o=0;else if(p<r[1])o=(p-r[0])/(r[1]-r[0]);else if(p<=r[2])o=1;else o=1-(p-r[2])/(r[3]-r[2]);
  o=Math.max(0,Math.min(1,o));var e=o*o*(3-2*o);if(isB)ob=Math.max(ob,e);else ot=Math.max(ot,e);c.style.opacity=e;c.style.transform=(dk&&isB?'translateY(calc(-50% + ':'translateY(calc(0px + ')+((1-e)*(p<(r[1]+r[2])/2?24:-24))+'px))';
  c.style.visibility=e<.01?'hidden':'visible';c.setAttribute('aria-hidden',e<.5?'true':'false')});
 sb.style.opacity=Math.max(ob,.15);st.style.opacity=ot;
 var s=p<.22?0:p<.52?1:p<.8?2:3;steps.forEach(function(l,i){l.classList.toggle('on',i===s)});
 if(!sdt)bar.style.setProperty('--p',p);
 hd.classList.toggle('solid',(storyTop+story.offsetHeight-window.scrollY)<80);
}

function tick(ts){
 raf=0;
 if(rafMs){if(ts-rafMs>20)rafGaps++}rafMs=ts||0;
 if(!dirty)return;
 dirty=0;
 var p=prog();
 draw(p);
 ui(p);
}

function onScroll(){dirty=1;if(!raf)raf=requestAnimationFrame(tick)}

function loadOne(k,i,my){
 if(my!==gen)return Promise.resolve();
 var u=srcOf(k,i);
 if(useBitmap){
  return fetch(u).then(function(r){return r.blob()}).then(function(b){return createImageBitmap(b)}).then(function(bm){
   if(my!==gen){bm.close&&bm.close();return}
   if(bitmaps[i]&&bitmaps[i].close)bitmaps[i].close();
   bitmaps[i]=bm;loaded++;
  });
 }
 return new Promise(function(res){
  var im=new Image();im.decoding='async';
  im.onload=function(){if(my===gen){bitmaps[i]=im;loaded++}res()};
  im.onerror=function(){res()};
  im.src=u;
 });
}

function load(){
 if(rm.matches)return;
 var k=theme()+'/'+orient();
 if(k===key)return;
 key=k;
 var my=++gen,i;
 for(i=0;i<N;i++){if(bitmaps[i]&&bitmaps[i].close)bitmaps[i].close();bitmaps[i]=undefined}
 loaded=0;lastF=-1;
 var start=Math.round(prog()*(N-1)),q=[],seen={};
 function add(i){if(i>=0&&i<N&&!seen[i]){seen[i]=1;q.push(i)}}
 add(start);add(0);add(N-1);for(i=0;i<N;i++)add(i);
 var active=0;
 function next(){
  if(my!==gen)return;
  while(active<10&&q.length){
   active++;
   loadOne(k,q.shift(),my).then(function(){
    active--;
    if(my===gen){dirty=1;if(!raf)raf=requestAnimationFrame(tick);next()}
   },function(){active--;if(my===gen)next()});
  }
 }
 next();
}

function onResize(){measure();if(orient()!==(key.split('/')[1]||orient()))load();dirty=1;if(!raf)raf=requestAnimationFrame(tick)}

window.__story={
 N:N,
 get p(){return prog()},
 get frame(){return prog()*(N-1)},
 get loaded(){return loaded},
 get scrollLen(){return scrollLen},
 get storyTop(){return storyTop},
 get draws(){return draws},
 get rafGaps(){return rafGaps},
 resetStats:function(){draws=0;rafGaps=0;rafMs=0},
 ready:function(){return loaded>=N}
};

if(!rm.matches){
 measure();
 addEventListener('scroll',onScroll,{passive:true});
 addEventListener('resize',onResize);
 dirty=1;requestAnimationFrame(tick);
 function later(){(window.requestIdleCallback||setTimeout)(load,{timeout:800})}
 if(document.readyState==='complete')later();else addEventListener('load',later);
}else{hd.classList.add('solid')}

if(!sdt&&'IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -10% 0px'});document.querySelectorAll('.rv').forEach(function(el){io.observe(el)})}

var form=document.getElementById('zgloszenie'),msg=document.getElementById('msg');
form.addEventListener('submit',function(e){e.preventDefault();msg.innerHTML='Dziękujemy. To jest wersja demonstracyjna — formularz jeszcze nie wysyła danych. Prosimy o telefon: <a href="tel:+48609731454">609 731 454</a>. Odbieramy całą dobę.';msg.classList.add('on');msg.focus&&msg.setAttribute('tabindex','-1');msg.focus()});
})();
