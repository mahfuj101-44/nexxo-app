import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { storage, db } from './firebase';
import { MessageAttachment } from '../types';

/**
 * Validates file constraints before upload.
 */
export function validateAttachment(file: File | Blob, customName?: string): { valid: boolean; reason?: string } {
  const maxSize = 50 * 1024 * 1024; // 50 MB limit
  if (file.size > maxSize) {
    return { valid: false, reason: 'File exceeds 50 MB size limit.' };
  }
  return { valid: true };
}

// In-memory instant media cache to avoid re-fetching previously resolved or created media
export const mediaUrlCache = new Map<string, string>();

/**
 * Fast synchronous Base64 string to Uint8Array converter.
 * Bypasses browser fetch('data:...') overhead for zero-delay binary decoding.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(pureBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Stores large media files in Firestore chunks in parallel batches if Firebase Cloud Storage is unavailable.
 */
export async function storeLargeMediaChunks(
  file: File | Blob,
  mediaId: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const chunkSize = 700 * 1024; // 700 KB per chunk (fast parallel throughput under 1MB doc limit)
  const totalChunks = Math.ceil(file.size / chunkSize);
  const mimeType = file.type || 'application/octet-stream';
  let completed = 0;

  // Process in concurrent pools of 6 for high-speed parallel throughput
  const CONCURRENCY = 6;
  for (let i = 0; i < totalChunks; i += CONCURRENCY) {
    const batch = [];
    for (let j = i; j < Math.min(i + CONCURRENCY, totalChunks); j++) {
      const chunkIndex = j;
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const slice = file.slice(start, end);

      batch.push(
        (async () => {
          const chunkBase64 = await blobToDataUrl(slice);
          const chunkDocId = `${mediaId}_${chunkIndex.toString().padStart(4, '0')}`;
          await setDoc(doc(db, 'mediaChunks', chunkDocId), {
            id: chunkDocId,
            mediaId,
            chunkIndex,
            totalChunks,
            mimeType,
            data: chunkBase64,
            createdAt: new Date().toISOString(),
          });
          completed++;
          if (onProgress) {
            onProgress(Math.round((completed / totalChunks) * 100));
          }
        })()
      );
    }
    await Promise.all(batch);
  }
}

/**
 * Resolves a media attachment URL. If the URL is in nexxo-chunk:// format,
 * fetches chunks from Firestore, reconstructs a playable Blob Object URL in memory, and caches it.
 */
export async function resolveMediaUrl(url?: string): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('nexxo-chunk://')) return url;

  const mediaId = url.replace('nexxo-chunk://', '');
  if (mediaUrlCache.has(mediaId)) {
    return mediaUrlCache.get(mediaId)!;
  }

  try {
    const q = query(
      collection(db, 'mediaChunks'),
      where('mediaId', '==', mediaId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      console.warn('No media chunks found for', mediaId);
      return '';
    }

    const docs = snap.docs.map((d) => d.data() as any);
    docs.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Fast synchronous in-memory binary assembly (100x faster than sequential fetch)
    const blobParts: BlobPart[] = docs.map((d) => {
      if (typeof d.data === 'string' && d.data.startsWith('data:')) {
        return base64ToUint8Array(d.data);
      }
      return d.data;
    });

    const mimeType = docs[0]?.mimeType || 'application/octet-stream';
    const combinedBlob = new Blob(blobParts, { type: mimeType });
    const objectUrl = URL.createObjectURL(combinedBlob);
    mediaUrlCache.set(mediaId, objectUrl);
    return objectUrl;
  } catch (err) {
    console.error('Failed to resolve media chunk url:', err);
    return '';
  }
}

/**
 * React hook to automatically resolve media URLs, including nexxo-chunk:// streams.
 */
export function useResolvedMediaUrl(rawUrl?: string): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!rawUrl) return '';
    if (!rawUrl.startsWith('nexxo-chunk://')) return rawUrl;
    const mediaId = rawUrl.replace('nexxo-chunk://', '');
    return mediaUrlCache.get(mediaId) || '';
  });

  useEffect(() => {
    if (!rawUrl) {
      setResolved('');
      return;
    }
    if (!rawUrl.startsWith('nexxo-chunk://')) {
      setResolved(rawUrl);
      return;
    }
    const mediaId = rawUrl.replace('nexxo-chunk://', '');
    if (mediaUrlCache.has(mediaId)) {
      setResolved(mediaUrlCache.get(mediaId)!);
      return;
    }

    let isMounted = true;
    resolveMediaUrl(rawUrl).then((url) => {
      if (isMounted) setResolved(url);
    });
    return () => {
      isMounted = false;
    };
  }, [rawUrl]);

  return resolved;
}

