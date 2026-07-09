# SkinSense — Klasifikasi Tipe Kulit Wajah

Aplikasi web untuk mengklasifikasikan tipe kulit wajah (Kombinasi, Kering, Normal,
Berminyak) menggunakan model deep learning yang berjalan sepenuhnya di browser
(client-side inference), tanpa mengirim data foto pengguna ke server mana pun.

Dikembangkan sebagai bagian dari Penelitian Ilmiah (skripsi), 2026.

## Fitur

- Deteksi wajah otomatis + panduan jarak wajah real-time saat memakai kamera
- Klasifikasi tipe kulit dalam hitungan detik, langsung di perangkat pengguna
- Halaman edukasi tipe kulit dengan referensi jurnal dermatologi
- Privasi penuh — seluruh proses (deteksi wajah, preprocessing, inferensi) berjalan
  lokal via WebAssembly, tidak ada foto yang diunggah ke server

## Model

| Item              | Detail                              |
|-------------------|--------------------------------------|
| Arsitektur        | DenseNet121 (torchvision, pretrained ImageNet) |
| Class weight      | 1.5 (kelas "normal")                |
| Akurasi (test)    | 79.0%                               |
| F1-score (macro)  | 78.45%                              |
| Recall kelas Normal | 58.0%                              |
| Format deploy     | ONNX (FP32), dijalankan via onnxruntime-web (WASM) |

Perbandingan lengkap 9 kombinasi (3 arsitektur × 3 class weight) ada di `notebooks/klafikasi-tipe-kulit-wajah-final.ipynb`.

## Struktur Folder

```text
.
├── docs/                      # Dokumentasi proyek
│   ├── keterbatasan_data.md
│   └── panduan_jarak_wajah.md
├── notebooks/                 # Jupyter notebook training model
│   └── klafikasi-tipe-kulit-wajah-final.ipynb
└── webapp/                    # Kode sumber aplikasi web (frontend)
    ├── css/                   # Styling aplikasi
    ├── js/                    # Logika aplikasi (kamera, inferensi, dsb.)
    ├── SkinSense/             # Aset desain dan UI/UX (Design.md)
    ├── densenet121_skin.onnx  # Model ONNX yang sudah dilatih
    ├── index.html             # Halaman antarmuka utama
    ├── model_info.json        # Metadata model
    ├── serve.js               # Script server pengembangan lokal
    └── vercel.json            # Konfigurasi deployment Vercel (CORS/Headers)
```

## Menjalankan Web App Secara Lokal

```bash
cd webapp
node serve.js
```

Buka `http://localhost:3000` di browser. Untuk mengakses dari HP di jaringan yang
sama, gunakan alamat jaringan lokal yang ditampilkan di terminal setelah server
berjalan.

## Disclaimer

Alat ini dibuat untuk tujuan akademik dan edukasi mandiri, bukan pengganti
diagnosis medis profesional.
