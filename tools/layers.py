"""Build layered scroll-story assets: 4 backgrounds per theme and orientation,
2 alpha sprites, and composite stills for reduced motion."""
from PIL import Image
import os, json
A='/workspace/pacholczyk-demo/art2/'; O='/workspace/pacholczyk-demo/site/v/'
os.makedirs(O,exist_ok=True)
sizes={}
def save(im,name,q=52,wq=68,alpha=False):
    p=O+name
    im.save(p+'.avif','AVIF',quality=q,speed=4)
    kw=dict(quality=wq,method=6)
    if alpha: kw['alpha_quality']=80
    im.save(p+'.webp','WEBP',**kw)
    sizes[name]=(os.path.getsize(p+'.avif'),os.path.getsize(p+'.webp'))
src={('s1','light','d'):'s1-light-d.png',('s1','dark','d'):'s1-dark-d.png'}
for s in ('s1','s2','s3','s4'):
    for th in ('light','dark'):
        for o in ('d','m'):
            f=src.get((s,th,o)) or f'{s}-{th}-{o}.jpg'
            im=Image.open(A+f).convert('RGB')
            save(im,f'{s}-{th}-{o}', q=(40 if s=='s1' else 58) if s!='s4' else 50)
for n in ('hearse','bearers'):
    save(Image.open(A+n+'.png'),n,q=60,wq=78,alpha=True)
# composite stills (desktop) for reduced motion / no JS
H=Image.open(A+'hearse.png'); B=Image.open(A+'bearers.png')
def place(bg,sp,h_frac,x_frac,bottom_frac,dim=1.0):
    bg=bg.copy(); W,Hh=bg.size; h=int(Hh*h_frac); w=int(sp.width*h/sp.height)
    s=sp.resize((w,h),Image.LANCZOS)
    if dim<1:
        from PIL import ImageEnhance
        a=s.getchannel('A'); s=ImageEnhance.Brightness(s.convert('RGB')).enhance(dim).convert('RGBA'); s.putalpha(a)
    bg.alpha_composite(s,(int(W*x_frac),int(Hh*(1-bottom_frac))-h)); return bg
for th in ('light','dark'):
    d=.85 if th=='dark' else 1
    s2=Image.open(A+f's2-{th}-d.jpg').convert('RGBA')
    s2=place(s2,H,.19,.55,.13,d); s2=place(s2,B,.22,.16,.12,d)
    s3=Image.open(A+f's3-{th}-d.jpg').convert('RGBA'); s3=place(s3,H,.17,.36,.10,d)
    for n,im in (('still2',s2),('still3',s3)):
        save(im.convert('RGB'),f'{n}-{th}')
json.dump(sizes,open('/tmp/layer-sizes.json','w'),indent=0)
tot=lambda pred: sum(v[0] for k,v in sizes.items() if pred(k))//1024
print('desktop light avif KB', tot(lambda k:k.endswith('light-d') or k in('hearse','bearers')))
print('mobile light avif KB', tot(lambda k:k.endswith('light-m') or k in('hearse','bearers')))
print('desktop dark avif KB', tot(lambda k:k.endswith('dark-d') or k in('hearse','bearers')))
print('mobile dark avif KB', tot(lambda k:k.endswith('dark-m') or k in('hearse','bearers')))
for k,v in sorted(sizes.items()): print(k, v[0]//1024, v[1]//1024)
