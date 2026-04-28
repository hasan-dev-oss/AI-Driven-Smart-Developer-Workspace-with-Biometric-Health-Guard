/**
 * Interview Recorder Component
 * Main UI for recording, analyzing, and downloading interview reports
 */

import React, { useState, useEffect } from 'react';
import { useInterview } from '../../context/InterviewContext';
import { useInterviewRecorder } from '../../hooks/useInterviewRecorder';
import PDFReportGenerator from '../../services/PDFReportGenerator';
import {
  Mic,
  Square,
  Play,
  Download,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Volume2,
} from 'lucide-react';
import TroubleshootPanel from './TroubleshootPanel';

const InterviewRecorder = ({ onClose, roomId, roomName }) => {
  const interview = useInterview();
  const recorder = useInterviewRecorder();
  const [showSettings, setShowSettings] = useState(!interview.settings.apiKey);
  const [showResults, setShowResults] = useState(false);
  const pdfGeneratorRef = React.useRef(new PDFReportGenerator());

  const handleStartRecording = async () => {
    const success = await recorder.startRecording();
    if (!success) {
      console.error(interview.error || 'Failed to start recording (no error message yet)');
      if (!interview.error) interview.setError('Failed to start recording. Please allow microphone access and reload the page.');
    }
  };

  const handleStopRecording = async () => {
    await recorder.stopRecording();
  };

  const handleAnalyze = async () => {
    const success = await recorder.analyzeTranscript();
    if (success) {
      setShowResults(true);
    }
  };

  const handleDownloadPDF = async () => {
    if (!interview.analysis) {
      interview.setError('No analysis data to export');
      return;
    }

    try {
      const blob = await pdfGeneratorRef.current.generateReport(
        interview.analysis,
        {
          interviewDate: new Date().toISOString(),
          interviewRole: 'Technical Interview',
        }
      );

      pdfGeneratorRef.current.downloadReport(
        blob,
        `interview_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (error) {
      interview.setError(`PDF generation failed: ${error.message}`);
    }
  };

  const handleClear = () => {
    recorder.clearSession();
    setShowResults(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAudioLevelBars = () => {
    const bars = 20;
    const filledBars = Math.ceil(interview.audioLevel * bars);
    return Array(bars)
      .fill(0)
      .map((_, i) => i < filledBars);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Interview Assessment</h2>
            <p className="text-blue-100 text-sm mt-1">SecureSphere Recording System</p>
            {(roomName || roomId) && (
              <p className="text-blue-200 text-xs mt-1">
                Connected Room: {roomName || roomId}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded"
          >
            ✕
          </button>
        </div>

        {/* Troubleshooting Panel */}
        <TroubleshootPanel />

        {/* Error Alert */}
        {interview.error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
            <div className="flex">
              <AlertCircle className="text-red-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-700 text-sm">{interview.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 p-6 m-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="mr-2" /> Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={interview.settings.apiKey}
                  onChange={(e) =>
                    interview.updateSettings({ apiKey: e.target.value })
                  }
                  placeholder="Enter your Gemini API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from Google AI Studio: https://aistudio.google.com
                </p>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={interview.settings.encryptionEnabled}
                  onChange={(e) =>
                    interview.updateSettings({ encryptionEnabled: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable end-to-end encryption for sensitive data
                </span>
              </label>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Recording Controls */}
        {!showResults && (
          <div className="p-6 space-y-4">
            {/* Recording Timer */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="text-blue-600" size={20} />
                <span className="text-4xl font-mono font-bold text-gray-800">
                  {formatTime(recorder.recordingTime)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {interview.isRecording ? 'Recording...' : 'Ready to record'}
              </p>
            </div>

            {/* Audio Level Visualizer */}
            {interview.isRecording && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Audio Level</span>
                </div>
                <div className="flex gap-1">
                  {getAudioLevelBars().map((filled, i) => (
                    <div
                      key={i}
                      className={`h-8 flex-1 rounded-sm transition-colors ${
                        filled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transcript Preview */}
            {interview.transcript && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Transcript Preview
                </p>
                <div className="bg-white p-3 rounded border border-gray-200 max-h-24 overflow-y-auto text-sm text-gray-600">
                  {interview.transcript}
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-3">
              {!interview.isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold"
                >
                  <Mic size={20} /> Start Recording
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 font-semibold"
                >
                  <Square size={20} /> Stop Recording
                </button>
              )}

              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Analyze Button */}
            {interview.transcript && !interview.isRecording && (
              <button
                onClick={handleAnalyze}
                disabled={interview.isAnalyzing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
              >
                <Play size={20} />
                {interview.isAnalyzing ? 'Analyzing...' : 'Analyze Interview'}
              </button>
            )}
          </div>
        )}

        {/* Results Display */}
        {showResults && interview.analysis && (
          <div className="p-6 space-y-6">
            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">Technical Proficiency</p>
                <p className="text-4xl font-bold text-blue-600">
                  {interview.analysis.technicalScore}
                </p>
                <p className="text-xs text-gray-500 mt-2">/100</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">Communication Quality</p>
                <p className="text-4xl font-bold text-green-600">
                  {interview.analysis.communicationScore}
                </p>
                <p className="text-xs text-gray-500 mt-2">/100</p>
              </div>
            </div>

            {/* Summary */}
            {interview.analysis.summary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {interview.analysis.summary}
                </p>
              </div>
            )}

            {/* Strengths */}
            {interview.analysis.strengths && interview.analysis.strengths.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" /> Key Strengths
                </h4>
                <ul className="space-y-2">
                  {interview.analysis.strengths.map((strength, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-600">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {interview.analysis.technicalGaps && interview.analysis.technicalGaps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} className="text-orange-600" /> Technical Gaps
                </h4>
                <ul className="space-y-2">
                  {interview.analysis.technicalGaps.map((gap, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-orange-600">!</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            {interview.analysis.recommendation && (
              <div
                className={`p-4 rounded-lg ${
                  interview.analysis.recommendation === 'hire'
                    ? 'bg-green-50 border-l-4 border-green-600'
                    : 'bg-yellow-50 border-l-4 border-yellow-600'
                }`}
              >
                <p className="text-sm font-semibold text-gray-700">Recommendation</p>
                <p
                  className={`text-lg font-bold mt-1 ${
                    interview.analysis.recommendation === 'hire'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {interview.analysis.recommendation.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-semibold"
              >
                <Download size={20} /> Download PDF Report
              </button>
              <button
                onClick={handleClear}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                New Recording
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewRecorder;
