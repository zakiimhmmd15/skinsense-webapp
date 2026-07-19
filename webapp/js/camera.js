/**
 * camera.js
 * ─────────────────────────────────────────────────────────────────
 * Fitur akses kamera browser (getUserMedia) untuk halaman Deteksi.
 *
 * Struktur tampilan (satu drop-zone, tiga state):
 *   STATE 1 — #upload-default-state  : default, area drag-drop + 2 tombol
 *   STATE 2 — #camera-view-state     : live video kamera
 *   STATE 3 — #preview-container     : overlay foto hasil upload / capture
 *
 * Tidak mengubah inference.js / preprocess.js / logika inferensi.
 * Setelah capturePhoto(), gambar masuk ke #image-preview → enableAnalyzeBtn().
 * ─────────────────────────────────────────────────────────────────
 */

// ── State kamera ──────────────────────────────────────────────────
let cameraStream = null;   // MediaStream aktif
let facingMode   = 'user'; // 'user' = depan, 'environment' = belakang

// ── Referensi elemen DOM ──────────────────────────────────────────
const videoEl           = document.getElementById('camera-video');
const uploadDefaultEl   = document.getElementById('upload-default-state');
const cameraViewEl      = document.getElementById('camera-view-state');
const cameraLoadingEl   = document.getElementById('camera-loading');
const cameraPermErr     = document.getElementById('camera-perm-error');
const cameraControlsBar = document.getElementById('camera-controls-bar');
const captureBtn        = document.getElementById('capture-btn');
const flipBtn           = document.getElementById('flip-btn');
const faceGuideCanvas  = document.getElementById('face-guide-canvas');
const faceGuideStatus  = document.getElementById('face-guide-status');
const btnBukaKamera     = document.getElementById('btn-buka-kamera');
const btnCancelCamera   = document.getElementById('btn-cancel-camera');
const btnCancelCameraErr= document.getElementById('btn-cancel-camera-err');
const btnRetryCamera    = document.getElementById('btn-retry-camera');
const btnPilihFoto      = document.getElementById('btn-pilih-foto');

// ── Helper: tampilkan HANYA satu state, sembunyikan yang lain ─────
function showState(state) {
  // state: 'upload' | 'camera'
  // preview-container dikendalikan oleh app.js (overlay absolut)
  if (state === 'upload') {
    uploadDefaultEl.classList.remove('hidden');
    uploadDefaultEl.style.display = 'flex';
    cameraViewEl.classList.add('hidden');
    cameraViewEl.style.display = '';
  } else if (state === 'camera') {
    uploadDefaultEl.classList.add('hidden');
    uploadDefaultEl.style.display = '';
    cameraViewEl.classList.remove('hidden');
    cameraViewEl.style.display = 'flex';
  }
}

// ── Reset sub-elemen di dalam camera-view-state ───────────────────
function resetCameraView() {
  cameraLoadingEl.classList.add('hidden');
  cameraLoadingEl.style.display = '';
  cameraPermErr.classList.add('hidden');
  cameraPermErr.style.display = '';
  videoEl.classList.add('hidden');
  if (faceGuideStatus) faceGuideStatus.style.display = 'none';
  cameraControlsBar.classList.add('hidden');
  cameraControlsBar.style.display = '';
  captureBtn.disabled = true;
}

// ── Panduan jarak wajah v2 — oval DINAMIS mengikuti wajah ─────────
let faceGuideTimer = null;

// Rentang proporsi lebar wajah terhadap lebar frame yang dianggap "pas".
// Wajah harus cukup besar (dekat) agar tekstur kulit terbaca.
// Kalibrasi di HP: kalau susah "pas", turunkan MIN; kalau "pas" kejauhan, naikkan MIN.
const FACE_MIN_RATIO = 0.25;   // di bawah ini = terlalu jauh (dikalibrasi dari rasio aktual ~0.30)
const FACE_MAX_RATIO = 0.75;   // di atas ini  = terlalu dekat (dikalibrasi: "kedekatan" ~0.37-0.38)