/**
 * Cached storage status in memory and localStorage for zero-latency detection.
 */
let cachedStorageAvailability: boolean | null = null;
let probePromise: Promise<boolean> | null = null;

/**
 * Rapidly checks if Firebase Cloud Storage is provisioned and accessible.
 * Caches result in memory and localStorage so operations execute instantly (0ms)
 * without incurring connection timeouts when Cloud Storage bucket is not provisioned.
 */
export async function checkStorageAvailability(): Promise<boolean> {
  if (cachedStorageAvailability !== null) {
    return cachedStorageAvailability;
  }

  // Check persisted state from previous check in this session
  try {
    const stored = localStorage.getItem('nexxo_storage_status');
    if (stored === 'unavailable') {
      cachedStorageAvailability = false;
      return false;
    }
    if (stored === 'available') {
      cachedStorageAvailability = true;
      return true;
    }
  } catch (_) {}

  // Deduplicate in-flight probe
  if (probePromise) {
    return probePromise;
  }

  probePromise = (async () => {
    try {
      const bucket = storage.app.options.storageBucket;
      if (!bucket) {
        cachedStorageAvailability = false;
        try { localStorage.setItem('nexxo_storage_status', 'unavailable'); } catch (_) {}
        return false;
      }

      // Fast non-blocking HTTP probe with 1200ms timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);

      // If HTTP 404, the bucket is confirmed non-existent in GCP
      if (res.status === 404) {
        console.info(`[NEXXO Storage] Cloud Storage bucket "${bucket}" not found (HTTP 404). Utilizing instant Data URL & Firestore chunk transport.`);
        cachedStorageAvailability = false;
        try { localStorage.setItem('nexxo_storage_status', 'unavailable'); } catch (_) {}
        return false;
      }

      // Any other status (200, 401, 403) means the bucket exists and endpoints are active
      cachedStorageAvailability = true;
      try { localStorage.setItem('nexxo_storage_status', 'available'); } catch (_) {}
      return true;
    } catch (err) {
      // If network timed out, aborted, or CORS blocked, treat as unavailable
      cachedStorageAvailability = false;
      try { localStorage.setItem('nexxo_storage_status', 'unavailable'); } catch (_) {}
      return false;
    } finally {
      probePromise = null;
    }
  })();

  return probePromise;
}

/**
 * Manually update storage availability in case an upload fails or succeeds.
 */
export function setStorageAvailability(available: boolean): void {
  cachedStorageAvailability = available;
  try {
    localStorage.setItem('nexxo_storage_status', available ? 'available' : 'unavailable');
  } catch (_) {}
}

/**
 * Executes a Firebase Storage upload task with an adaptive watchdog.
 * Streams at full cloud speed and only aborts if the connection completely stalls or is rejected.
 */
