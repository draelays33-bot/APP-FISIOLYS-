// Utility to safely resolve image paths in Vite development and production builds

const imageGlob = import.meta.glob<string>('../assets/images/*', {
  eager: true,
  import: 'default'
});

const imageMap: Record<string, string> = {};

for (const path in imageGlob) {
  const resolvedUrl = imageGlob[path];
  const filename = path.split('/').pop();
  if (filename) {
    imageMap[filename] = resolvedUrl;
    imageMap[`/src/assets/images/${filename}`] = resolvedUrl;
    imageMap[`src/assets/images/${filename}`] = resolvedUrl;
    imageMap[`../../assets/images/${filename}`] = resolvedUrl;
    imageMap[`../assets/images/${filename}`] = resolvedUrl;
  }
}

/**
 * Resolves any image path or filename to a valid Vite bundled URL
 */
export function getImageUrl(path: string | undefined | null): string {
  if (!path) return '';

  // If already a data URL, blob URL, or external HTTP(S) URL
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Check direct lookup in mapping
  if (imageMap[path]) {
    return imageMap[path];
  }

  // Extract filename and check lookup
  const filename = path.split('/').pop()?.split('?')[0];
  if (filename && imageMap[filename]) {
    return imageMap[filename];
  }

  return path;
}

export default getImageUrl;