function startFaceGuide() {
  // Catatan: video SUDAH ditampilkan di onloadedmetadata (videoEl tampil
  // terlepas dari status face-api). Fungsi ini hanya mengurus oval + status.
  //
  // Cek kesiapan face-api langsung dari library-nya sendiri (bukan lewat
  // variabel isFaceModelLoaded dari inference.js, yang scope-nya tidak
  // selalu terbaca dari file ini). tinyFaceDetector.params terisi setelah
  // model selesai diunduh.
  const faceReady = (typeof faceapi !== 'undefined')
      && faceapi.nets
      && faceapi.nets.tinyFaceDetector
      && faceapi.nets.tinyFaceDetector.params;

  if (!faceReady) {
    // Face-api belum siap → panduan belum jalan, tapi kamera tetap berfungsi
    // dan tombol foto tetap bisa dipakai. Coba lagi sebentar (model mungkin
    // masih diunduh dari CDN).
    captureBtn.disabled = false;
    if (faceGuideStatus) faceGuideStatus.style.display = 'none';
    setTimeout(() => {
      if (cameraStream && !faceGuideTimer) startFaceGuide();
    }, 1000);
    return;
  }

  if (faceGuideStatus) faceGuideStatus.style.display = 'block';

  faceGuideTimer = setInterval(async () => {
    let deteksi = null;
    try {
      deteksi = await faceapi.detectSingleFace(
        videoEl,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
      );
    } catch (e) { return; }

    if (!deteksi) {
      if (faceGuideStatus) faceGuideStatus.textContent = 'Posisikan wajah di dalam bingkai';
      captureBtn.disabled = true;
      return;
    }

    // Hitung proporsi lebar wajah terhadap frame (proksi jarak).
    const box = deteksi.box;
    const rasio = box.width / videoEl.videoWidth;
    let teks, kunci;
    if (rasio < FACE_MIN_RATIO) {
      teks = 'Terlalu jauh — dekatkan wajah'; kunci = true;
    } else if (rasio > FACE_MAX_RATIO) {
      teks = 'Terlalu dekat — mundur sedikit'; kunci = true;
    } else {
      teks = 'Posisi pas — silakan ambil foto'; kunci = false;
    }

    if (faceGuideStatus) faceGuideStatus.textContent = teks;
    captureBtn.disabled = kunci;
  }, 250);
}

function stopFaceGuide() {
  if (faceGuideTimer) { clearInterval(faceGuideTimer); faceGuideTimer = null; }
  if (faceGuideCanvas) {
    const ctx = faceGuideCanvas.getContext('2d');
    ctx && ctx.clearRect(0, 0, faceGuideCanvas.width, faceGuideCanvas.height);
  }
  if (faceGuideStatus) {
    faceGuideStatus.textContent = 'Posisikan wajah di dalam bingkai';
    faceGuideStatus.style.display = 'none';
  }
}

// ── Buka kamera ───────────────────────────────────────────────────
async function openCamera() {
  showState('camera');
  resetCameraView();

  // Tampilkan loading
  cameraLoadingEl.classList.remove('hidden');
  cameraLoadingEl.style.display = 'flex';

  // Hentikan stream lama jika ada
  stopCamera();

  const constraints = {
    video: {
      facingMode: facingMode,
      width:  { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = cameraStream;
    videoEl.onloadedmetadata = () => {
      cameraLoadingEl.classList.add('hidden');
      cameraLoadingEl.style.display = '';
      videoEl.classList.remove('hidden');   // ← WAJIB: tampilkan video (baris ini hilang di v2)
      cameraControlsBar.classList.remove('hidden');
      cameraControlsBar.style.display = 'flex';
      captureBtn.disabled = true;   // terkunci dulu; dibuka saat posisi pas
      // Mirror: kamera depan di-mirror, kamera belakang tidak
      videoEl.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
      startFaceGuide();  // mulai loop deteksi oval dinamis
    };
  } catch (err) {
    cameraLoadingEl.classList.add('hidden');
    cameraLoadingEl.style.display = '';
    cameraPermErr.classList.remove('hidden');
    cameraPermErr.style.display = 'flex';
    console.warn('[Camera] Akses ditolak atau tidak tersedia:', err.name, err.message);
  }
}

// ── Hentikan kamera ───────────────────────────────────────────────
function stopCamera() {
  stopFaceGuide();
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    videoEl.srcObject = null;
  }
}

// ── Tutup kamera & kembali ke area upload ─────────────────────────
function closeCamera() {
  stopCamera();
  resetCameraView();
  showState('upload');
}

// ── Flip kamera (depan ↔ belakang) ───────────────────────────────
async function flipCamera() {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  // Animasi spin pada ikon flip
  const iconEl = flipBtn.querySelector('.material-symbols-outlined');
  if (iconEl) {
    iconEl.style.transition = 'transform 0.35s ease';
    iconEl.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      iconEl.style.transition = '';
      iconEl.style.transform  = '';
    }, 400);
  }
  await openCamera();
}

