import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * Transcode an uploaded master to MP3 in the browser, before it is uploaded.
 *
 * The masters are 40–60MB WAVs. Every listener streams the whole file, and blob
 * storage is billed on what is stored and served, so shipping WAVs to phones is
 * expensive twice over. A 192kbps MP3 of the same track is roughly 3MB — about
 * a 15× saving, and indistinguishable for demo listening on a phone.
 *
 * MP3 specifically (rather than Opus/WebM, which encode better) because this is
 * played on iPhones, where WebM audio support cannot be relied on. Browsers have
 * no built-in MP3 encoder, hence lamejs.
 *
 * Always returns a usable File: anything that fails falls back to the original.
 */

const TARGET_KBPS = 192;

/** lamejs writes MPEG frames of 1152 samples per channel. */
const SAMPLES_PER_FRAME = 1152;

/** Forced decode rate. 44.1kHz is a rate lamejs supports and the native rate of
 *  every master here; decoding into a context of this rate resamples for us. */
const TARGET_SAMPLE_RATE = 44100;

export interface ConvertResult {
  file: File;
  originalSize: number;
  /** True when the returned file is a freshly encoded MP3. */
  converted: boolean;
  /** Set when conversion was attempted and failed, so the caller can say so. */
  reason?: string;
}

function isAlreadyMp3(file: File): boolean {
  return file.type === 'audio/mpeg' || file.type === 'audio/mp3' || /\.mp3$/i.test(file.name);
}

/** Float32 [-1,1] → Int16, which is what the encoder consumes. */
function floatToInt16(input: Float32Array, offset: number, length: number): Int16Array {
  const out = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, input[offset + i] || 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export async function convertToMp3(
  file: File,
  onProgress?: (fraction: number) => void
): Promise<ConvertResult> {
  const passthrough: ConvertResult = { file, originalSize: file.size, converted: false };

  if (isAlreadyMp3(file)) return passthrough;
  if (typeof window === 'undefined') return passthrough;

  const AudioCtx: typeof OfflineAudioContext | undefined =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;
  if (!AudioCtx) return { ...passthrough, reason: 'This browser cannot decode audio' };

  let audio: AudioBuffer;
  try {
    const bytes = await file.arrayBuffer();
    // A 1-frame offline context used purely as a decoder: decodeAudioData
    // resamples to the context's rate, giving us a known 44.1kHz result.
    const decoder = new AudioCtx(2, 1, TARGET_SAMPLE_RATE);
    audio = await decoder.decodeAudioData(bytes);
  } catch {
    return { ...passthrough, reason: 'Could not decode this audio file' };
  }

  try {
    const channels = Math.min(2, audio.numberOfChannels);
    const sampleRate = audio.sampleRate;
    const left = audio.getChannelData(0);
    const right = channels > 1 ? audio.getChannelData(1) : null;
    const total = audio.length;

    const encoder = new Mp3Encoder(channels, sampleRate, TARGET_KBPS);
    const chunks: Uint8Array[] = [];

    for (let offset = 0; offset < total; offset += SAMPLES_PER_FRAME) {
      const len = Math.min(SAMPLES_PER_FRAME, total - offset);
      const l = floatToInt16(left, offset, len);
      const r = right ? floatToInt16(right, offset, len) : undefined;

      const encoded = r ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
      if (encoded.length > 0) chunks.push(encoded);

      // Encoding a 4-minute track is thousands of frames. Yield periodically so
      // the tab keeps painting and the progress readout actually moves.
      if ((offset / SAMPLES_PER_FRAME) % 200 === 0) {
        onProgress?.(offset / total);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(tail);
    onProgress?.(1);

    const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
    if (blob.size === 0) return { ...passthrough, reason: 'Encoding produced an empty file' };

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'track';
    return {
      file: new File([blob], `${baseName}.mp3`, { type: 'audio/mpeg' }),
      originalSize: file.size,
      converted: true,
    };
  } catch {
    return { ...passthrough, reason: 'Could not encode this file to MP3' };
  }
}