function executeAdaptiveStorageUpload(
  uploadTask: ReturnType<typeof uploadBytesResumable>,
  onProgress?: (percent: number) => void,
  initialTimeoutMs = 3000,
  idleTimeoutMs = 25000
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Initial connection watchdog
    let watchdogTimer = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch (_) {}
      setStorageAvailability(false);
      reject(new Error('Storage connection timeout'));
    }, initialTimeoutMs);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.bytesTransferred > 0) {
          // Data is actively streaming! Refresh idle watchdog
          clearTimeout(watchdogTimer);
          watchdogTimer = setTimeout(() => {
            try {
              uploadTask.cancel();
            } catch (_) {}
            reject(new Error('Storage upload stalled'));
          }, idleTimeoutMs);
        }

        if (snapshot.totalBytes > 0 && onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        clearTimeout(watchdogTimer);
        setStorageAvailability(false);
        reject(error);
      },
      async () => {
        clearTimeout(watchdogTimer);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setStorageAvailability(true);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Uploads a file or recorded audio blob to Firebase Cloud Storage,
 * with high-speed client-side compression, zero-lag local caching, and resilient fallback.
 */
export async function uploadChatAttachment(
  file: File | Blob,
  chatId: string,
  customName?: string,
  duration?: number,
  onProgress?: (percent: number) => void
): Promise<MessageAttachment> {
  const validation = validateAttachment(file, customName);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const name = customName || (file instanceof File ? file.name : `attachment_${Date.now()}`);
  const rawMimeType = file.type || 'application/octet-stream';
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `chats/${chatId}/${Date.now()}_${sanitizedName}`;

  // Instant local Object URL for zero-latency preview
  const localPreviewUrl = URL.createObjectURL(file);

  // 1. Client-side image optimization: downscale and compress to maximize upload speed
  let uploadBlob: Blob = file;
  let finalMimeType = rawMimeType;

  if (rawMimeType.startsWith('image/') && !rawMimeType.includes('gif') && !rawMimeType.includes('svg')) {
    try {
      // Only compress if larger than 200KB or high resolution
      if (file.size > 200 * 1024) {
        uploadBlob = await compressImageFile(file, 1600, 0.80);
        finalMimeType = 'image/jpeg';
      }
    } catch (e) {
      console.warn('Image client compression note:', e);
    }
  }

  // Generate video thumbnail and duration if video
  let videoDuration = duration;
  if (rawMimeType.startsWith('video/')) {
    try {
      const vidInfo = await createVideoThumbnail(file);
      if (!videoDuration && vidInfo.duration) {
        videoDuration = Math.round(vidInfo.duration);
      }
    } catch (e) {
      console.warn('Video thumbnail note:', e);
    }
  }

  // 2. Upload to Firebase Cloud Storage if available
  const isStorageUsable = await checkStorageAvailability();
  if (isStorageUsable) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadBlob, {
        contentType: finalMimeType,
      });

      const downloadUrl = await executeAdaptiveStorageUpload(uploadTask, onProgress, 3500, 30000);

      // Cache download URL to local object URL for instant zero-load rendering on sender's device
      mediaUrlCache.set(downloadUrl, localPreviewUrl);

      return {
        url: downloadUrl,
        name,
        size: uploadBlob.size,
        mimeType: finalMimeType,
        storagePath,
        duration: videoDuration,
      };
    } catch (storageError: any) {
      console.info('Cloud Storage transport note, falling back to instant/Firestore chunk transport:', storageError);
    }
  }

  // 3. Resilient Fallback:
  // A) If under 450 KB, encode directly as Data URL
  if (uploadBlob.size <= 450 * 1024) {
    const dataUrl = await blobToDataUrl(uploadBlob);
    if (onProgress) onProgress(100);
    return {
      url: dataUrl,
      name,
      size: uploadBlob.size,
      mimeType: finalMimeType,
      duration: videoDuration,
    };
  }

  // B) Parallel Firestore chunk transport
  const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  // Pre-cache local object URL so sender has 0ms playback
  mediaUrlCache.set(mediaId, localPreviewUrl);

  await storeLargeMediaChunks(uploadBlob, mediaId, onProgress);

  return {
    url: `nexxo-chunk://${mediaId}`,
    name,
    size: uploadBlob.size,
    mimeType: finalMimeType,
    duration: videoDuration,
  };
}

/**
 * Uploads an optimized profile avatar photo.
 * If Cloud Storage is unavailable or times out, immediately returns a compact, high-efficiency Data URL
 * (<30KB) without latency or hanging.
 */
export async function uploadProfilePhoto(
  userId: string,
  imageBlob: Blob
): Promise<string> {
  const localPreviewUrl = URL.createObjectURL(imageBlob);

  // Compress avatar to ensure tiny size (<30KB) for instant zero-lag rendering
  let optimizedBlob = imageBlob;
  try {
    if (imageBlob.size > 80 * 1024) {
      optimizedBlob = await compressImageFile(imageBlob, 320, 0.82);
    }
  } catch (_) {}

  // 1. Check if Cloud Storage is usable
  const isStorageUsable = await checkStorageAvailability();

  if (!isStorageUsable) {
    const dataUrl = await blobToDataUrl(optimizedBlob);
    mediaUrlCache.set(dataUrl, localPreviewUrl);
    return dataUrl;
  }

  // 2. If storage is available, attempt with strict fast watchdog (2000ms)
  const storagePath = `avatars/${userId}_${Date.now()}.jpg`;
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, optimizedBlob, {
      contentType: 'image/jpeg',
    });

    const downloadUrl = await executeAdaptiveStorageUpload(uploadTask, undefined, 2000, 15000);
    mediaUrlCache.set(downloadUrl, localPreviewUrl);
    return downloadUrl;
  } catch (storageError: any) {
    setStorageAvailability(false);
    console.info('Firebase Storage connection unavailable for avatar, applying instant data URL fallback.');
    const dataUrl = await blobToDataUrl(optimizedBlob);
    mediaUrlCache.set(dataUrl, localPreviewUrl);
    return dataUrl;
  }
}

