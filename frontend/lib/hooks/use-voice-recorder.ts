'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Provides direct microphone recording via MediaRecorder API.
 * Calls `onFile` with the recorded File when recording stops.
 */
export function useVoiceRecorder(onFile: (file: File) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFileRef = useRef(onFile);
  const isMountedRef = useRef(true);
  // Prevents a race condition where rapid clicks during the async permission
  // prompt would create multiple MediaRecorder instances simultaneously.
  const isStartingRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => { onFileRef.current = onFile; });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      // Stop the recorder on unmount; onstop checks isMountedRef so it
      // won't call onFile after the component is gone.
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingSeconds(0);
    } else {
      // Guard against double-start while permission dialog is open
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // If the component unmounted while waiting for permission, clean up and bail
        if (!isMountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const mimeType =
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/ogg';

        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          // Don't call onFile if the component unmounted during recording
          if (!isMountedRef.current || !audioChunksRef.current.length) return;
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
          onFileRef.current(new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType }));
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
      } finally {
        isStartingRef.current = false;
      }
    }
  }, [isRecording]);

  const recordingTime = `${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  return { isRecording, recordingSeconds, recordingTime, toggleRecording };
}
