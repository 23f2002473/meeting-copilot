'use client';

import { useRef, useState, useCallback } from 'react';

interface AudioRecorderOptions {
  /** Called with each completed audio chunk */
  onChunkReady: (blob: Blob) => void;
  /** Duration of each recording chunk in seconds */
  chunkDuration: number;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

export function useAudioRecorder({ onChunkReady, chunkDuration }: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const mimeTypeRef = useRef('audio/webm');

  const stopCycle = useCallback(() => {
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const startCycle = useCallback(() => {
    if (!activeRef.current || !streamRef.current) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: mimeTypeRef.current,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      // Only send if there's meaningful audio (> 4 KB avoids silence-only blobs)
      if (blob.size > 4096) {
        onChunkReady(blob);
      }
      // Start next cycle if still recording
      if (activeRef.current) {
        startCycle();
      }
    };

    recorder.start(250); // Collect data every 250ms for smooth chunks

    // Stop after chunkDuration seconds to trigger onstop → next cycle
    cycleTimerRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, chunkDuration * 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkDuration, onChunkReady]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      mimeTypeRef.current = getSupportedMimeType();
      activeRef.current = true;
      setIsRecording(true);
      startCycle();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Microphone access denied. Check browser permissions.';
      setError(message);
      throw err;
    }
  }, [startCycle]);

  const stopRecording = useCallback(() => {
    activeRef.current = false;
    stopCycle();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, [stopCycle]);

  return { isRecording, error, startRecording, stopRecording };
}
