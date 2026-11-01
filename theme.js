/* theme.js — satu tema untuk SEMUA halaman (UM, PJ, CEK, AR). Muat paling awal di <head> agar tidak berkedip.
 * - Bawaan: TERANG. Pilihan terakhir disimpan di 'laporan_theme' dan dipakai semua halaman.
 * - Kunci tema lama tiap halaman ikut disamakan, jadi tombol tema bawaan masing-masing halaman tetap berfungsi. */
(function () {
  var K = 'laporan_theme', LEGACY = ['um_theme', 'theme', 'arMinyakTheme', 'rekap-theme'], root = document.documentElement;
  var ok = function (t) { return t === 'light' || t === 'dark'; };
  var t = 'light';
  try { var s = localStorage.getItem(K); if (ok(s)) t = s; } catch (e) {}
  function mirror(v) { try { localStorage.setItem(K, v); LEGACY.forEach(function (k) { localStorage.setItem(k, v); }); } catch (e) {} }
  mirror(t);
  root.setAttribute('data-theme', t);
  /* Setiap kali halaman mengganti tema (tombol 🌙/☀️), simpan untuk semua halaman */
  new MutationObserver(function () { var v = root.getAttribute('data-theme'); if (ok(v)) mirror(v); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  /* Tab lain yang sedang terbuka ikut berubah */
  window.addEventListener('storage', function (e) {
    if (e.key === K && ok(e.newValue) && root.getAttribute('data-theme') !== e.newValue) root.setAttribute('data-theme', e.newValue);
  });
})();
