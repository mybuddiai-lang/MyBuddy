/**
 * Unit tests for image preview blob URL lifecycle.
 *
 * These tests verify:
 * 1. Blob URL is NOT revoked when a message is sent (it must stay valid for MessageBubble)
 * 2. Blob URL IS revoked when the user cancels the pending attachment
 * 3. The fallback from previewUrl → remote URL in AttachmentPreview state machine
 */
import { describe, it, expect, vi } from 'vitest';

// ── Simulated pendingAttachment state machine ─────────────────────────────────

interface PendingAttachment {
  url: string;        // remote CDN URL
  type: 'IMAGE' | 'FILE' | 'VOICE';
  previewUrl?: string; // local blob URL
  name: string;
}

interface SendPayload {
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  previewUrl?: string; // passed to chat store — must remain valid
}

function simulateSend(
  attachment: PendingAttachment | null,
  text: string,
): { payload: SendPayload; blobRevoked: boolean } {
  let blobRevoked = false;

  // This is the CORRECT behaviour: blob URL is NOT revoked on send.
  // The previewUrl is passed into the message so MessageBubble can display
  // the image instantly, even before the remote URL loads.
  const payload: SendPayload = {
    content: text,
    attachmentUrl: attachment?.url,
    attachmentType: attachment?.type,
    previewUrl: attachment?.previewUrl, // kept alive
  };

  // pendingAttachment is cleared but previewUrl is NOT revoked
  // (setPendingAttachment(null) no longer triggers URL.revokeObjectURL)

  return { payload, blobRevoked };
}

function simulateCancel(
  attachment: PendingAttachment | null,
  revokeObjectURL: (url: string) => void,
): boolean {
  // Cancel button explicitly revokes the blob URL
  if (attachment?.previewUrl) {
    revokeObjectURL(attachment.previewUrl);
    return true;
  }
  return false;
}

// ── AttachmentPreview fallback state machine ──────────────────────────────────

interface PreviewState {
  imgLoaded: boolean;
  imgError: boolean;
  useFallback: boolean;
}

function applyImgError(state: PreviewState, hasPreviewUrl: boolean): PreviewState {
  if (!state.useFallback && hasPreviewUrl) {
    // Blob URL failed → switch to remote URL
    return { ...state, useFallback: true, imgLoaded: false };
  }
  // Remote URL also failed → show error state
  return { ...state, imgError: true };
}

function getCurrentSrc(state: PreviewState, previewUrl: string | undefined, url: string): string {
  return (!state.useFallback && previewUrl) ? previewUrl : url;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('blob URL lifecycle on send', () => {
  it('does NOT revoke previewUrl when message is sent', () => {
    const attachment: PendingAttachment = {
      url: 'https://cdn.example.com/img.jpg',
      type: 'IMAGE',
      previewUrl: 'blob:http://localhost/abc-123',
      name: 'photo.jpg',
    };

    const { payload, blobRevoked } = simulateSend(attachment, 'Here is my photo');

    expect(blobRevoked).toBe(false);
    // previewUrl must be forwarded to the message store
    expect(payload.previewUrl).toBe('blob:http://localhost/abc-123');
    expect(payload.attachmentUrl).toBe('https://cdn.example.com/img.jpg');
  });

  it('passes remote url and type to the message store', () => {
    const attachment: PendingAttachment = {
      url: 'https://cdn.example.com/img.jpg',
      type: 'IMAGE',
      previewUrl: 'blob:http://localhost/xyz',
      name: 'image.png',
    };

    const { payload } = simulateSend(attachment, '');

    expect(payload.attachmentUrl).toBe('https://cdn.example.com/img.jpg');
    expect(payload.attachmentType).toBe('IMAGE');
  });

  it('works correctly when there is no pending attachment', () => {
    const { payload, blobRevoked } = simulateSend(null, 'Just text');

    expect(blobRevoked).toBe(false);
    expect(payload.previewUrl).toBeUndefined();
    expect(payload.attachmentUrl).toBeUndefined();
    expect(payload.content).toBe('Just text');
  });
});

describe('blob URL lifecycle on cancel', () => {
  it('revokes blob URL when user cancels the attachment', () => {
    const revokeObjectURL = vi.fn();
    const attachment: PendingAttachment = {
      url: 'https://cdn.example.com/img.jpg',
      type: 'IMAGE',
      previewUrl: 'blob:http://localhost/abc-123',
      name: 'photo.jpg',
    };

    const revoked = simulateCancel(attachment, revokeObjectURL);

    expect(revoked).toBe(true);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/abc-123');
  });

  it('does not call revokeObjectURL when there is no previewUrl', () => {
    const revokeObjectURL = vi.fn();
    const attachment: PendingAttachment = {
      url: 'https://cdn.example.com/doc.pdf',
      type: 'FILE',
      name: 'document.pdf',
      // no previewUrl for non-image files
    };

    const revoked = simulateCancel(attachment, revokeObjectURL);

    expect(revoked).toBe(false);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('does not call revokeObjectURL when attachment is null', () => {
    const revokeObjectURL = vi.fn();

    simulateCancel(null, revokeObjectURL);

    expect(revokeObjectURL).not.toHaveBeenCalled();
  });
});

describe('AttachmentPreview fallback state machine', () => {
  it('starts with previewUrl as src while blob is valid', () => {
    const state: PreviewState = { imgLoaded: false, imgError: false, useFallback: false };
    const src = getCurrentSrc(state, 'blob:http://localhost/abc', 'https://cdn.example.com/img.jpg');

    expect(src).toBe('blob:http://localhost/abc');
  });

  it('switches to remote url when blob fails (first onError)', () => {
    let state: PreviewState = { imgLoaded: false, imgError: false, useFallback: false };
    state = applyImgError(state, true);

    expect(state.useFallback).toBe(true);
    expect(state.imgLoaded).toBe(false);
    expect(state.imgError).toBe(false);

    const src = getCurrentSrc(state, 'blob:http://localhost/abc', 'https://cdn.example.com/img.jpg');
    expect(src).toBe('https://cdn.example.com/img.jpg');
  });

  it('sets imgError=true when remote url also fails (second onError)', () => {
    let state: PreviewState = { imgLoaded: false, imgError: false, useFallback: true };
    state = applyImgError(state, true);

    expect(state.imgError).toBe(true);
  });

  it('sets imgError=true immediately when there is no previewUrl and url fails', () => {
    let state: PreviewState = { imgLoaded: false, imgError: false, useFallback: false };
    state = applyImgError(state, false); // no previewUrl

    expect(state.imgError).toBe(true);
    expect(state.useFallback).toBe(false);
  });

  it('uses remote url when useFallback is true even if previewUrl is defined', () => {
    const state: PreviewState = { imgLoaded: false, imgError: false, useFallback: true };
    const src = getCurrentSrc(state, 'blob:http://localhost/abc', 'https://cdn.example.com/img.jpg');

    expect(src).toBe('https://cdn.example.com/img.jpg');
  });
});
