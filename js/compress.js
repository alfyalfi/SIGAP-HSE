// Kompresi foto sebelum upload — TANPA dependency npm, pakai <canvas> native.
// Resize max 1600px di sisi terpanjang, convert ke WebP quality 0.75.

window.App = window.App || {};
window.App.compress = {

  /**
   * @param {File} file - file asli dari <input type="file">
   * @returns {Promise<Blob>} blob WebP terkompresi
   */
  async compressImage(file) {
    const MAX_DIM = 1600;
    const QUALITY = 0.75;

    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gagal membaca gambar"));
      };
      image.src = objectUrl;
    });

    let { width, height } = img;
    if (width > height && width > MAX_DIM) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    } else if (height > MAX_DIM) {
      width = Math.round((width * MAX_DIM) / height);
      height = MAX_DIM;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Kompresi gagal'))),
        'image/webp',
        QUALITY
      );
    });
  },
};
