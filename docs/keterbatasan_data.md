# Keterbatasan Dataset & Panduan Ekspansi

## 1. Temuan Duplikasi Identik (Killa92 = Otar)
Pada saat pengumpulan dataset awal, direncanakan penggunaan 4 dataset publik: 2 dari Kaggle dan 2 dari Roboflow. Namun, pada saat proses deduplikasi dan verifikasi, ditemukan fakta bahwa dataset Kaggle `killa92/facial-skin-analysis-and-type-classification` adalah duplikat byte-level yang **identik persis** dengan dataset Roboflow `otar-7kgkd/skin-type-tgow5`. 
- Distribusi kelas sama persis (Kombinasi: 341, Kering: 1203, Normal: 1399, Berminyak: 1150).
- Hal ini menandakan bahwa akun di Kaggle dan Roboflow tersebut kemungkinan besar mengambil sumber yang persis sama atau saling me-reupload data satu sama lain.

**Keputusan:** Dataset `killa92` dikeluarkan dari pipeline untuk menghindari bias duplikasi ganda dalam eksperimen, dan menyisakan **3 dataset unik**. Ini membuktikan pentingnya implementasi *Cross-Source Deduplication* yang robust sebelum eksperimen.

## 2. Bias Demografis & Etnis
Ketiga dataset publik yang digunakan (`theaskin/skin-types2`, `otar-7kgkd/skin-type`, `dilaaurafutri/skin-type-classification-4-types`) tidak menyertakan metadata mengenai etnis atau asal populasi pada gambar.
- **Dampak:** Model mungkin dilatih pada mayoritas kulit ras Kaukasia/Kaukasoid atau ras lain yang tidak merepresentasikan target audiens pengguna aplikasi secara spesifik, yaitu masyarakat Asia (khususnya Indonesia).
- Model berpotensi mengalami bias akurasi jika diterapkan pada kulit lokal.

## 3. Ukuran Data Relatif Terbatas
Total gambar bersih setelah deduplikasi gabungan dari 3 sumber bernilai sekitar ribuan awal (tergantung tingkat deduplikasi pHash/Hamming). Angka ini masih tergolong kecil untuk sebuah klasifikasi fitur mikro pada tekstur kulit yang sangat fine-grained. Model transfer learning (MobileNet, EfficientNet, DenseNet) telah diimplementasikan untuk mengimbangi hal ini, namun penambahan sampel data baru sangat direkomendasikan untuk akurasi yang lebih andal.

## 4. Potensi Domain Shift
Kualitas pengumpulan dataset bervariasi:
- Gambar dataset publik mayoritas diambil menggunakan kamera resolusi tinggi dengan pencahayaan terkontrol atau semi-terkontrol (cahaya klinis).
- **Aplikasi Web (Inference):** Digunakan melalui webcam pengguna (laptop/HP) dengan variasi resolusi, noise, dan pencahayaan yang tidak terprediksi (gelap, backlight, dsb).
- Ada resiko **Domain Shift** yang menyebabkan metrik pada test set terlihat tinggi, namun performa di aplikasi nyata menurun. Teknik augmentasi data agresif pada fase training (seperti Jitter cahaya dan rotasi) telah diterapkan untuk mengatasi sebagian varians ini.

---

## Panduan Ekspansi Data Baru (Contoh: RSPAD / Kulit Lokal)

Arsitektur *pipeline* pada proyek ini didesain sangat *extensible*. Jika di masa depan Anda ingin menambahkan kumpulan data baru (seperti data klinis lokal dari rumah sakit atau survei mandiri), tidak perlu mengubah struktur *training script* secara drastis.

Berikut adalah langkah-langkahnya:

1. **Siapkan Folder Data Mentah**
   Bentuk data Anda menjadi 4 folder sub-kelas (wajib menggunakan format huruf kecil Bahasa Inggris).
   Tempatkan dalam satu folder root (misal `dataset_rspad`).
   ```text
   dataset_rspad/
     ├── combination/
     ├── dry/
     ├── normal/
     └── oily/
   ```

2. **Gunakan Script `01_download_merge.py` (Custom) atau salin manual**
   Salin folder tersebut langsung ke direktori output Kaggle: `/kaggle/working/raw_merged/sumber_baru/`
   ```python
   # Di Kaggle notebook:
   import shutil
   shutil.copytree('/kaggle/input/dataset_rspad', '/kaggle/working/raw_merged/sumber_baru')
   ```

3. **Jalankan Ulang `02_cleaning.py`**
   Script *cleaning* dirancang untuk secara otomatis mendeteksi semua sub-folder yang berada di dalam `raw_merged/`. Script akan otomatis:
   - Melakukan hash pada data baru
   - Melakukan deduplikasi internal data baru
   - Membandingkan deduplikasi lintas-sumber (agar tidak ada kebocoran antar data baru dengan dataset publik yang sudah ada).

4. **Jalankan Ulang `03_split.py`**
   Data baru otomatis dipecah menjadi `train/val/test` dengan logika `StratifiedGroupKFold` berdasarkan P-Hash, sehingga gambar yang mirip dari sesi foto yang sama tidak akan bocor ke test set.

5. **Tambahkan Konfigurasi Eksperimen (Opsional)**
   Di notebook training final (04_train_compare_export.ipynb), Anda cukup mengarahkan DATA_DIR ke folder splits yang baru yang memuat eksperimen data kombinasi tersebut (Misalnya "Exp-3" atau "Exp-4"). Preprocessing torchvision dan WebApp ONNX tidak perlu ada perubahan kode sama sekali.
