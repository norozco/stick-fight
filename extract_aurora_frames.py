"""
Extract Aurora sprite frames from the Frost Vanguard character sheet.

USAGE:
    1. Save the reference image to Z:\\Claude\\stick-fight\\frost_vanguard_ref.png
    2. Run: py -3 extract_aurora_frames.py
    3. Inspect sprites/aurora/_preview_*.png row strips
    4. If rows look right, the per-frame files will already be written.
    5. If rows are off, tune the ROW_BOUNDS dict below and re-run.

The script is self-calibrating: it looks for horizontal bands of near-white background
between animation rows to auto-detect row boundaries. Manual overrides available below.
"""

from PIL import Image
import os

SRC = r"Z:\Claude\stick-fight\frost_vanguard_ref.png"
OUT = r"Z:\Claude\stick-fight\sprites\aurora"
SPRITE_W, SPRITE_H = 160, 220  # game sprite dimensions

# Animation rows in top-to-bottom order as they appear on the sheet.
# frame_count is how many frames the game expects (from SPRITE_ANIMS in sprites.js).
# The game uses: idle(6) walk(8) attack_light(6) attack_heavy(6) hurt(3) jump(6)
#                block(4) dash(6) attack_ult(8) attack_throw(6) ko(4) knockdown(6)
#                grabbed(6) thrown(6) kick_light(6) kick_heavy(6)
# The reference sheet shows: walk(5) dash(6) back_dash(6) jump(5) fall(6) air_dash(6) landing(5)
# We'll map sheet -> game anims and loop/pad frames as needed.

SHEET_ROWS = [
    # (label,        frames_on_sheet)
    ("walk",         5),
    ("dash",         6),
    ("back_dash",    6),
    ("jump",         5),
    ("fall",         6),
    ("air_dash",     6),
    ("landing",      5),
]

# Mapping: game anim name -> (sheet_row, game_frame_count)
# We duplicate/trim frames to match the game's expected frame count.
ANIM_MAP = {
    "walk":         ("walk",      8),
    "dash":         ("dash",      6),
    "jump":         ("jump",      6),
    # fall used for hurt/knockdown
    "hurt":         ("fall",      3),
    "knockdown":    ("fall",      6),
    # landing used for block animation (close to idle)
    "block":        ("landing",   4),
    # back_dash unused by the game directly; optionally used later
}


def detect_rows(img):
    """Find horizontal row boundaries by looking at pixel brightness along each row."""
    w, h = img.size
    gs = img.convert("L")
    px = gs.load()
    # For each row, count how many pixels are "dark" (< 200). Rows in anim strips
    # will have MORE dark pixels (character bodies); separator bands have near-zero.
    row_dark = []
    for y in range(h):
        d = 0
        for x in range(0, w, 4):  # sample every 4th pixel for speed
            if px[x, y] < 180:
                d += 1
        row_dark.append(d)

    # Threshold: rows with > 3% dark samples are "content"
    thresh = max(row_dark) * 0.08
    in_row = False
    bands = []
    start = 0
    for y, d in enumerate(row_dark):
        if d > thresh and not in_row:
            start = y; in_row = True
        elif d <= thresh and in_row:
            if y - start > 20:  # ignore specks
                bands.append((start, y))
            in_row = False
    if in_row:
        bands.append((start, h))
    return bands


def detect_frames_in_row(img, row_bounds, expected_count):
    """Given a row y-range, find vertical frame boundaries."""
    y0, y1 = row_bounds
    w = img.size[0]
    gs = img.convert("L")
    px = gs.load()
    col_dark = []
    for x in range(w):
        d = 0
        for y in range(y0, y1, 3):
            if px[x, y] < 180:
                d += 1
        col_dark.append(d)
    thresh = max(col_dark) * 0.10 if col_dark else 1
    bands = []
    in_c = False; start = 0
    for x, d in enumerate(col_dark):
        if d > thresh and not in_c:
            start = x; in_c = True
        elif d <= thresh and in_c:
            if x - start > 20:
                bands.append((start, x))
            in_c = False
    if in_c:
        bands.append((start, w))
    return bands


