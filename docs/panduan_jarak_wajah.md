# Panduan Jarak Wajah v2 — Oval DINAMIS (mengunci ke wajah)

Perbaikan total dari versi statis. Oval TIDAK lagi diam di tengah — oval
digambar mengikuti kotak wajah hasil deteksi face-api secara real-time,
sehingga selalu pas di wajah pada posisi & jarak berapa pun. Status "pas"
ditentukan oleh proporsi lebar wajah terhadap frame.

Ini MENGGANTIKAN kode panduan jarak versi sebelumnya. Hapus dulu kode lama
(oval statis + startFaceGuide lama) sebelum menerapkan ini.

═══════════════════════════════════════════════════════════════════════════════
 LANGKAH 1 — index.html
═══════════════════════════════════════════════════════════════════════════════

Pastikan elemen <video id="camera-video"> DIBUNGKUS satu wrapper relative,
dan di dalam wrapper yang sama ada <canvas> untuk menggambar oval + label status.

GANTI elemen <video id="camera-video" ...></video> yang lama menjadi struktur ini:

```html
<div id="camera-stage" style="position:relative; display:inline-block; line-height:0;">
  <video id="camera-video" autoplay playsinline muted
         class="hidden w-full rounded-lg"
         style="max-height:280px; object-fit:cover;"></video>
  <!-- Canvas menutupi video, untuk menggambar oval dinamis -->
  <canvas id="face-guide-canvas"
          style="position:absolute; top:0; left:0; width:100%; height:100%;
                 pointer-events:none;"></canvas>
  <!-- Label status -->
  <div id="face-guide-status"
       style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
              background:rgba(0,0,0,0.6); color:#fff; padding:4px 12px;
              border-radius:9999px; font-size:13px; white-space:nowrap;
              pointer-events:none;">Posisikan wajah di dalam bingkai</div>
</div>
```

Hapus elemen #face-guide-wrap dan #face-guide-oval versi lama jika masih ada.

═══════════════════════════════════════════════════════════════════════════════
 LANGKAH 2 — js/camera.js
═══════════════════════════════════════════════════════════════════════════════

── 2a. Referensi elemen ──
Ganti referensi lama (faceGuideWrap/faceGuideOval) menjadi:

```javascript
const faceGuideCanvas  = document.getElementById('face-guide-canvas');
const faceGuideStatus  = document.getElementById('face-guide-status');
```

── 2b. Ganti seluruh blok fungsi panduan lama dengan ini ──

```javascript
// ── Panduan jarak wajah — oval DINAMIS mengikuti wajah ────────────
let faceGuideTimer = null;

// Rentang proporsi lebar wajah terhadap lebar frame yang dianggap "pas".
// Wajah harus cukup besar (dekat) agar tekstur kulit terbaca.
// Kalibrasi di HP: kalau susah "pas", turunkan MIN; kalau "pas" kejauhan,
// naikkan MIN.
const FACE_MIN_RATIO = 0.35;   // di bawah ini = terlalu jauh
const FACE_MAX_RATIO = 0.40;   // di atas ini  = terlalu dekat

function startFaceGuide() {
  if (typeof faceapi === 'undefined' || typeof isFaceModelLoaded === 'undefined'
      || !isFaceModelLoaded) {
    captureBtn.disabled = false;   // fallback: panduan mati, tombol tetap aktif
    return;
  }

  const ctx = faceGuideCanvas.getContext('2d');

  faceGuideTimer = setInterval(async () => {
    // Samakan ukuran internal canvas dengan ukuran tampil video,
    // supaya koordinat gambar pas dengan yang terlihat.
    const w = videoEl.clientWidth;
    const h = videoEl.clientHeight;
    if (faceGuideCanvas.width !== w)  faceGuideCanvas.width  = w;
    if (faceGuideCanvas.height !== h) faceGuideCanvas.height = h;
    ctx.clearRect(0, 0, w, h);

    let deteksi = null;
    try {
      deteksi = await faceapi.detectSingleFace(
        videoEl,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
      );
    } catch (e) { return; }

    if (!deteksi) {
      faceGuideStatus.textContent = 'Posisikan wajah di dalam bingkai';
      captureBtn.disabled = true;
      return;
    }

    // Skala dari koordinat video asli (videoWidth) ke ukuran tampil (w).
    const skalaX = w / videoEl.videoWidth;
    const skalaY = h / videoEl.videoHeight;
    const box = deteksi.box;

    // Titik pusat & ukuran oval mengikuti kotak wajah.
    let cx = (box.x + box.width / 2) * skalaX;
    const cy = (box.y + box.height / 2) * skalaY;
    // Oval sedikit lebih besar dari kotak wajah agar melingkupi wajah.
    const rx = (box.width  * skalaX) / 2 * 1.15;
    const ry = (box.height * skalaY) / 2 * 1.35;

    // Kamera depan di-mirror (scaleX(-1)) → cerminkan X agar oval pas.
    if (facingMode === 'user') cx = w - cx;

    // Tentukan status dari proporsi lebar wajah terhadap frame.
    const rasio = box.width / videoEl.videoWidth;
    let warna, teks, kunci;
    if (rasio < FACE_MIN_RATIO) {
      warna = '#ef4444'; teks = 'Terlalu jauh — dekatkan wajah'; kunci = true;
    } else if (rasio > FACE_MAX_RATIO) {
      warna = '#ef4444'; teks = 'Terlalu dekat — mundur sedikit'; kunci = true;
    } else {
      warna = '#22c55e'; teks = 'Posisi pas — silakan ambil foto'; kunci = false;
    }

    // Gambar oval mengikuti wajah.
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = warna;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    faceGuideStatus.textContent = teks;
    captureBtn.disabled = kunci;
  }, 250);
}

function stopFaceGuide() {
  if (faceGuideTimer) { clearInterval(faceGuideTimer); faceGuideTimer = null; }
  if (faceGuideCanvas) {
    const ctx = faceGuideCanvas.getContext('2d');
    ctx && ctx.clearRect(0, 0, faceGuideCanvas.width, faceGuideCanvas.height);
  }
  if (faceGuideStatus) faceGuideStatus.textContent = 'Posisikan wajah di dalam bingkai';
}
```

── 2c. Panggil startFaceGuide di onloadedmetadata ──
Sama seperti sebelumnya: di dalam videoEl.onloadedmetadata,
set `captureBtn.disabled = true;` lalu panggil `startFaceGuide();`
setelah baris `videoEl.style.transform = ...;`.

── 2d. Panggil stopFaceGuide di stopCamera ──
Baris pertama di dalam stopCamera(): `stopFaceGuide();`

═══════════════════════════════════════════════════════════════════════════════
 CATATAN
═══════════════════════════════════════════════════════════════════════════════

1. Oval sekarang MENGIKUTI wajah — tidak akan meleset lagi. Kalau wajah
   bergerak, oval ikut. Kalau tidak ada wajah, oval hilang.

2. Yang menentukan "pas" adalah FACE_MIN_RATIO / FACE_MAX_RATIO (0.35 / 0.40).
   Nilai ini lebih tinggi dari versi lama supaya wajah cukup DEKAT (mengisi
   35-40% frame) demi ketajaman tekstur kulit. Sesuaikan di HP.

3. Penanganan mirror kamera depan sudah ada (baris `if (facingMode === 'user')
   cx = w - cx;`). Jika kamera belakang dipakai, tidak dicerminkan.

4. capturePhoto() TIDAK diubah — foto tetap full frame tanpa crop.

5. Interval 250ms; naikkan ke 350-400ms bila HP terasa berat.
```
