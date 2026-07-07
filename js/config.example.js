// Salin file ini jadi "config.js" di folder yang sama, lalu isi dengan nilai asli
// dari Supabase Project Settings > API. JANGAN commit config.js ke git.
//
// Produksi tanpa commit secret:
// 1. Upload repo ini TANPA file js/config.js.
// 2. Setelah deploy, tambahkan file js/config.js langsung di server/static asset,
//    atau buat file itu saat proses publish internal Anda.
// 3. Formatnya harus persis seperti window.SUPABASE_CONFIG di bawah.

window.SUPABASE_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "your-anon-key-here"
};
