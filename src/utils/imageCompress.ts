export interface CompressedImageResult {
  base64DataUrl: string;
  sizeKb: number;
  width: number;
  height: number;
}

/**
 * Compresses an image File in browser via HTML5 Canvas:
 * max width 800px, JPEG quality 0.7 (~80-120 KB).
 */
export function compressImageFile(
  file: File,
  maxWidth = 800,
  quality = 0.7
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid.'));
      img.onload = () => {
        let targetW = img.width;
        let targetH = img.height;
        if (targetW > maxWidth) {
          targetH = Math.round((targetH * maxWidth) / targetW);
          targetW = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak didukung di browser ini.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const base64DataUrl = canvas.toDataURL('image/jpeg', quality);
        const approxBytes = Math.round((base64DataUrl.length * 3) / 4);
        resolve({
          base64DataUrl,
          sizeKb: Math.max(1, Math.round(approxBytes / 1024)),
          width: targetW,
          height: targetH,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
