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

Perbandingan lengkap 9 kombinasi (3 arsitektur × 3 class weight) ada di
`notebooks/04_train_compare_export.ipynb`.

## Struktur Folder