def extract_frame(img, x0, y0, x1, y1, out_w=SPRITE_W, out_h=SPRITE_H):
    """Crop, center on transparent canvas, scale to sprite dimensions."""
    crop = img.crop((x0, y0, x1, y1))
    # preserve aspect, fit into out_w x out_h
    cw, ch = crop.size
    scale = min(out_w / cw, out_h / ch)
    nw, nh = int(cw * scale), int(ch * scale)
    crop = crop.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    # Paste centered horizontally, bottom-aligned (feet at bottom)
    px_off = (out_w - nw) // 2
    py_off = out_h - nh - 4
    if crop.mode != "RGBA":
        crop = crop.convert("RGBA")
    canvas.paste(crop, (px_off, py_off), crop)
    return canvas


def main():
    if not os.path.exists(SRC):
        print(f"ERROR: {SRC} not found.")
        print("Right-click the reference image in the chat and save it to that path.")
        return

    os.makedirs(OUT, exist_ok=True)
    img = Image.open(SRC).convert("RGBA")
    print(f"[info] loaded {img.size[0]}x{img.size[1]}")

    # The sheet's LEFT HALF contains the portrait/turnaround/effects.
    # The animation rows are in the RIGHT HALF (roughly x > 30% of width)
    # and span down the middle-bottom of the sheet.
    # We'll crop to the working region first.
    w, h = img.size
    # Working region: skip left portrait area and top title bar
    # From inspection of the sheet:
    #   - Title/portrait: x=0..~360, y=0..~540 (left column)
    #   - Turnaround: x=~380..~900, y=~40..~340
    #   - Expressions + FX: x=~960..end, y=~40..~460
    #   - ANIMATION ROWS: x=~380..~end, y=~470..~end
    # We focus on the animation region
    anim_x0 = int(w * 0.26)
    anim_y0 = int(h * 0.44)
    anim_region = img.crop((anim_x0, anim_y0, w, h))
    anim_region.save(os.path.join(OUT, "_preview_anim_region.png"))
    print(f"[info] animation region: {anim_region.size}")

    bands = detect_rows(anim_region)
    print(f"[info] detected {len(bands)} content bands: {bands}")

    # Save row preview strips so user can verify
    for i, (y0, y1) in enumerate(bands):
        label = SHEET_ROWS[i][0] if i < len(SHEET_ROWS) else f"row{i}"
        strip = anim_region.crop((0, y0, anim_region.size[0], y1))
        strip.save(os.path.join(OUT, f"_preview_{i:02d}_{label}.png"))

    # Extract frames for each game-anim mapping
    for game_anim, (sheet_row, frame_count) in ANIM_MAP.items():
        # find matching row index
        row_idx = next((i for i, (n, _) in enumerate(SHEET_ROWS) if n == sheet_row), None)
        if row_idx is None or row_idx >= len(bands):
            print(f"[warn] row {sheet_row} not found for {game_anim}")
            continue
        y0, y1 = bands[row_idx]
        # find frame boundaries in this row
        frame_bands = detect_frames_in_row(anim_region, (y0, y1),
                                            SHEET_ROWS[row_idx][1])
        if not frame_bands:
            print(f"[warn] no frames detected in row {sheet_row}")
            continue
        print(f"[info] {game_anim}: row {sheet_row} -> {len(frame_bands)} frames on sheet")
        # Extract each frame; loop/repeat to hit frame_count
        src_frames = []
        for (x0, x1) in frame_bands:
            fr = extract_frame(anim_region, x0, y0, x1, y1)
            src_frames.append(fr)
        for i in range(frame_count):
            src = src_frames[i % len(src_frames)]
            out_path = os.path.join(OUT, f"{game_anim}_{i}.png")
            src.save(out_path)
        print(f"[ok]   wrote {frame_count} frames for {game_anim}")

    print("\nDone. Inspect _preview_*.png to verify row detection.")
    print("If rows are wrong, edit ROW_BOUNDS at top of script and re-run.")


if __name__ == "__main__":
    main()
