"""Extract scroll frames from the concept videos.
Desktop set: 1280x720 WebP. Mobile set: 405x720 portrait crop that pans
with the action (PAN table: seconds -> crop centre as a fraction of width)."""
import subprocess, glob, os, json
from PIL import Image
ROOT='/workspace/pacholczyk-demo'
FPS=6
PAN=[(0,.50),(4.0,.50),(6.0,.30),(7.5,.32),(9.5,.58),(11.5,.62),(13.0,.52),(16,.52),(20,.50)]
def pan(t):
    for (t0,x0),(t1,x1) in zip(PAN,PAN[1:]):
        if t<=t1:
            k=(t-t0)/(t1-t0); k=k*k*(3-2*k); return x0+(x1-x0)*k
    return PAN[-1][1]
out={}
for theme,vid in [('light','concept.mp4'),('dark','concept-dark.mp4')]:
    tmp=f'/tmp/fx/{theme}'; os.makedirs(tmp,exist_ok=True)
    for f in glob.glob(tmp+'/*'): os.remove(f)
    subprocess.run(['ffmpeg','-v','error','-y','-i',f'{ROOT}/video/{vid}','-vf',f'fps={FPS}',tmp+'/%03d.png'],check=True)
    fs=sorted(glob.glob(tmp+'/*.png'))
    for s in ('d','m'): os.makedirs(f'{ROOT}/site/f/{theme}/{s}',exist_ok=True)
    tot={'d':0,'m':0}
    for i,f in enumerate(fs):
        im=Image.open(f).convert('RGB'); t=i/FPS
        p=f'{ROOT}/site/f/{theme}/d/{i:03d}.webp'; im.save(p,'WEBP',quality=52,method=6); tot['d']+=os.path.getsize(p)
        W,H=im.size; cw=round(H*9/16); cx=round(pan(t)*W-cw/2); cx=max(0,min(W-cw,cx))
        p=f'{ROOT}/site/f/{theme}/m/{i:03d}.webp'; im.crop((cx,0,cx+cw,H)).save(p,'WEBP',quality=60,method=6); tot['m']+=os.path.getsize(p)
    out[theme]=dict(n=len(fs),**{k:v//1024 for k,v in tot.items()})
print(json.dumps(out))
