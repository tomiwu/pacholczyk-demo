"""Build 32 key frames from the concept videos for demo version C.

Desktop set: 1280x720. Mobile set: 405x720 portrait crop that follows
the action (PAN table: seconds -> crop centre as a fraction of width).

Each frame is AVIF, with a WebP fallback. Frame 0 is also the poster.
"""
from concurrent.futures import ProcessPoolExecutor
import glob, json, os, subprocess
from PIL import Image

ROOT = "/workspace/pacholczyk-demo"
OUT = os.path.join(ROOT, "site/c/f")
STILL = os.path.join(ROOT, "site/c/s")
N = 32
# Last source frame is just before 20.0 s (the video is 20 s at 24 fps).
LAST = 19.95
PAN = [
    (0, 0.50),
    (4.0, 0.50),
    (6.0, 0.30),
    (7.5, 0.32),
    (9.5, 0.58),
    (11.5, 0.62),
    (13.0, 0.52),
    (16, 0.52),
    (20, 0.50),
]
AVIF_Q = 58
WEBP_Q = 74


def pan(t: float) -> float:
    for (t0, x0), (t1, x1) in zip(PAN, PAN[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            k = k * k * (3 - 2 * k)
            return x0 + (x1 - x0) * k
    return PAN[-1][1]


def times() -> list:
    ts = [i * LAST / (N - 1) for i in range(N)]
    ts[-1] = LAST
    return ts


def extract(vid: str, dest: str, ts: list) -> None:
    os.makedirs(dest, exist_ok=True)
    for f in glob.glob(dest + "/*.png"):
        os.remove(f)
    for i, t in enumerate(ts):
        subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-y",
                "-i",
                vid,
                "-ss",
                f"{t:.4f}",
                "-frames:v",
                "1",
                "-update",
                "1",
                os.path.join(dest, f"{i:03d}.png"),
            ],
            check=True,
        )


def encode_pair(args: tuple) -> dict:
    src, theme, i, t, poster_dir = args
    im = Image.open(src).convert("RGB")
    W, H = im.size
    base_d = os.path.join(OUT, theme, "d", f"{i:03d}")
    base_m = os.path.join(OUT, theme, "m", f"{i:03d}")
    os.makedirs(os.path.dirname(base_d), exist_ok=True)
    os.makedirs(os.path.dirname(base_m), exist_ok=True)
    im.save(base_d + ".avif", "AVIF", quality=AVIF_Q, speed=4)
    im.save(base_d + ".webp", "WEBP", quality=WEBP_Q, method=6)
    cw = round(H * 9 / 16)
    cx = round(pan(t) * W - cw / 2)
    cx = max(0, min(W - cw, cx))
    m = im.crop((cx, 0, cx + cw, H))
    m.save(base_m + ".avif", "AVIF", quality=AVIF_Q, speed=4)
    m.save(base_m + ".webp", "WEBP", quality=WEBP_Q, method=6)
    rec = {
        "theme": theme,
        "i": i,
        "t": t,
        "d.avif": os.path.getsize(base_d + ".avif"),
        "d.webp": os.path.getsize(base_d + ".webp"),
        "m.avif": os.path.getsize(base_m + ".avif"),
        "m.webp": os.path.getsize(base_m + ".webp"),
    }
    if i == 0:
        os.makedirs(poster_dir, exist_ok=True)
        for orient, img in (("d", im), ("m", m)):
            p = os.path.join(poster_dir, f"poster-{theme}-{orient}")
            img.save(p + ".avif", "AVIF", quality=AVIF_Q, speed=4)
            img.save(p + ".webp", "WEBP", quality=WEBP_Q, method=6)
    return rec


def main() -> None:
    ts = times()
    jobs = []
    tmp_root = "/tmp/fx-c"
    for theme, vid in (("light", "concept.mp4"), ("dark", "concept-dark.mp4")):
        tmp = os.path.join(tmp_root, theme)
        extract(os.path.join(ROOT, "video", vid), tmp, ts)
        for i, t in enumerate(ts):
            jobs.append((os.path.join(tmp, f"{i:03d}.png"), theme, i, t, STILL))
    with ProcessPoolExecutor(max_workers=4) as ex:
        recs = list(ex.map(encode_pair, jobs))
    report = {"n": N, "avif_q": AVIF_Q, "webp_q": WEBP_Q, "times": ts, "themes": {}}
    for theme in ("light", "dark"):
        part = [r for r in recs if r["theme"] == theme]
        tot = {k: sum(r[k] for r in part) for k in ("d.avif", "d.webp", "m.avif", "m.webp")}
        first = part[0]
        report["themes"][theme] = {
            "first_d_avif": first["d.avif"],
            "first_m_avif": first["m.avif"],
            "total_d_avif": tot["d.avif"],
            "total_m_avif": tot["m.avif"],
            "total_d_webp": tot["d.webp"],
            "total_m_webp": tot["m.webp"],
        }
        print(
            theme,
            "first d/m AVIF KB",
            first["d.avif"] // 1024,
            first["m.avif"] // 1024,
            "total d/m AVIF KB",
            tot["d.avif"] // 1024,
            tot["m.avif"] // 1024,
        )
    os.makedirs(os.path.join(ROOT, "site/c/tools"), exist_ok=True)
    with open(os.path.join(ROOT, "site/c/tools/frame-sizes.json"), "w") as f:
        json.dump(report, f, indent=2)
    for f in glob.glob(tmp_root + "/*/*.png"):
        os.remove(f)
    print(json.dumps(report["themes"], indent=2))


if __name__ == "__main__":
    main()
