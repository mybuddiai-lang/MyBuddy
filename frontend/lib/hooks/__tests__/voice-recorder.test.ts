/**
 * Unit tests for the voice recorder MIME type detection and stream cleanup logic.
 *
 * These tests verify:
 * 1. MIME type priority: webm (Chrome) → mp4 (iOS Safari) → ogg (Firefox) → '' (fallback)
 * 2. Stream tracks are stopped when MediaRecorder construction fails
 * 3. File extension matches the MIME type used
 */
import { describe, it, expect, vi } from 'vitest';

// ── Pure logic extracted from use-voice-recorder.ts ──────────────────────────

function selectMimeType(isTypeSupported: (t: string) => boolean): string {
  for (const t of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (isTypeSupported(t)) return t;
  }
  return '';
}

function mimeToExtension(mimeType: string): string {
  const effective = mimeType || 'audio/mpeg';
  return effective.includes('webm') ? 'webm'
    : effective.includes('mp4') ? 'm4a'
    : effective.includes('ogg') ? 'ogg'
    : 'audio';
}

// Simulates the recorder construction + stream cleanup on failure
async function tryCreateRecorder(
  stream: { getTracks: () => Array<{ stop: () => void }> },
  mimeType: string,
  MediaRecorderImpl: any,
): Promise<{ recorder: any; error: Error | null }> {
  try {
    const recorder = mimeType
      ? new MediaRecorderImpl(stream, { mimeType })
      : new MediaRecorderImpl(stream);
    return { recorder, error: null };
  } catch (err: any) {
    stream.getTracks().forEach((t: any) => t.stop());
    return { recorder: null, error: new Error('Audio recording is not supported on this device') };
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('selectMimeType — MIME type priority', () => {
  it('returns audio/webm when supported (Chrome/Android)', () => {
    const isSupported = (t: string) => t === 'audio/webm';
    expect(selectMimeType(isSupported)).toBe('audio/webm');
  });

  it('returns audio/mp4 when webm is not supported (iOS Safari)', () => {
    const isSupported = (t: string) => t === 'audio/mp4';
    expect(selectMimeType(isSupported)).toBe('audio/mp4');
  });

  it('returns audio/ogg when only ogg is supported (some Firefox builds)', () => {
    const isSupported = (t: string) => t === 'audio/ogg';
    expect(selectMimeType(isSupported)).toBe('audio/ogg');
  });

  it('returns empty string when no supported MIME type is found (fallback)', () => {
    const isSupported = (_t: string) => false;
    expect(selectMimeType(isSupported)).toBe('');
  });

  it('prefers webm over mp4 when both are supported', () => {
    const isSupported = (t: string) => t === 'audio/webm' || t === 'audio/mp4';
    expect(selectMimeType(isSupported)).toBe('audio/webm');
  });

  it('prefers mp4 over ogg when webm is unavailable', () => {
    const isSupported = (t: string) => t === 'audio/mp4' || t === 'audio/ogg';
    expect(selectMimeType(isSupported)).toBe('audio/mp4');
  });
});

describe('mimeToExtension — file extension mapping', () => {
  it('returns webm for audio/webm', () => {
    expect(mimeToExtension('audio/webm')).toBe('webm');
  });

  it('returns m4a for audio/mp4 (iOS compatible container)', () => {
    expect(mimeToExtension('audio/mp4')).toBe('m4a');
  });

  it('returns ogg for audio/ogg', () => {
    expect(mimeToExtension('audio/ogg')).toBe('ogg');
  });

  it('returns audio for empty MIME type (browser-default fallback)', () => {
    expect(mimeToExtension('')).toBe('audio');
  });

  it('returns audio for unknown MIME type', () => {
    expect(mimeToExtension('audio/unknown')).toBe('audio');
  });
});

describe('tryCreateRecorder — stream cleanup on failure', () => {
  it('returns recorder on successful construction', async () => {
    const mockRecorder = { start: vi.fn() };
    // Must use `function` keyword (not arrow) so Vitest allows it as a constructor
    const MockMediaRecorder = vi.fn(function() { return mockRecorder; });
    const mockStop = vi.fn();
    const stream = { getTracks: vi.fn().mockReturnValue([{ stop: mockStop }]) };

    const result = await tryCreateRecorder(stream, 'audio/webm', MockMediaRecorder);

    expect(result.error).toBeNull();
    expect(result.recorder).toBe(mockRecorder);
    // Stream tracks should NOT be stopped when construction succeeds
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('stops stream tracks when MediaRecorder construction throws', async () => {
    const MockMediaRecorder = vi.fn().mockImplementation(() => {
      throw new Error('NotSupportedError');
    });
    const mockStop = vi.fn();
    const stream = {
      getTracks: vi.fn().mockReturnValue([{ stop: mockStop }, { stop: mockStop }]),
    };

    const result = await tryCreateRecorder(stream, 'audio/ogg', MockMediaRecorder);

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe('Audio recording is not supported on this device');
    expect(mockStop).toHaveBeenCalledTimes(2); // both tracks stopped
    expect(result.recorder).toBeNull();
  });

  it('creates recorder without mimeType option when empty string is passed', async () => {
    const mockRecorder = {};
    const MockMediaRecorder = vi.fn(function() { return mockRecorder; });
    const stream = { getTracks: vi.fn().mockReturnValue([]) };

    await tryCreateRecorder(stream, '', MockMediaRecorder);

    // When mimeType is empty, constructor should be called with stream only (no options)
    expect(MockMediaRecorder).toHaveBeenCalledWith(stream);
    expect(MockMediaRecorder).not.toHaveBeenCalledWith(stream, expect.any(Object));
  });

  it('passes mimeType option when a non-empty mimeType is provided', async () => {
    const mockRecorder = {};
    const MockMediaRecorder = vi.fn(function() { return mockRecorder; });
    const stream = { getTracks: vi.fn().mockReturnValue([]) };

    await tryCreateRecorder(stream, 'audio/webm', MockMediaRecorder);

    expect(MockMediaRecorder).toHaveBeenCalledWith(stream, { mimeType: 'audio/webm' });
  });
});
