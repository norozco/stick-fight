"""Extract Aurora walk (+ fresh idle) frames from aurora_vanguard_ref.png (1536x1024).
Layout: two rows — IDLE on top, WALK on bottom, each with 7 visible character frames."""
from PIL import Image
import os

SRC = r"Z:\Claude\stick-fight\aurora_vanguard_ref.png"
OUT = r"Z:\Claude\stick-fight\sprites\aurora"
SPRITE_W, SPRITE_H = 160, 220

os.makedirs(OUT, exist_ok=True)
img = Image.open(SRC).convert("RGBA")
W, H = img.size
print(f"loaded {W}x{H}")

# Manual y-bounds per row (tune after inspecting _preview_*.png)
# Image is 1024 tall. Title ~0..180. Idle row ~210..560. Walk row ~600..960.
# We'll crop tight to avoid labels/numbers.
ROWS = {
    "idle": (260, 565),
    "walk": (680, 945),
}


def remove_bg(im):
    im = im.convert("RGBA")
    data = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            if r > 195 and g > 195 and b > 200:
                data[x, y] = (0, 0, 0, 0)
            elif r > 175 and g > 180 and b > 195 and abs(r - g) < 20 and abs(g - b) < 25:
                lightness = (r + g + b) / 3
                if lightness > 190:
                    data[x, y] = (0, 0, 0, 0)
    return im


def detect_frames(y0, y1):
    gs = img.convert("L")
    px = gs.load()
    col = []
    for x in range(W):
        d = 0
        for y in range(y0, y1, 3):
            if px[x, y] < 140:
                d += 1
        col.append(d)
    t = max(col) * 0.15 if col else 1
    bands = []
    in_c = False; s = 0
    for x, d in enumerate(col):
        if d > t and not in_c:
            s = x; in_c = True
        elif d <= t and in_c:
            if x - s > 40:
                bands.append((s, x))
            in_c = False
    if in_c:
        bands.append((s, W))
    return bands


def extract(x0, x1, y0, y1):
    pad = 8
    crop = img.crop((max(0, x0 - pad), y0, min(W, x1 + pad), y1))
    crop = remove_bg(crop)
    cw, ch = crop.size
    scale = min(SPRITE_W / cw, (SPRITE_H - 8) / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    ox = (SPRITE_W - nw) // 2
    oy = SPRITE_H - nh - 4
    canvas.paste(crop, (ox, oy), crop)
    return canvas


# Game expects: idle=6 frames, walk=8 frames
ANIM_COUNT = {"idle": 6, "walk": 8}

for name, (y0, y1) in ROWS.items():
    print(f"\n--- {name} row (y={y0}..{y1}) ---")
    img.crop((0, y0, W, y1)).save(os.path.join(OUT, f"_preview_{name}_row.png"))
    frames = detect_frames(y0, y1)
    print(f"  detected {len(frames)} frames: {frames}")
    count = ANIM_COUNT[name]
    if not frames:
        print(f"  [WARN] no frames detected for {name}")
        continue
    for i in range(count):
        src_idx = i % len(frames)
        x0, x1 = frames[src_idx]
        extract(x0, x1, y0, y1).save(os.path.join(OUT, f"{name}_{i}.png"))
    print(f"  wrote {count} frames")

print("\nDone. Inspect sprites/aurora/_preview_*_row.png and individual frames.")
