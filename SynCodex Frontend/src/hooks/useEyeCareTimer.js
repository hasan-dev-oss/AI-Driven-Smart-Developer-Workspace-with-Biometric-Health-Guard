import { useState, useEffect, useCallback } from 'react';

const DEFAULT_WORK_INTERVAL = 20; // 20 minutes

export const useEyeCareTimer = () => {
  // Initialize settings from localStorage or use defaults
  const [workInterval, setWorkInterval] = useState(() => {
    const saved = localStorage.getItem('eyeCareWorkInterval');
    return saved ? parseInt(saved, 10) : DEFAULT_WORK_INTERVAL;
  });

  const [timeLeft, setTimeLeft] = useState(workInterval * 60);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Persist settings whenever config changes
  useEffect(() => {
    localStorage.setItem('eyeCareWorkInterval', workInterval.toString());
  }, [workInterval]);

  // Handle countdown logic
  useEffect(() => {
    if (!isTimerRunning || isBreakMode) return;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setIsBreakMode(true);
          return 0; // Trigger break mode
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isTimerRunning, isBreakMode]);

  // Update timeLeft when the interval is changed (resets timer)
  useEffect(() => {
    if (!isDemoMode) {
      setTimeLeft(workInterval * 60);
    }
  }, [workInterval, isDemoMode]);

  const resumeCoding = useCallback(() => {
    setIsBreakMode(false);
    setTimeLeft(isDemoMode ? 2 : workInterval * 60);
    setIsTimerRunning(true);
  }, [workInterval, isDemoMode]);

  const setDemoMode = useCallback((isDemo) => {
    setIsDemoMode(isDemo);
    if (isDemo) {
      setTimeLeft(2); // Instantly set to 2 seconds for demo
    } else {
      setTimeLeft(workInterval * 60);
    }
  }, [workInterval]);

  const updateWorkInterval = useCallback((minutes) => {
    setWorkInterval(minutes);
  }, []);

  // Format time for display (e.g. 20:00)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    formattedTimeLeft: formatTime(timeLeft),
    isBreakMode,
    workInterval,
    resumeCoding,
    updateWorkInterval,
    setDemoMode,
    isDemoMode
  };
};

export default useEyeCareTimer;
