"""Extract Aurora idle frames from frost_vanguard_ref.png (single-row idle sheet, 1536x1024)."""
from PIL import Image
import os

SRC = r"Z:\Claude\stick-fight\frost_vanguard_ref.png"
OUT = r"Z:\Claude\stick-fight\sprites\aurora"
SPRITE_W, SPRITE_H = 160, 220

os.makedirs(OUT, exist_ok=True)
img = Image.open(SRC).convert("RGBA")
W, H = img.size
print(f"loaded {W}x{H}")

# Manual y-bounds: characters are in the lower middle of the sheet.
# Title section ~0-270, header ~270-320, character row ~320-910, numbers ~910-1000
# Tune these if preview shows wrong region.
y0, y1 = 390, 815
gs = img.convert("L")
px = gs.load()
print(f"idle row: y={y0}..{y1} (height {y1-y0})")

# Now find vertical frame boundaries within that row
col_darkness = []
for x in range(W):
    d = 0
    for y in range(y0, y1, 3):
        if px[x, y] < 140:
            d += 1
    col_darkness.append(d)

cthresh = max(col_darkness) * 0.15
frames = []
in_c = False; cs = 0
for x, d in enumerate(col_darkness):
    if d > cthresh and not in_c:
        cs = x; in_c = True
    elif d <= cthresh and in_c:
        if x - cs > 40:
            frames.append((cs, x))
        in_c = False
if in_c:
    frames.append((cs, W))

print(f"detected {len(frames)} frames in idle row: {frames}")

# Save row preview
img.crop((0, y0, W, y1)).save(os.path.join(OUT, "_preview_idle_row.png"))

def remove_bg(im):
    """Make light-blue grid background transparent.
    The grid is bright+desaturated; the character has saturated dark colors."""
    im = im.convert("RGBA")
    data = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = data[x, y]
            # background grid is very light (all channels > 200) with slight blue tint
            if r > 195 and g > 195 and b > 200:
                data[x, y] = (0, 0, 0, 0)
            # semi-light grid lines
            elif r > 175 and g > 180 and b > 195 and abs(r - g) < 20 and abs(g - b) < 25:
                # fade these toward transparent
                lightness = (r + g + b) / 3
                if lightness > 190:
                    data[x, y] = (0, 0, 0, 0)
    return im

# Extract each frame, centered, scaled to 160x220
def extract(x0, x1):
    pad = 8
    crop = img.crop((max(0, x0 - pad), y0, min(W, x1 + pad), y1))
    crop = remove_bg(crop)
    cw, ch = crop.size
    # scale to fit sprite height with a little margin
    scale = min(SPRITE_W / cw, (SPRITE_H - 8) / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    ox = (SPRITE_W - nw) // 2
    oy = SPRITE_H - nh - 4  # bottom aligned with small margin
    canvas.paste(crop, (ox, oy), crop)
    return canvas

# Game wants 6 idle frames. Use first 6 detected (or pad if fewer)
frame_count = 6
if not frames:
    print("ERROR: no frames detected")
    exit(1)

for i in range(frame_count):
    src_idx = i % len(frames)
    x0, x1 = frames[src_idx]
    extract(x0, x1).save(os.path.join(OUT, f"idle_{i}.png"))
    print(f"  wrote idle_{i}.png (source frame {src_idx})")

print("\nDone. Check sprites/aurora/_preview_idle_row.png and idle_*.png")