// ── Capture foto dari video ───────────────────────────────────────
/**
 * Tangkap satu frame dari live video → masukkan ke #image-preview
 * → panggil enableAnalyzeBtn() (dari app.js).
 * Logika preprocessing & inferensi tidak diubah sama sekali.
 */
function capturePhoto() {
  if (!cameraStream) return;

  const canvas = document.getElementById('processing-canvas');
  const ctx    = canvas.getContext('2d');
  const vw     = videoEl.videoWidth;
  const vh     = videoEl.videoHeight;
  canvas.width  = vw;
  canvas.height = vh;

  // Mirror kamera depan supaya foto tidak terbalik
  if (facingMode === 'user') {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, -vw, 0, vw, vh);
    ctx.restore();
  } else {
    ctx.drawImage(videoEl, 0, 0, vw, vh);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

  // Hentikan kamera & kembali ke area upload
  stopCamera();
  resetCameraView();
  showState('upload');

  // Pasang hasil ke #image-preview (dipakai oleh preprocessImage)
  const imagePreview     = document.getElementById('image-preview');
  const previewContainer = document.getElementById('preview-container');

  imagePreview.src = dataUrl;
  previewContainer.classList.remove('hidden');
  previewContainer.style.display = 'flex';
  uploadDefaultEl.classList.add('hidden');
  uploadDefaultEl.style.display = '';

  // Sembunyikan hasil analisis sebelumnya
  document.getElementById('result-section').classList.add('hidden');

  // Aktifkan tombol Analisis (fungsi dari app.js)
  enableAnalyzeBtn();

  // Efek kilat singkat
  previewContainer.classList.add('capture-flash');
  setTimeout(() => previewContainer.classList.remove('capture-flash'), 300);
}

// ── Blokir semua klik dari dalam camera-view-state ────────────────
// Ini mencegah klik pada video, area kosong, atau tombol apa pun di
// dalam camera view dari memicu drop-zone click handler (yang akan
// membuka file picker). Ini adalah penjaga paling andal.
cameraViewEl.addEventListener('click', (e) => e.stopPropagation());

// ── Bind tombol "Pilih Foto" ──────────────────────────────────────
btnPilihFoto.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('file-input').click();
});

// ── Bind tombol "Buka Kamera" ─────────────────────────────────────
btnBukaKamera.addEventListener('click', (e) => {
  e.stopPropagation();
  openCamera();
});

// ── Bind tombol "Ambil Foto" ───────────────────────────────────────
captureBtn.addEventListener('click', (e) => { e.stopPropagation(); capturePhoto(); });

// ── Bind tombol "Balik Kamera" ────────────────────────────────────
flipBtn.addEventListener('click', (e) => { e.stopPropagation(); flipCamera(); });

// ── Bind tombol "Batal" (dalam camera-view) ───────────────────────
btnCancelCamera.addEventListener('click', (e) => { e.stopPropagation(); closeCamera(); });

// ── Bind tombol "Batal" dalam error state ────────────────────────
if (btnCancelCameraErr) {
  btnCancelCameraErr.addEventListener('click', (e) => { e.stopPropagation(); closeCamera(); });
}

// ── Bind tombol "Coba Lagi" dalam error state ─────────────────────
if (btnRetryCamera) {
  btnRetryCamera.addEventListener('click', (e) => { e.stopPropagation(); openCamera(); });
}

// ── Hentikan kamera saat pindah halaman ───────────────────────────
document.addEventListener('pageswitch', (e) => {
  if (e.detail && e.detail.pageId !== 'deteksi') {
    stopCamera();
    resetCameraView();
    showState('upload');
  }
});