/**
 * inference.js
 * ─────────────────────────────────────────────────────────────────
 * Konfigurasi model, load ONNX, inferensi, softmax, dan tampil hasil.
 *
 * Konstanta yang dipakai di sini juga dibutuhkan oleh preprocess.js,
 * sehingga file ini HARUS dimuat SEBELUM preprocess.js.
 *
 * Model: DenseNet121 (single)
 *   Input  : Float32Array NCHW [1, 3, 224, 224]
 *   Output : 4 logits (sebelum softmax)
 *   Kelas  : 0=Kombinasi, 1=Kering, 2=Normal, 3=Berminyak
 * ─────────────────────────────────────────────────────────────────
 */

// ── Konfigurasi model ─────────────────────────────────────────────
const MODEL_PATH  = 'densenet121_skin.onnx';
const IMG_SIZE    = 224;    // ukuran crop final (px)
const RESIZE_SIZE = 256;    // resize sisi terpendek ke nilai ini sebelum crop

// Normalisasi ImageNet (urutan RGB)
const MEAN = [0.485, 0.456, 0.406];
const STD  = [0.229, 0.224, 0.225];

// Pemetaan indeks → label & deskripsi
const CLASS_LABELS = ['Kombinasi', 'Kering', 'Normal', 'Berminyak'];
const CLASS_DESCS  = {
  'Kombinasi': 'Kulit Anda memiliki area berminyak di zona T (dahi, hidung, dagu) dan area kering atau normal di pipi. Gunakan produk yang berbeda untuk masing-masing zona.',
  'Kering'   : 'Kulit Anda kekurangan minyak alami sehingga terasa kencang dan kadang mengelupas. Prioritaskan pelembap kaya kandungan ceramide atau hyaluronic acid.',
  'Normal'   : 'Selamat! Kulit Anda berada dalam kondisi ideal — keseimbangan minyak dan air yang sempurna. Pertahankan dengan perawatan dasar dan tabir surya harian.',
  'Berminyak': 'Kulit Anda memproduksi sebum berlebih sehingga terlihat mengkilap. Pilih produk "oil-free" dan jangan lewatkan pelembap berbasis air (gel) untuk menjaga hidrasi.',
};

// ── State model ───────────────────────────────────────────────────
let ortSession = null;  // ort.InferenceSession, diisi setelah loadModel()

// Arahkan WASM runtime ke CDN (sama dengan versi ort.min.js yang dimuat)
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/';

// ── Load model ────────────────────────────────────────────────────
/**
 * Muat model ONNX secara async. Dipanggil otomatis saat halaman dibuka.
 * Memperbarui indikator status model di DOM.
 */
async function loadModel() {
  updateModelStatus('loading', 'Memuat model AI (±3 detik pertama kali)...');
  try {
    ortSession = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    updateModelStatus('ready', 'Model siap · DenseNet121 · 28 MB · Berjalan di browser');
    console.log('[ONNX] Model berhasil dimuat. Input names:', ortSession.inputNames);
  } catch (err) {
    updateModelStatus('error', `Gagal memuat model: ${err.message}`);
    console.error('[ONNX] Gagal memuat model:', err);
  }
}

/**
 * Perbarui tampilan indikator status model di DOM.
 * @param {'loading'|'ready'|'error'} state
 * @param {string} msg  - Teks yang ditampilkan
 */
function updateModelStatus(state, msg) {
  const icon = document.getElementById('model-status-icon');
  const text = document.getElementById('model-status-text');
  text.textContent = msg;
  if (state === 'loading') {
    icon.textContent = 'progress_activity';
    icon.classList.add('animate-spin');
    icon.style.color = '#016464';
    icon.style.fontVariationSettings = "'FILL' 0";
  } else if (state === 'ready') {
    icon.textContent = 'check_circle';
    icon.classList.remove('animate-spin');
    icon.style.color = '#016464';
    icon.style.fontVariationSettings = "'FILL' 1";
  } else if (state === 'error') {
    icon.textContent = 'error';
    icon.classList.remove('animate-spin');
    icon.style.color = '#ba1a1a';
    icon.style.fontVariationSettings = "'FILL' 1";
  }
}

// ── Softmax ───────────────────────────────────────────────────────
/**
 * Konversi array logit → probabilitas.
 * Numerically stable: kurangi max sebelum exp().
 * @param {number[]} logits
 * @returns {number[]} probabilitas (jumlah = 1)
 */
function softmax(logits) {
  const maxL = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - maxL));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}

// ── Tampilkan hasil inferensi ─────────────────────────────────────
/**
 * Isi section hasil (#result-section) dengan prediksi kelas dan bar probabilitas.
 * @param {string}   predLabel - Label kelas terprediksi ('Kombinasi' dll.)
 * @param {number[]} probs     - Array 4 probabilitas [0..1]
 */
function showResult(predLabel, probs) {
  const resultSection = document.getElementById('result-section');

  document.getElementById('result-title').textContent       = `Kulit ${predLabel}`;
  document.getElementById('result-description').textContent = CLASS_DESCS[predLabel] || '';

  // Bangun probability bars
  const container = document.getElementById('prob-bars');
  container.innerHTML = '';

  CLASS_LABELS.forEach((label, idx) => {
    const pct      = (probs[idx] * 100).toFixed(1);
    const isTop    = (label === predLabel);
    const barColor = isTop
      ? 'bg-gradient-to-r from-primary to-[#88d3d3]'
      : 'bg-outline-variant';

    const row = document.createElement('div');
    row.className = 'space-y-1';
    row.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-body-sm text-body-sm ${isTop ? 'text-primary font-semibold' : 'text-on-surface-variant'} flex items-center gap-1">
          ${isTop ? '<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 1;">star</span>' : ''}
          ${label}
        </span>
        <span class="font-label-md text-label-md ${isTop ? 'text-primary' : 'text-on-surface-variant'}">${pct}%</span>
      </div>
      <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
        <div class="${barColor} h-full rounded-full transition-all duration-700" style="width:0%" data-target="${pct}"></div>
      </div>
    `;
    container.appendChild(row);
  });

  // Tampilkan kartu hasil
  resultSection.classList.remove('hidden');
  resultSection.classList.add('result-appear');

  // Animasi bar lebar (perlu satu frame delay agar CSS transition aktif)
  requestAnimationFrame(() => {
    setTimeout(() => {
      container.querySelectorAll('[data-target]').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    }, 80);
  });

  // Scroll ke hasil
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Model Deteksi Wajah State & Loader ────────────────────────────
let isFaceModelLoaded = false;

/**
 * Muat model TinyFaceDetector secara asinkron dari CDN.
 * Menyediakan fallback jika library atau koneksi terganggu.
 */
async function loadFaceModel() {
  if (typeof faceapi === 'undefined') {
    console.warn('[FaceAPI] Library face-api.js tidak termuat (offline atau CDN terblokir). Deteksi wajah dinonaktifkan.');
    return;
  }
  try {
    // Mengunduh model TinyFaceDetector dari CDN resmi vladmandic/face-api
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/');
    isFaceModelLoaded = true;
    console.log('[FaceAPI] Model TinyFaceDetector berhasil dimuat.');
  } catch (err) {
    console.error('[FaceAPI] Gagal memuat model deteksi wajah:', err);
  }
}

// ── Mulai muat model saat skrip ini dieksekusi ────────────────────
loadModel();
loadFaceModel();
