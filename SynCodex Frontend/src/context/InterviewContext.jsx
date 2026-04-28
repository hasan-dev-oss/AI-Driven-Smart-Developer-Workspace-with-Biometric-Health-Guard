/**
 * Interview Context Provider
 * Manages interview recording state, analysis results, and settings
 */

import React, { createContext, useReducer, useCallback } from 'react';

export const InterviewContext = createContext();

const initialState = {
  isRecording: false,
  audioLevel: 0,
  transcript: '',
  analysis: null,
  isAnalyzing: false,
  error: null,
  settings: {
    apiKey: localStorage.getItem('interviewApiKey') || '',
    recordingDuration: 0,
    encryptionEnabled: true,
  },
  history: [],
};

function interviewReducer(state, action) {
  switch (action.type) {
    case 'START_RECORDING':
      return { ...state, isRecording: true, error: null };

    case 'STOP_RECORDING':
      return { ...state, isRecording: false };

    case 'UPDATE_AUDIO_LEVEL':
      return { ...state, audioLevel: action.payload };

    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.payload };

    case 'APPEND_TRANSCRIPT':
      return { ...state, transcript: state.transcript + ' ' + action.payload };

    case 'START_ANALYSIS':
      return { ...state, isAnalyzing: true, error: null };

    case 'SET_ANALYSIS':
      return { ...state, analysis: action.payload, isAnalyzing: false };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isAnalyzing: false };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history].slice(0, 20), // Keep last 20
      };

    case 'CLEAR_SESSION':
      return {
        ...state,
        isRecording: false,
        transcript: '',
        analysis: null,
        error: null,
      };

    default:
      return state;
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, []);

  const stopRecording = useCallback(() => {
    dispatch({ type: 'STOP_RECORDING' });
  }, []);

  const updateAudioLevel = useCallback((level) => {
    dispatch({ type: 'UPDATE_AUDIO_LEVEL', payload: level });
  }, []);

  const setTranscript = useCallback((transcript) => {
    dispatch({ type: 'SET_TRANSCRIPT', payload: transcript });
  }, []);

  const appendTranscript = useCallback((text) => {
    dispatch({ type: 'APPEND_TRANSCRIPT', payload: text });
  }, []);

  const startAnalysis = useCallback(() => {
    dispatch({ type: 'START_ANALYSIS' });
  }, []);

  const setAnalysis = useCallback((analysis) => {
    dispatch({ type: 'SET_ANALYSIS', payload: analysis });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const updateSettings = useCallback((settings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    // Persist API key
    if (settings.apiKey) {
      localStorage.setItem('interviewApiKey', settings.apiKey);
    }
  }, []);

  const addToHistory = useCallback((record) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: record });
  }, []);

  const clearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSION' });
  }, []);

  const value = {
    ...state,
    startRecording,
    stopRecording,
    updateAudioLevel,
    setTranscript,
    appendTranscript,
    startAnalysis,
    setAnalysis,
    setError,
    updateSettings,
    addToHistory,
    clearSession,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export function useInterview() {
  const context = React.useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within InterviewProvider');
  }
  return context;
}
