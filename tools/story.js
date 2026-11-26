/* layered story: 4 painted scenes + 2 sprites, transform/opacity only */
var cur=0,target=0,raf=0,W=0,H=0,ext='webp',loaded=false,
 L=[1,2,3,4].map(function(i){return document.getElementById('L'+i)}),SB=document.getElementById('SB'),SH=document.getElementById('SH'),sun=document.getElementById('sun');
function orient(){return (innerWidth/innerHeight<0.8)?'m':'d'}
function url(k){return 'v/'+(k==='hearse'||k==='bearers'?k:k+'-'+theme()+'-'+orient())+'.'+ext}
function setSrc(img,k){var u=url(k);if(img.getAttribute('src')!==u)img.src=u}
function apply(){
 if(d.dataset.theme){var P=document.getElementById('P1');[].slice.call(P.querySelectorAll('source')).forEach(function(x){x.remove()});setSrc(document.getElementById('I1'),'s1')}
 if(!loaded)return;
 [].slice.call(document.querySelectorAll('#L2 img,#L3 img,#L4 img,.sp')).forEach(function(im){setSrc(im,im.dataset.k)});
}
function load(){apply()}
function later(){(window.requestIdleCallback||setTimeout)(function(){loaded=true;apply()},{timeout:500})}
function go(){if(document.readyState==='complete')later();else addEventListener('load',later)}
var t=new Image();t.onload=function(){ext='avif';if(d.dataset.theme)apply();go()};t.onerror=function(){if(d.dataset.theme)apply();go()};t.src='data:image/avif;base64,AVIF1';
function cl(x){return x<0?0:x>1?1:x}
function rg(p,a,b){return cl((p-a)/(b-a))}
function ez(x){return x*x*(3-2*x)}
function size(){W=innerWidth;H=document.getElementById('stage').clientHeight;var o=orient();if(o!==size.o){size.o=o;apply()}render(cur)}
function render(p){
 var m=orient()==='m';
 var k1=ez(rg(p,0,.2)),kz=ez(rg(p,.18,.29)),f1=1-ez(rg(p,.2,.29));
 L[0].style.transform='scale('+(1+.1*k1+.3*kz)+') translateY('+(k1*2)+'%)';L[0].style.opacity=f1;
 var k2=ez(rg(p,.2,.36)),kp=ez(rg(p,.5,.61)),f2=1-ez(rg(p,.54,.6));
 L[1].style.transform='translateX('+(-22*kp)+'%) scale('+(1.12-.12*k2)+')';L[1].style.opacity=f2;
 var k3=ez(rg(p,.5,.66)),up=ez(rg(p,.76,.94));
 L[2].style.transform='translateX('+(10*(1-kp))+'%) translateY('+(up*58)+'%) scale('+(1+.22*(1-kp)+.06*(1-k3))+')';L[2].style.opacity=1-ez(rg(p,.84,.95));
 L[3].style.transform='translateY('+(-32+32*up)+'%) scale('+(1.06-.06*ez(rg(p,.85,1)))+')';
 sun.style.opacity=.85*ez(rg(p,.86,1));
 var hh=(m?.085:.19)*H,hw=hh*3.52,bh=(m?.115:.22)*H,bw=bh*2.34;
 SB.style.height=bh+'px';
 var vis2=(1-f1)*f2,g2=H*(1-.13),g3=H*(1-(m?.115:.10));
 var xH=W*(m?.36:.55),xBe=xH-bw*.92,kb=ez(rg(p,.24,.45));
 SB.style.transform='translate('+(-bw+(xBe+bw)*kb)+'px,'+(g2-bh)+'px)';SB.style.opacity=vis2*(1-ez(rg(p,.45,.5)));
 var x,y,o,dr=rg(p,.48,.56);
 if(p<.57){x=xH+(W+40-xH)*dr*dr;y=g2-hh;o=vis2}
 else{if(m)hh*=.9;hw=hh*3.52;var kc=1-Math.pow(1-rg(p,.58,.82),2),xC=W*(m?.3:.4);x=-hw+(xC+hw)*kc;y=g3-hh+up*.58*H;o=ez(rg(p,.57,.6))*(1-ez(rg(p,.84,.95)))}
 SH.style.height=hh+'px';
 var bob=((dr>0&&dr<1)||(p>.58&&p<.82))?Math.sin(p*900)*.6:0;
 SH.style.transform='translate('+x+'px,'+(y+bob)+'px)';SH.style.opacity=o;
}
function prog(){var r=story.getBoundingClientRect(),len=story.offsetHeight-innerHeight;return Math.max(0,Math.min(1,-r.top/len))}
