#!/usr/bin/env node
/**
 * serve.js — HTTP server untuk SkinSense Web App
 * Jalankan: node serve.js
 * Buka    : http://localhost:3000
 *
 * Optimasi:
 *  - File besar (.onnx, .wasm) di-stream langsung (tidak di-buffer ke RAM)
 *  - Cache-Control: 1 hari untuk aset statis (ONNX, JS, CSS, gambar)
 *  - Cache-Control: no-cache untuk HTML saja (agar perubahan langsung terlihat)
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT = __dirname;

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.js'   : 'application/javascript',
  '.css'  : 'text/css',
  '.json' : 'application/json',
  '.onnx' : 'application/octet-stream',
  '.wasm' : 'application/wasm',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
};

// Aset yang boleh di-cache browser (1 hari = 86400 detik)
const CACHEABLE_EXTS = new Set(['.onnx', '.wasm', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.json']);

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Keamanan: pastikan path tidak keluar dari ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${urlPath}`);
      return;
    }

    const ext      = path.extname(filePath).toLowerCase();
    const mime     = MIME[ext] || 'application/octet-stream';
    const cacheable = CACHEABLE_EXTS.has(ext);

    // Header respons
    const headers = {
      'Content-Type'   : mime,
      'Content-Length' : stat.size,
      'Cache-Control'  : cacheable ? 'public, max-age=86400' : 'no-cache',
      // CORS headers yang dibutuhkan onnxruntime-web WASM SharedArrayBuffer
      'Cross-Origin-Opener-Policy'   : 'same-origin',
      'Cross-Origin-Embedder-Policy' : 'credentialless',
    };

    res.writeHead(200, headers);

    // Stream file langsung ke response (efisien untuk file besar seperti .onnx)
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => res.end());

    const sizeKB = (stat.size / 1024).toFixed(0);
    console.log(`[${new Date().toISOString()}] ${req.method} ${urlPath} → 200 (${sizeKB} KB${cacheable ? ', cached' : ''})`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // Tampilkan semua IP agar mudah dibuka dari HP
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const localIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) localIPs.push(net.address);
    }
  }

  console.log(`\n✅ SkinSense berjalan:`);
  console.log(`   Lokal  : http://localhost:${PORT}`);
  localIPs.forEach(ip => console.log(`   Jaringan: http://${ip}:${PORT}  ← buka dari HP`));
  console.log(`\n   Tekan Ctrl+C untuk berhenti.\n`);
});
