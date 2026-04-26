import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

const ROLLING_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const CALIBRATION_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

export const useKeystrokeTracker = (editorRef) => {
  const [flowState, setFlowState] = useState('calibrating'); // 'calibrating', 'flowing', 'normal', 'fatigue'
  const [baselineWPM, setBaselineWPM] = useState(null);
  const eventHistoryRef = useRef([]);
  const lastToastRef = useRef(0);

  const calculateMetrics = useCallback((events) => {
    if (events.length === 0) return { wpm: 0, errorRate: 0 };

    const totalChars = events.filter(e => e.type === 'input').length;
    const errors = events.filter(e => e.type === 'error').length;
    const timeInMinutes = ROLLING_WINDOW_MS / (1000 * 60);

    const wpm = (totalChars / 5) / timeInMinutes; // Approximate WPM (5 chars per word)
    const errorRate = totalChars > 0 ? (errors / totalChars) * 100 : 0; // Percentage

    return { wpm, errorRate };
  }, []);

  const updateFlowState = useCallback(() => {
    const now = Date.now();
    const sessionStart = eventHistoryRef.current[0]?.timestamp || now;
    const sessionDuration = now - sessionStart;

    if (sessionDuration < CALIBRATION_PERIOD_MS) {
      setFlowState('calibrating');
      return;
    }

    if (!baselineWPM) {
      const calibrationEvents = eventHistoryRef.current.filter(e => e.timestamp <= sessionStart + CALIBRATION_PERIOD_MS);
      const { wpm } = calculateMetrics(calibrationEvents);
      setBaselineWPM(wpm);
      return;
    }

    const { wpm, errorRate } = calculateMetrics(eventHistoryRef.current);

    if (wpm < baselineWPM * 0.6 || errorRate > 20) {
      setFlowState('fatigue');
      if (now - lastToastRef.current > 5 * 60 * 1000) { // Toast every 5 minutes max
        toast.info("You've been coding intensely. Time for a quick stretch?", {
          autoClose: 5000,
          position: "bottom-right",
          style: { animation: 'slideIn 0.5s ease-out' }
        });
        lastToastRef.current = now;
      }
    } else if (wpm >= baselineWPM && errorRate <= 10) {
      setFlowState('flowing');
    } else {
      setFlowState('normal');
    }
  }, [baselineWPM, calculateMetrics]);

  useEffect(() => {
    if (!editorRef?.current) return;

    const editor = editorRef.current;
    const disposable = editor.onKeyDown((e) => {
      const key = e.browserEvent.key;
      const timestamp = Date.now();
      let type = 'input';

      if (key === 'Backspace' || key === 'Delete') {
        type = 'error';
      }

      eventHistoryRef.current.push({ timestamp, key, type });

      // Clean up old events
      const cutoff = timestamp - ROLLING_WINDOW_MS;
      eventHistoryRef.current = eventHistoryRef.current.filter(e => e.timestamp >= cutoff);

      updateFlowState();
    });

    return () => {
      disposable.dispose();
    };
  }, [editorRef, updateFlowState]);

  // Periodic update
  useEffect(() => {
    const interval = setInterval(updateFlowState, 1000);
    return () => clearInterval(interval);
  }, [updateFlowState]);

  return {
    flowState,
  };
};