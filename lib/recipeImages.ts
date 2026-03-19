import { getFoodImageUrl } from './foodImage';

// ─── Source image validation ───────────────────────────────────────────────────
//
// Returns false (needs fallback) when the URL is:
//   - null / undefined / empty string
//   - contains "placeholder", "default", "no-image", "no_image"
//   - any unsplash.com URL (free CDN is unreliable — returns wrong/random images)
//   - a bare source.unsplash.com URL
//   - an expired AWS pre-signed URL
//   - one of our own old generic photo IDs

function isValidSourceImage(url: string | undefined | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (/placeholder|default|no[-_]image/i.test(u)) return false;
  // Reject ALL unsplash URLs — their free CDN now serves random non-food images
  if (/unsplash\.com/i.test(u)) return false;
  // Reject expired AWS pre-signed URLs
  if (/X-Amz-Signature/i.test(u)) return false;
  if (/edamam-product-images\.s3\.amazonaws\.com/i.test(u)) return false;
  // Reject picsum (random photos)
  if (/picsum\.photos/i.test(u)) return false;
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// If imageUrl is a genuine source URL (TheMealDB, Spoonacular, etc.) → return
// it unchanged. Otherwise fall back to a guaranteed food image via getFoodImageUrl.
//
// `ingredients` is passed through for better keyword matching in getFoodImageUrl.

export function getRecipeImage(
  title: string,
  imageUrl?: string | null,
  _recipeIndex = 0,
  ingredients?: string[],
): string {
  // Trust any valid http URL directly — don't override stored images
  if (imageUrl && imageUrl.trim() !== '' && imageUrl.startsWith('http')) return imageUrl;
  if (isValidSourceImage(imageUrl)) return imageUrl!;
  return getFoodImageUrl(title, ingredients);
}

export function getRecipeImageLarge(
  title: string,
  imageUrl?: string | null,
  _recipeIndex = 0,
  ingredients?: string[],
): string {
  // Trust any valid http URL directly — don't override stored images
  if (imageUrl && imageUrl.trim() !== '' && imageUrl.startsWith('http')) return imageUrl;
  if (isValidSourceImage(imageUrl)) return imageUrl!;
  return getFoodImageUrl(title, ingredients);
}
