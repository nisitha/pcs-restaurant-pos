/**
 * Client-side image compressor converting images to WebP format,
 * resizing to max 600x600 px, and ensuring file size is strictly < 100 KB.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  maxSizeInBytes = 100 * 1024 // 100 KB
): Promise<{ file: File; dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Quality reduction loop until size is strictly under 100KB
        let quality = 0.85;
        let blob: Blob | null = null;

        const attemptCompression = async (q: number): Promise<Blob> => {
          return new Promise((resBlob) => {
            canvas.toBlob(
              (b) => resBlob(b || new Blob()),
              'image/webp',
              q
            );
          });
        };

        try {
          blob = await attemptCompression(quality);

          while (blob.size > maxSizeInBytes && quality > 0.2) {
            quality -= 0.15;
            blob = await attemptCompression(quality);
          }

          const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
          const compressedFile = new File([blob], fileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          const dataUrl = canvas.toDataURL('image/webp', quality);
          const sizeKb = Number((blob.size / 1024).toFixed(1));

          resolve({
            file: compressedFile,
            dataUrl,
            sizeKb,
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
