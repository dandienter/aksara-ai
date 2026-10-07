# AKSARA AI

Foto aksara Jawa, AI yang membaca. Aplikasi web untuk mentransliterasi aksara Jawa dari foto menjadi huruf Latin + Bahasa Indonesia, plus mode belajar interaktif.

Dibuat untuk **LOGICODIX 2026** (NextGen Digital Innovation) — subtema Smart & Fun Education.

## Fitur

- **Pindai**: foto langsung (kamera) atau upload → AI mentransliterasi aksara Jawa ke Latin + terjemahan Bahasa Indonesia, lengkap dengan tingkat keyakinan, alternatif bacaan, dan koreksi kamus
- **Belajar**: flashcard 26 aksara + kuis pilihan ganda
- **Latin → Aksara**: ketik teks Latin, jadi aksara Jawa
- **Riwayat**: hasil pindaian tersimpan lokal di perangkat

## Teknologi

- Backend: FastAPI (Python)
- Frontend: HTML/CSS/JS murni, mobile-first + responsif desktop
- AI: Vision LLM + kartu referensi visual aksara Jawa untuk akurasi

## Cara Jalan

```bash
cd backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp ../.env.example ../.env  # lalu isi ROUTER_KEY
./venv/bin/uvicorn main:app --host 127.0.0.1 --port 8901
```

Buka http://127.0.0.1:8901

## Tim

- Rafi Budiansyah (202443500232)
- Ahmad Dandi Subhani (202343500126)
- Rendy Setiawan (202343501763)
- Wakhid Pangestu (202443500833)

Universitas Indraprasta PGRI — Teknik Informatika