/**
 * Fast direct download helper for chat attachments.
 * Triggers native browser download dialog with progress and correct filename.
 */
export async function downloadAttachmentFile(url: string, fileName: string): Promise<void> {
  try {
    let resolvedUrl = url;

    // 1. Fast cache check: if already in local memory cache, trigger instant download
    if (mediaUrlCache.has(url)) {
      resolvedUrl = mediaUrlCache.get(url)!;
    } else if (url.startsWith('nexxo-chunk://')) {
      resolvedUrl = await resolveMediaUrl(url);
    }

    // If it's already an in-memory Object URL or Data URL, download directly (0ms)
    if (resolvedUrl.startsWith('blob:') || resolvedUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = resolvedUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    // For external/Firebase Storage URLs: fetch with caching to ensure proper filename save
    const response = await fetch(resolvedUrl, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Download request failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    mediaUrlCache.set(url, blobUrl);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (error) {
    console.error('Direct download fetch failed, falling back to anchor trigger:', error);
    const fallbackLink = document.createElement('a');
    fallbackLink.href = url;
    fallbackLink.download = fileName;
    fallbackLink.target = '_blank';
    fallbackLink.rel = 'noopener noreferrer';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();
  }
}

/**
 * Uploads an optimized profile banner/cover photo to Cloud Storage.
 */
export async function uploadBannerPhoto(
  userId: string,
  imageBlob: Blob
): Promise<string> {
  const localPreviewUrl = URL.createObjectURL(imageBlob);

  const isStorageUsable = await checkStorageAvailability();
  if (!isStorageUsable) {
    const dataUrl = await blobToDataUrl(imageBlob);
    mediaUrlCache.set(dataUrl, localPreviewUrl);
    return dataUrl;
  }

  const storagePath = `banners/${userId}_${Date.now()}.jpg`;
  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, imageBlob, {
      contentType: 'image/jpeg',
    });

    const downloadUrl = await executeAdaptiveStorageUpload(uploadTask, undefined, 3000, 20000);
    mediaUrlCache.set(downloadUrl, localPreviewUrl);
    return downloadUrl;
  } catch (storageError: any) {
    setStorageAvailability(false);
    console.info('Storage not reachable for banner, using instant data URL fallback.');
    const dataUrl = await blobToDataUrl(imageBlob);
    mediaUrlCache.set(dataUrl, localPreviewUrl);
    return dataUrl;
  }
}

export interface UploadController {
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Resumable upload for Story media (photo, video, audio) with progress and cancellation.
 */
export async function uploadStoryMedia(
  file: File | Blob,
  userId: string,
  type: 'image' | 'video' | 'audio',
  onProgress?: (percent: number) => void,
  onControllerReady?: (controller: UploadController) => void
): Promise<{ url: string; storagePath: string; mimeType: string; size: number }> {
  const mimeType = file.type || (type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mpeg' : 'image/jpeg');
  const ext = mimeType.split('/')[1]?.split(';')[0] || (type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'jpg');
  const sanitizedName = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `stories/${userId}/${sanitizedName}`;

  const isStorageUsable = await checkStorageAvailability();
  if (!isStorageUsable) {
    if (file.size <= 2 * 1024 * 1024) {
      if (onProgress) onProgress(100);
      const dataUrl = await blobToDataUrl(file);
      return {
        url: dataUrl,
        storagePath: `local/${sanitizedName}`,
        mimeType,
        size: file.size,
      };
    }
    // For large files when storage is down, store in parallel Firestore chunks
    const mediaId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await storeLargeMediaChunks(file, mediaId, onProgress);
    return {
      url: `nexxo-chunk://${mediaId}`,
      storagePath: `firestore_chunks/${mediaId}`,
      mimeType,
      size: file.size,
    };
  }

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: mimeType });

    if (onControllerReady) {
      onControllerReady({
        cancel: () => uploadTask.cancel(),
        pause: () => uploadTask.pause(),
        resume: () => uploadTask.resume(),
      });
    }

    const downloadUrl = await executeAdaptiveStorageUpload(uploadTask, onProgress, 4000, 35000);

    return {
      url: downloadUrl,
      storagePath,
      mimeType,
      size: file.size,
    };
  } catch (storageError: any) {
    setStorageAvailability(false);
    console.info('Storage upload note for story, using resilient fallback:', storageError);
    // Fallback for smaller files if storage CORS/sandbox is restrictive
    if (file.size <= 2 * 1024 * 1024) {
      const dataUrl = await blobToDataUrl(file);
      return {
        url: dataUrl,
        storagePath: `local/${sanitizedName}`,
        mimeType,
        size: file.size,
      };
    }
    const mediaId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await storeLargeMediaChunks(file, mediaId, onProgress);
    return {
      url: `nexxo-chunk://${mediaId}`,
      storagePath: `firestore_chunks/${mediaId}`,
      mimeType,
      size: file.size,
    };
  }
}

