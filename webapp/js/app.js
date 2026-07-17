/**
 * app.js
 * ─────────────────────────────────────────────────────────────────
 * Logika UI: navigasi menu, upload/preview gambar, tombol Analisis,
 * tampilkan/reset hasil.
 *
 * Dependensi (harus dimuat lebih dulu via <script> di index.html):
 *   ort.min.js   → onnxruntime-web global `ort`
 *   inference.js → ortSession, CLASS_LABELS, loadModel, showResult
 *   preprocess.js→ preprocessImage
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════
//  NAVIGASI MENU
// ═══════════════════════════════════════════════════════════════════

const PAGES = ['deteksi', 'tipe-kulit', 'tentang'];

/**
 * Perbarui posisi sliding indicator pada bottom nav mobile
 */
function updateBottomNavIndicator() {
  const activeBnav = document.querySelector('#bottom-nav button.active-btn');
  const indicator = document.getElementById('bottom-nav-indicator');
  const navEl = document.getElementById('bottom-nav');
  if (!activeBnav || !indicator || !navEl) return;

  // Pastikan nav ditampilkan sebelum mengukur (jika di layar desktop, ukurannya mungkin 0)
  if (navEl.offsetWidth === 0 || navEl.offsetHeight === 0) return;

  const navRect = navEl.getBoundingClientRect();
  const btnRect = activeBnav.getBoundingClientRect();

  const left = btnRect.left - navRect.left;
  const top = btnRect.top - navRect.top;

  indicator.style.width = `${btnRect.width}px`;
  indicator.style.height = `${btnRect.height}px`;
  indicator.style.left = `${left}px`;
  indicator.style.top = `${top}px`;
}

/**
 * Tampilkan halaman yang dipilih, sembunyikan yang lain.
 * Perbarui state aktif di top nav (desktop) dan bottom nav (mobile).
 * @param {string} pageId - salah satu dari PAGES
 */
function switchPage(pageId) {
  // Sembunyikan semua halaman & reset state nav
  PAGES.forEach(p => {
    document.getElementById(`page-${p}`).classList.remove('active');

    const navEl = document.getElementById(`nav-${p}`);
    if (navEl) {
      navEl.classList.remove('nav-active');
      navEl.classList.add('text-on-surface-variant');
    }
    const bnavEl = document.getElementById(`bnav-${p}`);
    if (bnavEl) {
      bnavEl.classList.remove('active-btn', 'text-on-secondary-container');
      bnavEl.classList.add('text-on-surface-variant');
    }
  });

  // Tampilkan halaman yang diminta
  document.getElementById(`page-${pageId}`).classList.add('active');

  const activeNav = document.getElementById(`nav-${pageId}`);
  if (activeNav) {
    activeNav.classList.add('nav-active');
    activeNav.classList.remove('text-on-surface-variant');
  }
  const activeBnav = document.getElementById(`bnav-${pageId}`);
  if (activeBnav) {
    activeBnav.classList.add('active-btn', 'text-on-secondary-container');
    activeBnav.classList.remove('text-on-surface-variant');
  }



  // Dispatch event agar camera.js bisa menghentikan kamera saat pindah halaman
  document.dispatchEvent(new CustomEvent('pageswitch', { detail: { pageId } }));

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Perbarui posisi indicator
  updateBottomNavIndicator();
}

// Bind desktop nav links
document.getElementById('desktop-nav').querySelectorAll('a[data-page]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchPage(a.dataset.page); });
});

// Bind bottom nav buttons
document.getElementById('bottom-nav').querySelectorAll('button[data-page]').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});



// Micro-animation hover pada kartu Tipe Kulit
document.querySelectorAll('.bento-grid > div').forEach(card => {
  card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-4px)');
  card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
});

// ═══════════════════════════════════════════════════════════════════
//  UPLOAD & PREVIEW GAMBAR
// ═══════════════════════════════════════════════════════════════════

const dropZone         = document.getElementById('drop-zone');
const fileInput        = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const uploadDefault    = document.getElementById('upload-default-state');
const imagePreview     = document.getElementById('image-preview');
const removeBtn        = document.getElementById('remove-btn');
const analyzeBtn       = document.getElementById('analyze-btn');
const resultSection    = document.getElementById('result-section');

// Cegah perilaku default browser untuk drag-and-drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
  document.body.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
});
['dragenter', 'dragover'].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.add('drag-over'))
);
['dragleave', 'drop'].forEach(evt =>
  dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'))
);

dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', function () { handleFiles(this.files); });

// Klik zona upload → buka file picker
// (kecuali preview atau camera-view sudah tampil, atau klik berasal dari dalam camera-view)
dropZone.addEventListener('click', (e) => {
  // Jika klik berasal dari dalam area kamera (tombol apa pun, video, dsb),
  // JANGAN buka file picker — ini penjaga paling andal, tidak bergantung pada state.
  if (e.target.closest('#camera-view-state')) return;
  if (!previewContainer.classList.contains('hidden')) return;
  fileInput.click();
});

/**
 * Resize gambar menggunakan canvas agar tidak berat saat diproses
 * dan otomatis menangani orientasi EXIF (lewat rendering browser modern).
 * @param {File} file 
 * @param {number} maxSize Sisi terpanjang maksimal (px)
 * @returns {Promise<string>} Data URL dari gambar yang di-resize
 */
function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Kompresi ringan agar base64 tidak terlalu besar
        resolve(canvas.toDataURL(file.type, 0.9));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Proses file gambar yang dipilih/di-drop: otomatis resize, tampilkan preview,
 * dan aktifkan tombol Analisis.
 * @param {FileList} files
 */
async function handleFiles(files) {
  if (!files.length) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) {
    showAnalysisMessage('File yang dipilih bukan gambar. Harap unggah file JPG atau PNG.');
    return;
  }

  // Tampilkan preview state awal (loading tersirat) untuk responsivitas UI
  previewContainer.classList.remove('hidden');
  previewContainer.style.display = 'flex';
  uploadDefault.classList.add('hidden');
  resultSection.classList.add('hidden');  // sembunyikan hasil run sebelumnya
  hideAnalysisMessage();                  // bersihkan pesan error jika ada

  try {
    const resizedDataUrl = await resizeImage(file, 1024);
    imagePreview.src = resizedDataUrl;
    enableAnalyzeBtn();
  } catch (err) {
    showAnalysisMessage('Gagal memproses gambar. Silakan coba file lain.');
    console.error('Error saat resize gambar:', err);
    resetUpload();
  }
}

/** Aktifkan tombol Analisis (setelah gambar dimuat). */
function enableAnalyzeBtn() {
  analyzeBtn.disabled = false;
  analyzeBtn.classList.remove(
    'opacity-50', 'cursor-not-allowed', 'bg-primary-container', 'text-on-primary-container'
  );
  analyzeBtn.classList.add('bg-primary', 'text-on-primary', 'hover:opacity-90', 'shadow-lg', 'active:scale-95');
}

/** Nonaktifkan tombol Analisis (state awal / setelah reset). */
function disableAnalyzeBtn() {
  analyzeBtn.disabled = true;
  analyzeBtn.classList.add(
    'opacity-50', 'cursor-not-allowed', 'bg-primary-container', 'text-on-primary-container'
  );
  analyzeBtn.classList.remove('bg-primary', 'text-on-primary', 'hover:opacity-90', 'shadow-lg', 'active:scale-95');
}

// Tombol hapus foto & tombol "Coba Foto Lain"
removeBtn.addEventListener('click', e => { e.stopPropagation(); resetUpload(); });
document.getElementById('reset-btn').addEventListener('click', resetUpload);

/** Kembalikan halaman Deteksi ke state awal (sebelum upload). */
function resetUpload() {
  previewContainer.classList.add('hidden');
  previewContainer.style.display = '';
  // Pastikan area upload default kembali terlihat
  uploadDefault.classList.remove('hidden');
  uploadDefault.style.display = 'flex';
  // Pastikan camera-view tersembunyi
  const cameraViewEl = document.getElementById('camera-view-state');
  if (cameraViewEl) {
    cameraViewEl.classList.add('hidden');
    cameraViewEl.style.display = '';
  }
  imagePreview.src = '';
  fileInput.value  = '';
  disableAnalyzeBtn();
  resultSection.classList.add('hidden');
  hideAnalysisMessage(); // Bersihkan pesan error/peringatan deteksi wajah
  analyzeBtn.innerHTML = `<span class="material-symbols-outlined">auto_fix</span> Analisis Sekarang`;
  // Hentikan kamera jika sedang aktif (fungsi dari camera.js)
  if (typeof stopCamera === 'function') stopCamera();
}

