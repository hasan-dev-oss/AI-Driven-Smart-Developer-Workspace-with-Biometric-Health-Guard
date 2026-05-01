/**
 * Interview Audio Capture Service
 * Handles WebRTC audio streaming, chunking, and preprocessing
 */

class AudioCaptureService {
  constructor(onChunkReady, onError, options = {}) {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
    this.onChunkReady = onChunkReady;
    this.onError = onError;

    const configuredChunkDuration = Number.isFinite(options?.chunkDuration)
      ? options.chunkDuration
      : null;

    // Gemini free tier rate-limits generateContent aggressively (often ~5 req/min).
    // Default to longer chunks to avoid 429s during live transcription.
    this.chunkDuration = configuredChunkDuration ?? 15000;
    this.mimeType = null;
  }

  async initialize(providedStream = null) {
    try {
      if (providedStream) {
        const audioTracks = providedStream.getAudioTracks?.() || [];
        if (!audioTracks.length) {
          throw new Error('No audio track found in the provided stream');
        }
        // Important: record ONLY audio tracks. If the stream also contains video,
        // forcing an audio-only mimeType can cause MediaRecorder.start() to throw NotSupportedError.
        // Clone tracks so stopping the recorder doesn't stop the active call.
        this.stream = new MediaStream(audioTracks.map((t) => t.clone()));
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            // Hint only; browser may ignore.
            sampleRate: 16000,
          },
        });
      }

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      source.connect(this.analyser);

      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];

      const pickMimeType = () => {
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return null;
        for (const type of candidates) {
          try {
            if (MediaRecorder.isTypeSupported(type)) return type;
          } catch (_) {
            // ignore
          }
        }
        return null;
      };

      const picked = pickMimeType();
      const options = { audioBitsPerSecond: 128000 };
      if (picked) options.mimeType = picked;

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.mimeType = picked || this.mediaRecorder.mimeType || null;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // keep chunks for final merged blob
          this.chunks.push(event.data);

          // also emit chunk immediately for streaming/analysis
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const audioData = reader.result.split(',')[1];
              this.onChunkReady?.({
                audio: audioData,
                mimeType: event.data?.type || this.mediaRecorder?.mimeType || this.mimeType || 'audio/webm',
                timestamp: new Date().toISOString(),
                duration: this.chunkDuration,
                final: false,
              });
            };
            reader.readAsDataURL(event.data);
          } catch (err) {
            console.warn('Failed to process chunk for immediate analysis', err);
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processChunks();
      };

      return true;
    } catch (error) {
      this.onError?.(`Microphone access failed: ${error.message}`);
      return false;
    }
  }

  start() {
    if (!this.mediaRecorder || !this.stream) return false;

    const audioTracks = this.stream.getAudioTracks?.() || [];
    if (!audioTracks.length || audioTracks.every((t) => t.readyState !== 'live')) {
      this.onError?.('Microphone is not active. Please allow microphone access and ensure it is not used by another app.');
      return false;
    }

    // Resume audio context if it was suspended (common in Chrome until a user gesture)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    if (this.mediaRecorder.state !== 'inactive') {
      // Prevent InvalidStateError
      return false;
    }

    this.isRecording = true;
    this.chunks = [];

    try {
      this.mediaRecorder.start(this.chunkDuration);
      return true;
    } catch (error) {
      const msg =
        error?.name === 'NotSupportedError'
          ? `Recording not supported with current settings. Try a different browser/codec, or ensure you're recording audio-only. (mimeType: ${this.mimeType || 'default'})`
          : (error?.message || 'Failed to start recording');
      this.onError?.(msg);
      return false;
    }
  }

  stop() {
    if (!this.mediaRecorder) return false;
    this.isRecording = false;
    this.mediaRecorder.stop();
    return true;
  }

  processChunks() {
    if (this.chunks.length === 0) return;

    const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || this.mimeType || 'audio/webm' });
    this.chunks = [];

    // Convert blob to base64 for transmission
    const reader = new FileReader();
    reader.onload = () => {
      const audioData = reader.result.split(',')[1]; // Get base64 without data URI
      this.onChunkReady?.({
        audio: audioData,
        mimeType: blob.type || this.mediaRecorder?.mimeType || this.mimeType || 'audio/webm',
        timestamp: new Date().toISOString(),
        duration: this.chunkDuration,
        final: true,
      });
    };
    reader.readAsDataURL(blob);
  }

  getAudioLevel() {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average / 255; // Normalize to 0-1
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.mediaRecorder = null;
    this.stream = null;
  }

  isInitialized() {
    return this.mediaRecorder !== null;
  }
}

export default AudioCaptureService;
