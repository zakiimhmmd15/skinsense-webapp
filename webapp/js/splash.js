/**
 * splash.js
 * ─────────────────────────────────────────────────────────────────
 * TUJUAN  : Mengontrol siklus hidup (lifecycle) splash screen:
 *           1. Menunggu durasi minimum (2.5 detik)
 *           2. Memicu transisi fade-out CSS
 *           3. Menghapus elemen dari DOM setelah transisi selesai
 *
 * ARSITEKTUR:
 *   - File ini HARUS dimuat SEBELUM script lain (inference.js, dsb.)
 *     agar splash langsung muncul saat halaman di-load.
 *   - Splash screen dihapus SETELAH event `transitionend` selesai,
 *     bukan dengan setTimeout hardcoded, sehingga timing presisi
 *     meskipun ada variasi performa device.
 *
 * KETERGANTUNGAN:
 *   - Elemen HTML #splash-screen harus ada di DOM
 *   - File css/splash.css harus sudah dimuat
 *   - Kelas CSS .splash-hidden harus didefinisikan di splash.css
 *
 * KONFIGURASI:
 *   Ubah SPLASH_DURATION_MS untuk menyesuaikan durasi tampil.
 *   Nilai default: 2500ms (2.5 detik) — cukup untuk animasi loading
 *   bar selesai (2200ms animasi + 300ms buffer).
 * ─────────────────────────────────────────────────────────────────
 */

