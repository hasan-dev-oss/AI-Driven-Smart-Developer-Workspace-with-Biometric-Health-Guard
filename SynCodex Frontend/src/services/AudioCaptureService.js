/**
 * Interview Audio Capture Service
 * Handles WebRTC audio streaming, chunking, and preprocessing
 */

class AudioCaptureService {
  constructor(onChunkReady, onError) {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
    this.onChunkReady = onChunkReady;
    this.onError = onError;
    this.chunkDuration = 5000; // 5 second chunks
  }

  async initialize(providedStream = null) {
    try {
      if (providedStream) {
        this.stream = providedStream;
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          },
        });
      }

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      source.connect(this.analyser);

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // keep chunks for final merged blob
          this.chunks.push(event.data);

          // also emit chunk immediately for streaming/analysis
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const audioData = reader.result.split(',')[1];
              this.onChunkReady?.({ audio: audioData, timestamp: new Date().toISOString(), duration: this.chunkDuration, final: false });
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
    if (!this.mediaRecorder) return false;
    this.isRecording = true;
    this.chunks = [];
    this.mediaRecorder.start(this.chunkDuration);
    return true;
  }

  stop() {
    if (!this.mediaRecorder) return false;
    this.isRecording = false;
    this.mediaRecorder.stop();
    return true;
  }

  processChunks() {
    if (this.chunks.length === 0) return;

    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    this.chunks = [];

    // Convert blob to base64 for transmission
    const reader = new FileReader();
    reader.onload = () => {
      const audioData = reader.result.split(',')[1]; // Get base64 without data URI
      this.onChunkReady?.({
        audio: audioData,
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