// ═══════════════════════════════════════════════════════════════════
//  TOMBOL ANALISIS — orkestrasi inferensi
// ═══════════════════════════════════════════════════════════════════

// ── Helper: animasi loading bertahap (1.5 detik) ────────────────────
/**
 * Tampilkan overlay loading dengan teks berganti, total ~1.5 detik.
 * Berjalan paralel dengan proses analisis (Promise.all).
 * @returns {Promise<void>} resolve setelah animasi selesai
 */
function runLoadingAnimation() {
  const overlay   = document.getElementById('analysis-loading-overlay');
  const stepText  = document.getElementById('loading-step-text');
  const STEPS = [
    { text: 'Memeriksa wajah',           delay: 500 },
    { text: 'Menganalisis tekstur kulit', delay: 500 },
    { text: 'Menyiapkan hasil',           delay: 500 },
  ];

  // Tampilkan overlay
  overlay.style.display = 'flex';
  stepText.textContent = STEPS[0].text;

  return new Promise((resolve) => {
    let stepIdx = 1;

    function nextStep() {
      if (stepIdx >= STEPS.length) {
        // Semua langkah selesai — sembunyikan overlay & resolve
        overlay.style.display = 'none';
        resolve();
        return;
      }

      // Fade out teks lama
      stepText.classList.add('fade-out');
      setTimeout(() => {
        // Ganti teks & fade in
        stepText.textContent = STEPS[stepIdx].text;
        stepText.classList.remove('fade-out');
        stepIdx++;
        setTimeout(nextStep, STEPS[stepIdx - 1]?.delay ?? 1000);
      }, 300); // durasi transisi fade (harus cocok dengan CSS transition 0.3s)
    }

    // Mulai langkah pertama setelah delay langkah [0]
    setTimeout(nextStep, STEPS[0].delay);
  });
}

// ── Fungsi analisis inti (tanpa UI loading) ───────────────────────
/**
 * Jalankan seluruh pipeline analisis: deteksi wajah → preprocess → inferensi.
 * Mengembalikan { predLabel, probs } jika berhasil, atau melempar Error.
 * Tidak menyentuh DOM hasil — hanya komputasi.
 */
async function runAnalysis() {
  // ── 1. Pengecekan Kesiapan Library & Deteksi Wajah (WAJIB) ──
  if (typeof faceapi === 'undefined' || !isFaceModelLoaded) {
    throw new Error('FACE_MODEL_NOT_READY');
  }

  // ── ⏱ Deteksi Wajah ─────────────────────────────────────────
  console.time('⏱ [1] Deteksi wajah (FaceAPI)');
  const t0Face = performance.now();
  console.log('[FaceAPI] Memulai deteksi wajah pada imagePreview...');
  const detections = await faceapi.detectAllFaces(
    imagePreview,
    new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
  );
  const t1Face = performance.now();
  console.timeEnd('⏱ [1] Deteksi wajah (FaceAPI)');
  console.log(`[FaceAPI] Waktu deteksi wajah: ${(t1Face - t0Face).toFixed(1)} ms | Wajah terdeteksi: ${detections.length}`);

  if (detections.length === 0) {
    throw new Error('NO_FACE_DETECTED');
  }

  // ── ⏱ Preprocessing ─────────────────────────────────────────
  console.time('⏱ [2] Preprocessing gambar');
  const t0Pre = performance.now();
  const inputTensor = await preprocessImage(imagePreview);
  const t1Pre = performance.now();
  console.timeEnd('⏱ [2] Preprocessing gambar');
  console.log(`[Preprocess] Waktu preprocessing: ${(t1Pre - t0Pre).toFixed(1)} ms`);

  // ── ⏱ Inferensi ONNX ────────────────────────────────────────
  console.time('⏱ [3] Inferensi ONNX (DenseNet121)');
  const t0Infer = performance.now();
  const feeds   = { "input": inputTensor };
  const results = await ortSession.run(feeds);
  const logits  = results["output"].data;
  const t1Infer = performance.now();
  console.timeEnd('⏱ [3] Inferensi ONNX (DenseNet121)');
  console.log(`[ONNX] Waktu inferensi: ${(t1Infer - t0Infer).toFixed(1)} ms`);
  console.log('[ONNX] Logits raw:', Array.from(logits));

  const probs    = softmax(Array.from(logits));
  console.log('[ONNX] Probabilitas:', probs);

  const predIdx   = probs.indexOf(Math.max(...probs));
  const predLabel = CLASS_LABELS[predIdx];

  return { predLabel, probs, t0Face, t1Face, t0Pre, t1Pre, t0Infer, t1Infer };
}

