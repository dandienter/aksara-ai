"""Aksara AI backend - FastAPI.

Endpoints:
  POST /api/transliterate   multipart image -> {latin, indonesian}
  POST /api/text-to-aksara  {text} -> {aksara}
  GET  /api/health
Serves frontend/ as static files.
"""
import base64
import io
import json
import os
import re

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from javanese_dict import WORDS, suggest

ROUTER_URL = os.environ.get("ROUTER_URL", "https://routers.iyantama.tech/v1")
ROUTER_KEY = os.environ.get("ROUTER_KEY", "")
VISION_MODEL = os.environ.get("VISION_MODEL", "mk/sonnet-4.5")
VISION_FALLBACK = os.environ.get("VISION_FALLBACK", "mk/haiku-4.5")
TEXT_MODEL = os.environ.get("TEXT_MODEL", "mk/haiku-4.5")

TRANSLITERATE_PROMPT = """Gambar pertama adalah KARTU REFERENSI: aksara Jawa nglegena beserta sandhangan dan tanda baca, masing-masing dengan nama latinnya.

Gambar kedua adalah tulisan aksara Jawa yang harus dibaca (bisa cetakan rapi atau tulisan tangan).

Cocokkan SETIAP karakter/goresan pada gambar kedua dengan yang paling mirip pada kartu referensi. Bekerja karakter per karakter dengan teliti:
- Karakter dasar (nglegena): konsonan + 'a' (mis. la, ra, ka)
- Sandhangan mengubah vokal: suku=u, wulu=i, taling=e, pepet=ê, tarung=o
- Tanda akhir suku kata: wignyan=h, cecak=ng, layar=r

Kemudian:
1. Tuliskan karakter aksara yang teridentifikasi (unicode aksara Jawa).
2. Transliterasikan ke huruf Latin dengan ejaan yang benar.
3. Terjemahkan ke Bahasa Indonesia yang natural.
4. Nilai keyakinanmu: "tinggi" jika semua karakter jelas cocok dengan referensi, "sedang" jika ada yang meragukan, "rendah" jika banyak tebakan.
5. Berikan maksimal 2 alternatif pembacaan lain yang masuk akal.

Jawab HANYA dengan JSON valid, tanpa teks lain:
{"aksara": "<karakter aksara Jawa>", "latin": "<transliterasi>", "indonesian": "<terjemahan>", "confidence": "tinggi/sedang/rendah", "alternatives": [{"latin": "<alt1>", "indonesian": "<arti1>"}, {"latin": "<alt2>", "indonesian": "<arti2>"}]}

HANYA jika gambar kedua benar-benar tidak mengandung goresan tulisan apapun yang menyerupai aksara, jawab:
{"latin": "", "indonesian": "", "error": "tidak ada aksara Jawa yang terdeteksi"}"""

# kartu referensi visual (di-load sekali saat startup)
_REF_B64 = None


def _ref_chart_b64():
    global _REF_B64
    if _REF_B64 is None:
        p = os.path.join(os.path.dirname(__file__), "reference_chart.jpg")
        with open(p, "rb") as f:
            _REF_B64 = base64.b64encode(f.read()).decode()
    return _REF_B64

TEXT2AKSARA_PROMPT = """Kamu adalah ahli aksara Jawa. Ubah teks Latin berikut menjadi aksara Jawa (unicode aksara Jawa, rentang U+A980-U+A9DF).

Aturan: gunakan aksara nglegena, sandhangan, dan pasangan yang benar sesuai kaidah penulisan aksara Jawa.

Jawab HANYA dengan JSON valid, tanpa teks lain:
{"aksara": "<hasil aksara Jawa>"}

Teks: """

app = FastAPI(title="Aksara AI")


def _chat(model: str, messages: list, max_tokens: int = 600, timeout: int = 120) -> str:
    if not ROUTER_KEY:
        raise HTTPException(500, "ROUTER_KEY belum dikonfigurasi di server.")
    with httpx.Client(timeout=timeout) as c:
        r = c.post(
            f"{ROUTER_URL}/chat/completions",
            headers={"Authorization": f"Bearer {ROUTER_KEY}", "Content-Type": "application/json"},
            json={"model": model, "max_tokens": max_tokens, "messages": messages},
        )
        if r.status_code != 200:
            raise HTTPException(502, f"AI router error {r.status_code}")
        return r.json()["choices"][0]["message"]["content"]


def _extract_json(text: str) -> dict:
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise HTTPException(502, "AI tidak mengembalikan JSON yang valid.")
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        raise HTTPException(502, "AI tidak mengembalikan JSON yang valid.")


@app.get("/api/health")
def health():
    return {"ok": True, "vision_model": VISION_MODEL}


@app.post("/api/transliterate")
async def transliterate(image: UploadFile = File(...)):
    data = await image.read()
    if not data:
        raise HTTPException(400, "File gambar kosong.")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Ukuran gambar maksimal 8MB.")
    ctype = image.content_type or "image/jpeg"
    if not ctype.startswith("image/"):
        raise HTTPException(400, "File harus berupa gambar.")

    b64 = base64.b64encode(data).decode()
    messages = [{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{_ref_chart_b64()}"}},
            {"type": "image_url", "image_url": {"url": f"data:{ctype};base64,{b64}"}},
            {"type": "text", "text": TRANSLITERATE_PROMPT},
        ],
    }]
    last_err = None
    for model in (VISION_MODEL, VISION_FALLBACK):
        try:
            raw = _chat(model, messages, max_tokens=800)
            out = _extract_json(raw)
            latin = (out.get("latin") or "").strip()
            # validasi kamus: kata yang tidak dikenal -> saran koreksi
            suggestions = []
            for w in latin.split():
                s = suggest(w)
                if s:
                    suggestions.append({"word": w, "candidates": s})
            return JSONResponse({
                "aksara": out.get("aksara", ""),
                "latin": latin,
                "indonesian": out.get("indonesian", ""),
                "confidence": out.get("confidence", "sedang"),
                "alternatives": out.get("alternatives") or [],
                "suggestions": suggestions,
                "error": out.get("error"),
                "model": model,
            })
        except HTTPException as e:
            last_err = e
            continue
    raise last_err or HTTPException(502, "Gagal memproses gambar.")


class TextIn(BaseModel):
    text: str


@app.post("/api/text-to-aksara")
def text_to_aksara(body: TextIn):
    text = (body.text or "").strip()[:200]
    if not text:
        raise HTTPException(400, "Teks kosong.")
    raw = _chat(TEXT_MODEL, [{"role": "user", "content": TEXT2AKSARA_PROMPT + text}], max_tokens=300)
    out = _extract_json(raw)
    return {"aksara": out.get("aksara", ""), "latin": text}


FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
