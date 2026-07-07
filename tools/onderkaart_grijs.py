"""Bouwt de grijze onderkaart (img/broekhem-onderkaart-grijs.png).

Haalt PDOK BRT-achtergrondkaart-tiles (style 'grijs', key-vrij) op rond het punt
X,Y (RD / EPSG:28992) en stitcht ze tot één statisch plaatje. Geen backend nodig.

Andere locatie: pas X, Y en OUT aan (zelfde punt als in build_data.py) en draai:
    python tools/onderkaart_grijs.py
"""
import io, urllib.request
from PIL import Image

# --- locatie (RD / EPSG:28992) ---
X, Y = 185904, 320095  # Broekhem 33, Valkenburg
OUT = "img/broekhem-onderkaart-grijs.png"

# --- EPSG:28992-tilingschema ---
ORIGIN_X, ORIGIN_Y = -285401.92, 903401.92
RES = {10: 3.360, 11: 1.680, 12: 0.840, 13: 0.420, 14: 0.210}  # m/px
Z = 12          # 0.84 m/px -> tile = 215 m
TILE = 256
NX, NY = 3, 4   # 3 breed x 4 hoog -> portret, past bij het smalle kaartpaneel

TMPL = "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:28992/{z}/{col}/{row}.png"


def main():
    span = TILE * RES[Z]
    ccol = int((X - ORIGIN_X) / span)
    crow = int((ORIGIN_Y - Y) / span)
    cols = range(ccol - NX // 2, ccol - NX // 2 + NX)
    rows = range(crow - NY // 2, crow - NY // 2 + NY)
    canvas = Image.new("RGB", (NX * TILE, NY * TILE), (238, 240, 236))
    for i, col in enumerate(cols):
        for j, row in enumerate(rows):
            url = TMPL.format(z=Z, col=col, row=row)
            with urllib.request.urlopen(url, timeout=30) as r:
                tile = Image.open(io.BytesIO(r.read())).convert("RGB")
            canvas.paste(tile, (i * TILE, j * TILE))
    canvas.save(OUT, optimize=True)
    print("saved", OUT, canvas.size)


if __name__ == "__main__":
    main()