// ── Tombol Analisis ───────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  if (analyzeBtn.disabled) return;
  if (!ortSession) {
    alert('Model AI belum siap. Harap tunggu beberapa detik lagi, lalu coba kembali.');
    return;
  }

  // Sembunyikan pesan error sebelumnya
  hideAnalysisMessage();

  // Nonaktifkan tombol selama proses
  analyzeBtn.innerHTML = `
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Memproses...
  `;
  analyzeBtn.disabled = true;

  // ── ⏱ Mulai pengukuran TOTAL ──────────────────────────────────
  console.time('⏱ [Total] Analisis selesai dalam');
  const t0Total = performance.now();

  try {
    // Jalankan ANALISIS dan ANIMASI LOADING secara PARALEL
    // → keduanya mulai bersamaan; hasil ditampilkan setelah KEDUANYA selesai
    const [analysisResult] = await Promise.all([
      runAnalysis(),
      runLoadingAnimation(),   // ±3 detik animasi
    ]);

    // ── ⏱ Ringkasan waktu ─────────────────────────────────────
    const t1Total = performance.now();
    console.timeEnd('⏱ [Total] Analisis selesai dalam');
    console.log(
      `%c⏱ Ringkasan Waktu Analisis\n` +
      `  Deteksi Wajah : ${(analysisResult.t1Face  - analysisResult.t0Face ).toFixed(1)} ms\n` +
      `  Preprocessing : ${(analysisResult.t1Pre   - analysisResult.t0Pre  ).toFixed(1)} ms\n` +
      `  Inferensi ONNX: ${(analysisResult.t1Infer - analysisResult.t0Infer).toFixed(1)} ms\n` +
      `  ─────────────────────────\n` +
      `  TOTAL (+ animasi): ${(t1Total - t0Total).toFixed(1)} ms  (${((t1Total - t0Total)/1000).toFixed(2)} detik)`,
      'color: #016464; font-weight: bold;'
    );

    // Tampilkan hasil di DOM (setelah animasi selesai)
    showResult(analysisResult.predLabel, analysisResult.probs);

  } catch (err) {
    // Pastikan overlay loading disembunyikan jika terjadi error
    const overlay = document.getElementById('analysis-loading-overlay');
    if (overlay) overlay.style.display = 'none';
    console.timeEnd('⏱ [Total] Analisis selesai dalam');

    if (err.message === 'FACE_MODEL_NOT_READY') {
      showAnalysisMessage('Komponen pendeteksi wajah belum siap atau gagal dimuat. Harap periksa koneksi internet Anda atau muat ulang halaman.');
    } else if (err.message === 'NO_FACE_DETECTED') {
      showAnalysisMessage('Wajah tidak terdeteksi. Mohon unggah foto wajah yang jelas.');
    } else {
      console.error('[ONNX] Error inferensi:', err);
      alert(`Terjadi kesalahan saat menganalisis: ${err.message}`);
    }
  } finally {
    // Kembalikan tombol ke kondisi normal
    analyzeBtn.innerHTML = `<span class="material-symbols-outlined">auto_fix</span> Analisis Sekarang`;
    analyzeBtn.disabled = false;
  }
});

// Inisialisasi posisi sliding indicator saat halaman dimuat & di-resize
window.addEventListener('load', () => {
  setTimeout(updateBottomNavIndicator, 100);
});
window.addEventListener('resize', updateBottomNavIndicator);

// ═══════════════════════════════════════════════════════════════════
//  HELPER WARNING/ERROR MESSAGE DI UI
// ═══════════════════════════════════════════════════════════════════

/**
 * Tampilkan pesan peringatan/error di UI.
 * @param {string} message - Pesan yang ingin ditampilkan
 */
function showAnalysisMessage(message) {
  const container = document.getElementById('analysis-message-container');
  const textEl    = document.getElementById('analysis-message-text');
  if (container && textEl) {
    textEl.textContent = message;
    container.classList.remove('hidden');
    // Scroll agar pesan terlihat oleh user
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Sembunyikan pesan peringatan/error di UI.
 */
function hideAnalysisMessage() {
  const container = document.getElementById('analysis-message-container');
  if (container) {
    container.classList.add('hidden');
  }
}
