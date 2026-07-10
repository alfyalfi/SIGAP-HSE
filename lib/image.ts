export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Gagal membaca file gambar."));
      image.src = objectUrl;
    });

    return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function assertImageWithinLimit(
  file: File,
  maxDimension = 7680
): Promise<{ width: number; height: number }> {
  const dimensions = await getImageDimensions(file);
  if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
    throw new Error(`Ukuran gambar maksimal ${maxDimension} × ${maxDimension} piksel.`);
  }
  return dimensions;
}
