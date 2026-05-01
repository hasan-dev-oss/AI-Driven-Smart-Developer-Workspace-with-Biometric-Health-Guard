/**
 * Interview Recorder Hook
 * Manages the complete interview recording and analysis workflow
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInterview } from '../context/InterviewContext';
import AudioCaptureService from '../services/AudioCaptureService';
import InterviewAnalysisService from '../services/InterviewAnalysisService';
import EncryptionService from '../services/EncryptionService';

export function useInterviewRecorder() {
  const interview = useInterview();
  const audioServiceRef = useRef(null);
  const analysisServiceRef = useRef(null);
  const encryptionServiceRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);

  // Initialize services
  useEffect(() => {
    encryptionServiceRef.current = new EncryptionService();

    return () => {
      if (audioServiceRef.current) {
        audioServiceRef.current.cleanup();
      }
    };
  }, []);

  // Update analysis service when API key changes
  useEffect(() => {
    if (interview.settings.apiKey) {
      analysisServiceRef.current = new InterviewAnalysisService(
        interview.settings.apiKey
      );
    }
  }, [interview.settings.apiKey]);

  const initializeAudio = useCallback(async () => {
    try {
      if (audioServiceRef.current?.isInitialized()) {
        return true;
      }

      audioServiceRef.current = new AudioCaptureService(
        (chunk) => handleAudioChunk(chunk),
        (error) => interview.setError(error),
        { chunkDuration: 15000 }
      );

      const initialized = await audioServiceRef.current.initialize();
      if (!initialized) {
        interview.setError('Failed to initialize audio capture');
        return false;
      }

      return true;
    } catch (error) {
      interview.setError(`Audio initialization failed: ${error.message}`);
      return false;
    }
  }, [interview]);

  const handleAudioChunk = useCallback(
    async (chunk) => {
      try {
        // Encrypt audio data
        let audioToSend = chunk.audio;
        if (interview.settings.encryptionEnabled && encryptionServiceRef.current) {
          audioToSend = await encryptionServiceRef.current.encryptData({
            audio: chunk.audio,
            timestamp: chunk.timestamp,
          });
        }

        // Send to analysis service
        if (analysisServiceRef.current) {
          const transcript = await analysisServiceRef.current.analyzeAudioChunk(
            chunk.audio,
            chunk.mimeType
          );
          if (transcript) {
            interview.appendTranscript(transcript);
          }
        }
      } catch (error) {
        console.error('Chunk processing failed:', error);
      }
    },
    [interview]
  );

  const startRecording = useCallback(async () => {
    try {
      const initialized = await initializeAudio();
      if (!initialized) return false;

      const started = audioServiceRef.current.start();
      if (!started) {
        interview.setError('Failed to start recording');
        return false;
      }

      interview.startRecording();
      setRecordingTime(0);

      // Timer for recording duration
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Audio level visualization
      audioLevelIntervalRef.current = setInterval(() => {
        const level = audioServiceRef.current?.getAudioLevel() || 0;
        interview.updateAudioLevel(level);
      }, 100);

      return true;
    } catch (error) {
      interview.setError(`Failed to start recording: ${error.message}`);
      return false;
    }
  }, [interview, initializeAudio]);

  const stopRecording = useCallback(async () => {
    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }

      if (audioServiceRef.current) {
        audioServiceRef.current.stop();
      }

      interview.stopRecording();
      interview.updateAudioLevel(0);

      return true;
    } catch (error) {
      interview.setError(`Failed to stop recording: ${error.message}`);
      return false;
    }
  }, [interview]);

  const analyzeTranscript = useCallback(async () => {
    try {
      if (!interview.transcript) {
        interview.setError('No transcript to analyze');
        return false;
      }

      if (!analysisServiceRef.current?.validateApiKey()) {
        interview.setError('API key not configured');
        return false;
      }

      interview.startAnalysis();

      // Decrypt transcript if needed
      let textToAnalyze = interview.transcript;
      if (interview.settings.encryptionEnabled) {
        try {
          const decrypted = await encryptionServiceRef.current.decryptData(
            textToAnalyze
          );
          textToAnalyze = decrypted.transcript || textToAnalyze;
        } catch (e) {
          // If decryption fails, use original text
          console.warn('Could not decrypt transcript, using original');
        }
      }

      const analysis = await analysisServiceRef.current.summarizeTranscript(
        textToAnalyze
      );

      interview.setAnalysis(analysis);

      // Save to history
      interview.addToHistory({
        timestamp: new Date().toISOString(),
        duration: recordingTime,
        transcript: textToAnalyze,
        analysis,
      });

      return true;
    } catch (error) {
      interview.setError(`Analysis failed: ${error.message}`);
      return false;
    }
  }, [interview, recordingTime]);

  const clearSession = useCallback(() => {
    stopRecording();
    interview.clearSession();
    setRecordingTime(0);
  }, [interview, stopRecording]);

  return {
    recordingTime,
    startRecording,
    stopRecording,
    analyzeTranscript,
    clearSession,
    isReady: !!interview.settings.apiKey,
  };
}

export default useInterviewRecorder;
