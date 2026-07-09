/**
 * preprocess.js
 * ─────────────────────────────────────────────────────────────────
 * Mengubah elemen <img> menjadi Float32Array NCHW [1, 3, 224, 224]
 * yang siap diumpankan ke model DenseNet121 via onnxruntime-web.
 *
 * Pipeline (identik dengan torchvision di training):
 *   1. Resize sisi TERPENDEK ke 256, jaga aspek rasio
 *      (torchvision.transforms.Resize(256))
 *   2. Center crop 224×224 dari tengah
 *      (torchvision.transforms.CenterCrop(224))
 *   3. Normalisasi per channel: (pixel/255 - mean) / std
 *      mean = [0.485, 0.456, 0.406]  (ImageNet RGB)
 *      std  = [0.229, 0.224, 0.225]  (ImageNet RGB)
 *   4. Susun NCHW: semua R → semua G → semua B
 *      (bukan RGBRGB per-pixel)
 *
 * Dependensi global (dari inference.js):
 *   RESIZE_SIZE, IMG_SIZE, MEAN, STD
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * @param {HTMLImageElement} imgEl - Gambar yang sudah termuat di DOM
 * @returns {Promise<ort.Tensor>} Float32 tensor [1, 3, IMG_SIZE, IMG_SIZE]
 */
async function preprocessImage(imgEl) {
  const canvas = document.getElementById('processing-canvas');
  const ctx    = canvas.getContext('2d');

  // ── Step 1: Resize SISI TERPENDEK ke RESIZE_SIZE (256), jaga aspek rasio ──
  // Sesuai torchvision.transforms.Resize(256): bukan stretch ke kotak 256×256.
  // Gunakan naturalWidth/naturalHeight (ukuran piksel asli, bukan ukuran tampilan).
  const scale   = RESIZE_SIZE / Math.min(imgEl.naturalWidth, imgEl.naturalHeight);
  const scaledW = Math.round(imgEl.naturalWidth  * scale);
  const scaledH = Math.round(imgEl.naturalHeight * scale);
  canvas.width  = scaledW;
  canvas.height = scaledH;
  ctx.drawImage(imgEl, 0, 0, scaledW, scaledH);

  // ── Step 2: Center crop IMG_SIZE×IMG_SIZE (224×224) dari tengah ──
  // cropX & cropY bisa berbeda karena gambar tidak kotak.
  const cropX     = Math.floor((scaledW - IMG_SIZE) / 2);
  const cropY     = Math.floor((scaledH - IMG_SIZE) / 2);
  const imageData = ctx.getImageData(cropX, cropY, IMG_SIZE, IMG_SIZE);
  const pixels    = imageData.data;  // Uint8ClampedArray RGBA, panjang 224*224*4

  // ── Step 3 & 4: Normalisasi + Susun NCHW ──
  const nPixels = IMG_SIZE * IMG_SIZE;
  const tensor  = new Float32Array(3 * nPixels);  // [C, H, W] flattened

  // Offset awal setiap channel dalam array output (channel-first / NCHW)
  const rOffset = 0;
  const gOffset = nPixels;
  const bOffset = 2 * nPixels;

  for (let i = 0; i < nPixels; i++) {
    const r = pixels[i * 4 + 0];  // Red   (0–255)
    const g = pixels[i * 4 + 1];  // Green (0–255)
    const b = pixels[i * 4 + 2];  // Blue  (0–255)
    // (pixel/255 - mean) / std  per channel
    tensor[rOffset + i] = (r / 255.0 - MEAN[0]) / STD[0];
    tensor[gOffset + i] = (g / 255.0 - MEAN[1]) / STD[1];
    tensor[bOffset + i] = (b / 255.0 - MEAN[2]) / STD[2];
  }

  // Bungkus sebagai onnxruntime Tensor shape [1, 3, 224, 224]
  return new ort.Tensor('float32', tensor, [1, 3, IMG_SIZE, IMG_SIZE]);
}