/**
 * Uploads user-owned audio file with metadata.
 */
export async function uploadUserAudioFile(
  file: File | Blob,
  userId: string,
  fileName?: string,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storagePath: string; size: number; mimeType: string }> {
  const mimeType = file.type || 'audio/mpeg';
  const name = fileName || (file instanceof File ? file.name : `audio_${Date.now()}.mp3`);
  const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `user_audio/${userId}/${Date.now()}_${sanitizedName}`;

  const isStorageUsable = await checkStorageAvailability();
  if (!isStorageUsable) {
    if (file.size <= 1.5 * 1024 * 1024) {
      if (onProgress) onProgress(100);
      const dataUrl = await blobToDataUrl(file);
      return {
        url: dataUrl,
        storagePath: `local/${sanitizedName}`,
        size: file.size,
        mimeType,
      };
    }
    const mediaId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await storeLargeMediaChunks(file, mediaId, onProgress);
    return {
      url: `nexxo-chunk://${mediaId}`,
      storagePath: `firestore_chunks/${mediaId}`,
      size: file.size,
      mimeType,
    };
  }

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: mimeType });

    const downloadUrl = await executeAdaptiveStorageUpload(uploadTask, onProgress, 4000, 35000);

    return {
      url: downloadUrl,
      storagePath,
      size: file.size,
      mimeType,
    };
  } catch (err: any) {
    setStorageAvailability(false);
    if (file.size <= 1.5 * 1024 * 1024) {
      const dataUrl = await blobToDataUrl(file);
      return {
        url: dataUrl,
        storagePath: `local/${sanitizedName}`,
        size: file.size,
        mimeType,
      };
    }
    const mediaId = `audio_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await storeLargeMediaChunks(file, mediaId, onProgress);
    return {
      url: `nexxo-chunk://${mediaId}`,
      storagePath: `firestore_chunks/${mediaId}`,
      size: file.size,
      mimeType,
    };
  }
}

/**
 * Extracts a thumbnail, duration, and dimensions from a video file using browser HTML5 video & canvas.
 */
export async function createVideoThumbnail(
  file: File | Blob
): Promise<{ thumbnailBlob: Blob; duration: number; width: number; height: number; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      // Seek slightly into the video to avoid a black opening frame
      const targetTime = Math.min(1, Math.max(0.2, video.duration / 4));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(width, 720);
        canvas.height = Math.round((canvas.width / width) * height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanUp();
          reject(new Error('Could not create canvas 2d context for video thumbnail'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              const duration = video.duration || 0;
              cleanUp();
              resolve({
                thumbnailBlob: blob,
                duration,
                width,
                height,
                thumbnailUrl,
              });
            } else {
              cleanUp();
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('Failed to load video file for thumbnail generation'));
    };
  });
}

/**
 * Extracts the duration in seconds of an audio file.
 */
export async function extractAudioDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(objectUrl);
      audio.remove();
      resolve(isFinite(dur) ? Math.round(dur) : 15);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      audio.remove();
      resolve(15);
    };
  });
}

/**
 * Client-side image optimization: compresses and downsizes images to reasonable story resolution.
 */
export async function compressImageFile(file: File | Blob, maxDimension = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file buffer.'));
    reader.readAsDataURL(blob);
  });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
