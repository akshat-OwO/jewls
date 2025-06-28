/**
 * Combines two images side by side using HTML5 Canvas
 * Left image (jewelry) on the left, right image (model) on the right
 */
export async function combineImagesHorizontally(
  leftImageBlob: Blob,
  rightImageBlob: Blob,
  targetWidth: number = 1024,
  targetHeight: number = 512
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const leftImg = new Image();
    const rightImg = new Image();

    let loadedImages = 0;

    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === 2) {
        try {
          // Calculate dimensions for each half
          const halfWidth = targetWidth / 2;
          
          // Fill background with white
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Draw left image (jewelry) on the left half
          ctx.drawImage(leftImg, 0, 0, halfWidth, targetHeight);
          
          // Draw right image (model) on the right half
          ctx.drawImage(rightImg, halfWidth, 0, halfWidth, targetHeight);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/jpeg', 0.9);
        } catch (error) {
          reject(error);
        }
      }
    };

    const onImageError = () => {
      reject(new Error('Failed to load image'));
    };

    leftImg.onload = onImageLoad;
    leftImg.onerror = onImageError;
    rightImg.onload = onImageLoad;
    rightImg.onerror = onImageError;

    leftImg.src = URL.createObjectURL(leftImageBlob);
    rightImg.src = URL.createObjectURL(rightImageBlob);
  });
}

/**
 * Combines jewelry and model files into a single side-by-side image
 * This should be called on the client side before uploading
 */
export async function combineJewelryAndModelImages(
  jewelryFile: File,
  modelFile: File
): Promise<File> {
  const combinedBlob = await combineImagesHorizontally(jewelryFile, modelFile);
  
  // Create a new File from the blob
  return new File([combinedBlob], 'combined-jewelry-model.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}

/**
 * Creates a data URL from a File or Blob for preview purposes
 */
export function createImagePreview(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validates that a file is a valid image
 */
export function validateImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Resizes an image file to specified dimensions while maintaining aspect ratio
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.9
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export async function downloadImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return response.blob();
}