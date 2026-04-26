import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

const ROLLING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const CALIBRATION_PERIOD_MS = 10 * 60 * 1000; // 10 minutes

export const useFlowTracker = (editorRef) => {
  const [flowState, setFlowState] = useState('calibrating'); // 'calibrating', 'flow', 'normal', 'fatigue'
  const [baselineCPM, setBaselineCPM] = useState(null);
  const [baselineErrorRate, setBaselineErrorRate] = useState(null);
  const eventHistoryRef = useRef([]);
  const calibrationDataRef = useRef([]);
  const lastToastRef = useRef(0);

  const calculateMetrics = useCallback((events) => {
    if (events.length === 0) return { cpm: 0, errorRate: 0 };

    const now = Date.now();
    const windowStart = now - ROLLING_WINDOW_MS;
    const windowEvents = events.filter(e => e.timestamp >= windowStart);

    const totalChars = windowEvents.filter(e => e.type === 'input').length;
    const errors = windowEvents.filter(e => e.type === 'error').length;
    const timeInMinutes = ROLLING_WINDOW_MS / (1000 * 60);

    const cpm = totalChars / timeInMinutes;
    const errorRate = totalChars > 0 ? errors / totalChars : 0;

    return { cpm, errorRate };
  }, []);

  const updateFlowState = useCallback(() => {
    const now = Date.now();
    const sessionStart = eventHistoryRef.current[0]?.timestamp || now;
    const sessionDuration = now - sessionStart;

    if (sessionDuration < CALIBRATION_PERIOD_MS) {
      // Still calibrating
      setFlowState('calibrating');
      return;
    }

    if (!baselineCPM) {
      // Calculate baseline from first 10 minutes
      const calibrationEvents = eventHistoryRef.current.filter(e => e.timestamp <= sessionStart + CALIBRATION_PERIOD_MS);
      const { cpm, errorRate } = calculateMetrics(calibrationEvents);
      setBaselineCPM(cpm);
      setBaselineErrorRate(errorRate);
      return;
    }

    const { cpm, errorRate } = calculateMetrics(eventHistoryRef.current);

    if (cpm < baselineCPM * 0.7 && errorRate > baselineErrorRate * 1.2) {
      setFlowState('fatigue');
      if (now - lastToastRef.current > 5 * 60 * 1000) { // Toast every 5 minutes max
        toast.info("You've been coding intensely. Time for a quick stretch?", { autoClose: 5000 });
        lastToastRef.current = now;
      }
    } else if (cpm >= baselineCPM && errorRate <= baselineErrorRate * 1.1) {
      setFlowState('flow');
    } else {
      setFlowState('normal');
    }
  }, [baselineCPM, baselineErrorRate, calculateMetrics]);

  const handleKeyDown = useCallback((e) => {
    const key = e.key;
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
  }, [updateFlowState]);

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

  const getStatusIcon = () => {
    switch (flowState) {
      case 'flow': return '🟢 Deep Flow';
      case 'normal': return '🟡 Normal';
      case 'fatigue': return '🔴 Fatigue Detected';
      default: return '⏳ Calibrating';
    }
  };

  return {
    flowState,
    statusIcon: getStatusIcon(),
    baselineCPM,
    baselineErrorRate,
  };
};