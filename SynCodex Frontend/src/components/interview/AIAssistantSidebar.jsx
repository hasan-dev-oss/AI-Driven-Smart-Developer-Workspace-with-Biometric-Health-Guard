import React, { useEffect, useRef, useState } from "react";
import AudioCaptureService from "../../services/AudioCaptureService";
import InterviewAnalysisService from "../../services/InterviewAnalysisService";
import PDFReportGenerator from "../../services/PDFReportGenerator";
import { useInterview } from "../../context/InterviewContext";

const QUICK_TAGS = [
  "Strong Logic",
  "Debug Skills",
  "Clear Communication",
  "Needs Guidance",
  "Good Problem Solving",
];

const AIAssistantSidebar = ({ mediaStream, roomId, open = true, onToggle }) => {
  const { settings } = useInterview();
  const apiKey = settings?.apiKey || null;

  const audioServiceRef = useRef(null);
  const analysisServiceRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partialTranscripts, setPartialTranscripts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    analysisServiceRef.current = new InterviewAnalysisService(apiKey);
    return () => {
      analysisServiceRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    return () => {
      // cleanup
      stopRecording();
      audioServiceRef.current?.cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChunk = async (chunk) => {
    // chunk: { audio: base64, timestamp, duration, final }
    try {
      if (!analysisServiceRef.current || !chunk?.audio) return;
      if (chunk.final) return; // skip final merged chunk (we stream per-chunk)
      const chunkText = await analysisServiceRef.current.analyzeAudioChunk(chunk.audio);
      if (chunkText) {
        setPartialTranscripts((p) => [...p, { text: chunkText, timestamp: chunk.timestamp }]);
        setTranscript((t) => (t ? t + "\n" + chunkText : chunkText));
      }
    } catch (err) {
      console.error("Chunk analysis failed", err);
      setError(err.message || "Chunk analysis failed");
    }
  };

  const startRecording = async () => {
    setError(null);
    if (!mediaStream) {
      setError("No active media stream. Please join the interview room first.");
      return;
    }

    try {
      audioServiceRef.current = new AudioCaptureService(handleChunk, (e) => setError(e));
      const ok = await audioServiceRef.current.initialize(mediaStream);
      if (!ok) throw new Error("Failed to initialize audio capture");
      audioServiceRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      setError(err.message || "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!audioServiceRef.current) return;
    try {
      await audioServiceRef.current.stop();
      setIsRecording(false);
      if (analysisServiceRef.current && transcript) {
        const result = await analysisServiceRef.current.summarizeTranscript(transcript);
        setSummary(result);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
      setError(err.message || "Failed to stop recording");
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const addTag = (label) => {
    const ts = Date.now();
    setTags((t) => [...t, { label, ts }]);
  };

  const downloadPDF = async () => {
    try {
      const gen = new PDFReportGenerator();
      const metadata = {
        roomId,
        date: new Date().toISOString(),
        tags,
      };
      const analysisData = summary || { transcript, partials: partialTranscripts };
      const blob = await gen.generateReport(analysisData, metadata);
      gen.downloadReport(blob, `interview_${new Date().toISOString()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      setError(err.message || "PDF generation failed");
    }
  };

  return (
    <aside
      className={`flex flex-col h-full bg-gray-800 text-white border-l border-gray-700 shadow-lg transition-all duration-200 ${open ? 'w-80 p-4' : 'w-0 p-0 hidden'}`}
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <span className="text-xs text-gray-400">Interview Room</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            className={`text-sm px-3 py-1 rounded-md font-medium text-white ${isRecording ? 'bg-red-600' : 'bg-green-600'}`}>
            {isRecording ? 'Stop' : 'Record'}
          </button>
          <button
            onClick={() => onToggle?.()}
            className="text-sm px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600">
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <section className="mb-3">
          <div className="text-sm font-medium mb-2">Quick Tags</div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => addTag(t)}
                className="text-sm px-2 py-1 bg-indigo-600 rounded-md text-white hover:opacity-90">
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-3">
          <div className="text-sm font-medium mb-1">Tags</div>
          <div className="max-h-28 overflow-auto text-sm text-gray-200 mb-2">
            {tags.length === 0 && <div className="text-xs text-gray-400">No tags yet</div>}
            {tags.map((tg, i) => (
              <div key={i} className="mb-1">{tg.label} — <span className="text-gray-300">{new Date(tg.ts).toLocaleTimeString()}</span></div>
            ))}
          </div>
        </section>

        <section className="mb-3">
          <div className="text-sm font-medium mb-1">Transcript (live)</div>
          <textarea readOnly value={transcript} className="w-full bg-gray-900 p-2 rounded-md text-sm h-28 resize-none" />
        </section>

        <section className="mb-3">
          <div className="text-sm font-medium mb-1">Summary</div>
          <div className="bg-gray-900 p-3 rounded-md h-28 overflow-auto text-sm text-gray-100">{summary ? <pre className="whitespace-pre-wrap">{JSON.stringify(summary, null, 2)}</pre> : <div className="text-gray-400">No summary yet</div>}</div>
        </section>
      </div>

      <div className="mt-3">
        <button onClick={downloadPDF} className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium">Download PDF</button>
        {error && <div className="mt-2 text-red-500 text-xs">{error}</div>}
      </div>
    </aside>
  );
};

export default AIAssistantSidebar;
