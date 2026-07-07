// Membutuhkan: CDN script @supabase/supabase-js dan js/config.js sudah dimuat sebelum file ini.
// Menyediakan window.App.supabase sebagai client siap pakai di seluruh app.

window.App = window.App || {};

(function () {
  if (!window.SUPABASE_CONFIG) {
    console.error("SUPABASE_CONFIG belum ada — salin js/config.example.js jadi js/config.js dan isi kredensial asli.");
    return;
  }
  if (
    !window.SUPABASE_CONFIG.url ||
    !window.SUPABASE_CONFIG.anonKey ||
    window.SUPABASE_CONFIG.url.includes("xxxxxxxx") ||
    window.SUPABASE_CONFIG.anonKey.includes("your-anon-key-here")
  ) {
    console.warn("SUPABASE_CONFIG masih placeholder. Login dan query baru akan berfungsi setelah config diisi nilai asli.");
    return;
  }
  const { createClient } = supabase; // global `supabase` datang dari CDN script
  window.App.supabase = createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
})();
