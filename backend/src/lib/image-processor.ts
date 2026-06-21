// backend/src/lib/image-processor.ts
/**
 * Sharp-backed image processing. Reads from a temp path written by Multer,
 * produces thumbnail/medium/original under UPLOAD_ROOT, returns relative paths
 * suitable for storing in Prisma (and serving via Nginx /uploads/).
 *
 * Note: original is re-encoded as JPEG to strip EXIF (which can contain PII
 * like GPS) and to cap file size sanely. If you need to preserve the truly
 * original bytes, change the original branch to use .toFile() with a copy.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { IMAGE_SIZES } from '../config/constants';
import { env } from '../config/env';

export interface ProcessedImage {
  originalPath: string;   // relative: e.g. "artworks/abc123/original.jpg"
  mediumPath: string;
  thumbnailPath: string;
  width: number;          // of original
  height: number;
}

/**
 * @param tempPath absolute path Multer wrote the upload to
 * @param subdir   folder under UPLOAD_ROOT (e.g. "artworks/<id>")
 */
export async function processArtworkImage(
  tempPath: string,
  subdir: string,
): Promise<ProcessedImage> {
  const absDir = path.join(env.UPLOAD_ROOT, subdir);
  await fs.mkdir(absDir, { recursive: true });

  // Single pipeline read — extract metadata once.
  const source = sharp(tempPath).rotate(); // auto-orient from EXIF
  const meta = await source.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Could not read image dimensions');
  }

  const baseNames = {
    original: 'original.jpg',
    medium: 'medium.jpg',
    thumbnail: 'thumbnail.jpg',
  };

  await Promise.all([
    source
      .clone()
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(path.join(absDir, baseNames.original)),
    source
      .clone()
      .resize({ width: IMAGE_SIZES.medium, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(absDir, baseNames.medium)),
    source
      .clone()
      .resize({ width: IMAGE_SIZES.thumbnail, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(absDir, baseNames.thumbnail)),
  ]);

  // Clean up the Multer temp file
  await fs.unlink(tempPath).catch(() => undefined);

  return {
    originalPath: path.posix.join(subdir, baseNames.original),
    mediumPath: path.posix.join(subdir, baseNames.medium),
    thumbnailPath: path.posix.join(subdir, baseNames.thumbnail),
    width: meta.width,
    height: meta.height,
  };
}

/** Delete all three sizes — call when an artwork image is removed. */
export async function deleteArtworkImage(
  paths: Pick<ProcessedImage, 'originalPath' | 'mediumPath' | 'thumbnailPath'>,
): Promise<void> {
  await Promise.all(
    [paths.originalPath, paths.mediumPath, paths.thumbnailPath].map((rel) =>
      fs.unlink(path.join(env.UPLOAD_ROOT, rel)).catch(() => undefined),
    ),
  );
}