(function () {
  // Cek apakah splash screen harus dilewati pada sesi ini
  if (sessionStorage.getItem('splashShown') === 'true') {
    var splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.display = 'none';
      if (splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }
    console.log('[Splash] Melewati splash screen (sesi aktif).');
    return;
  }

  // Jika tidak dilewati, tandai bahwa splash telah ditampilkan untuk sesi ini
  sessionStorage.setItem('splashShown', 'true');

  // ══════════════════════════════════════════════════════════════
  //  KONFIGURASI — Ubah nilai ini untuk menyesuaikan perilaku
  // ══════════════════════════════════════════════════════════════

  /**
   * Durasi minimum splash screen ditampilkan (dalam milidetik).
   *
   * Mengapa 2500ms?
   *   - Animasi loading bar di CSS berlangsung 2200ms + delay 800ms awal
   *     = selesai di ~3000ms, tapi kita memulai fade-out di 2500ms
   *     sehingga bar hampir penuh saat mulai menghilang (efek natural).
   *   - Cukup lama untuk branding exposure, cukup singkat agar
   *     pengguna tidak merasa menunggu.
   *
   * CATATAN untuk Junior Dev:
   *   Jika ingin splash lebih cepat, turunkan ke 2000.
   *   Jika ingin menunggu model ONNX selesai dimuat, ganti logika
   *   di bagian bawah file ini (lihat komentar "OPSI LANJUTAN").
   */
  var SPLASH_DURATION_MS = 2500;

  // ══════════════════════════════════════════════════════════════
  //  FUNGSI UTAMA
  // ══════════════════════════════════════════════════════════════

  /**
   * dismissSplash()
   * Memicu proses penghilangan splash screen:
   *   1. Tambahkan kelas .splash-hidden → CSS melakukan fade-out
   *   2. Dengarkan event transitionend pada opacity
   *   3. Setelah transisi selesai, set display:none & hapus dari DOM
   *
   * Mengapa display:none DAN removeChild?
   *   - display:none menghentikan rendering browser (performa)
   *   - removeChild menghapus node dari DOM tree sepenuhnya
   *     sehingga tidak ada "sisa" di inspector / accessibility tree.
   */
  function dismissSplash() {
    // Ambil referensi ke elemen splash screen
    var splash = document.getElementById('splash-screen');

    // Guard clause: jika elemen tidak ditemukan (sudah dihapus,
    // atau typo di ID), hentikan eksekusi agar tidak error.
    if (!splash) return;

    // Langkah 1: Tambahkan kelas CSS yang memicu transition fade-out.
    // Lihat splash.css → #splash-screen.splash-hidden { opacity: 0; }
    splash.classList.add('splash-hidden');

    // Langkah 2: Tunggu transisi CSS selesai sebelum menghapus elemen.
    // Event 'transitionend' difire oleh browser saat transition selesai.
    // { once: true } memastikan listener hanya dipanggil SEKALI lalu
    // otomatis dihapus (mencegah memory leak).
    splash.addEventListener('transitionend', function onTransitionDone(e) {
      // Filter: hanya respon ke transisi pada properti 'opacity'.
      // Elemen mungkin juga mentransisi 'visibility', dan kita tidak
      // ingin handler ini dipanggil dua kali.
      if (e.propertyName !== 'opacity') return;

      // Langkah 3a: Sembunyikan dari layout (belt-and-suspenders safety)
      splash.style.display = 'none';

      // Langkah 3b: Hapus elemen sepenuhnya dari DOM tree.
      // parentNode.removeChild() kompatibel dengan semua browser.
      // Alternatif modern: splash.remove() — tapi kita gunakan cara
      // yang lebih safe untuk kompatibilitas.
      if (splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }

      // Log untuk debugging — bisa dihapus di production
      console.log('[Splash] Splash screen dihapus dari DOM.');
    }, { once: true });

    // FALLBACK SAFETY: Jika karena suatu alasan event transitionend
    // tidak pernah difire (misalnya browser lama, atau CSS transition
    // di-override), kita tetap hapus splash setelah 1 detik.
    // Ini adalah "safety net" — dalam kondisi normal, handler di atas
    // yang akan berjalan lebih dulu.
    setTimeout(function () {
      if (splash && splash.parentNode) {
        splash.style.display = 'none';
        splash.parentNode.removeChild(splash);
        console.log('[Splash] Fallback: splash dihapus via timeout.');
      }
    }, 1000); // 1000ms = lebih lama dari durasi transition CSS (600ms)
  }

  // ══════════════════════════════════════════════════════════════
  //  INISIALISASI — Jalankan saat DOM sudah siap
  // ══════════════════════════════════════════════════════════════

  /**
   * Menggunakan DOMContentLoaded untuk memastikan elemen #splash-screen
   * sudah ada di DOM sebelum kita mencoba mengaksesnya.
   *
   * Timeline yang terjadi:
   *   0ms     → HTML mulai di-parse, #splash-screen langsung dirender
   *   ~100ms  → DOMContentLoaded fires, timer dimulai
   *   2500ms  → Timer selesai, dismissSplash() dipanggil
   *   2500ms  → Kelas .splash-hidden ditambahkan → fade-out 600ms mulai
   *   3100ms  → Fade-out selesai → elemen dihapus dari DOM
   *
   * Total waktu splash terlihat: ~3.1 detik (2.5s tampil + 0.6s fade)
   */
  if (document.readyState === 'loading') {
    // DOM belum selesai di-parse → tunggu event
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(dismissSplash, SPLASH_DURATION_MS);
    });
  } else {
    // DOM sudah siap (script dimuat dengan defer, atau dijalankan late)
    setTimeout(dismissSplash, SPLASH_DURATION_MS);
  }

  // ══════════════════════════════════════════════════════════════
  //  OPSI LANJUTAN (untuk Junior Dev)
  // ══════════════════════════════════════════════════════════════
  //
  //  Jika ingin splash menunggu model ONNX selesai dimuat (bukan
  //  timer tetap), ganti blok inisialisasi di atas dengan:
  //
  //    window.addEventListener('model-ready', function () {
  //      dismissSplash();
  //    });
  //
  //  Lalu di inference.js, tambahkan di akhir loadModel() saat berhasil:
  //
  //    window.dispatchEvent(new Event('model-ready'));
  //
  //  Dengan cara ini, splash otomatis hilang begitu model siap,
  //  berapa pun lama waktu yang dibutuhkan.
  //
  // ══════════════════════════════════════════════════════════════

})();
