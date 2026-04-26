import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';

const DEFAULT_SETTINGS = {
  eyeStrainInterval: 20, // minutes
  pomodoroFocusDuration: 25, // minutes
  hydrationInterval: 60, // minutes
  enableEyeStrain: true,
  enablePomodoro: true,
  enableHydration: true,
  soundEnabled: false,
};

const STORAGE_KEY = 'syncodex_health_settings';
const LAST_BREAK_KEY = 'syncodex_last_break_time';

export const useHealthTracker = (editorRef) => {
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  const [timers, setTimers] = useState({
    eyeStrain: settings.eyeStrainInterval * 60,
    pomodoro: settings.pomodoroFocusDuration * 60,
    hydration: settings.hydrationInterval * 60,
  });

  const [activityCount, setActivityCount] = useState(0);
  const [isActivityDetected, setIsActivityDetected] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState({});

  const activityTimeoutRef = useRef(null);
  const timersIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  }, []);

  // Track keyboard and mouse activity
  const trackActivity = useCallback(() => {
    setActivityCount(prev => prev + 1);
    lastActivityRef.current = Date.now();
    setIsActivityDetected(true);

    if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    activityTimeoutRef.current = setTimeout(() => {
      setIsActivityDetected(false);
    }, 30000); // 30 seconds of inactivity
  }, []);

  // Attach activity listeners
  useEffect(() => {
    if (!editorRef?.current) return;

    const editor = editorRef.current;
    
    const keydownListener = (e) => {
      trackActivity();
    };

    const disposable = editor.onKeyDown(keydownListener);

    return () => {
      disposable.dispose();
      if (activityTimeoutRef.current) clearTimeout(activityTimeoutRef.current);
    };
  }, [editorRef, trackActivity]);

  // Timer tick logic
  useEffect(() => {
    timersIntervalRef.current = setInterval(() => {
      setTimers(prev => {
        const now = Date.now();
        const updated = { ...prev };

        // Eye Strain Timer
        if (settings.enableEyeStrain && updated.eyeStrain > 0) {
          updated.eyeStrain -= 1;
          if (updated.eyeStrain === 0) {
            const snoozedUntilTime = snoozedUntil.eyeStrain || 0;
            if (now >= snoozedUntilTime) {
              toast.warning('👁️ Time for eye care! Look away for 20 seconds.', {
                autoClose: 6000,
                position: 'bottom-right',
              });
              if (settings.soundEnabled) playSubtleSound();
            }
            updated.eyeStrain = settings.eyeStrainInterval * 60;
          }
        }

        // Hydration Timer
        if (settings.enableHydration && updated.hydration > 0) {
          updated.hydration -= 1;
          if (updated.hydration === 0) {
            const snoozedUntilTime = snoozedUntil.hydration || 0;
            if (now >= snoozedUntilTime) {
              toast.info('💧 Time to hydrate! Grab a glass of water.', {
                autoClose: 6000,
                position: 'bottom-right',
              });
              if (settings.soundEnabled) playSubtleSound();
            }
            updated.hydration = settings.hydrationInterval * 60;
          }
        }

        // Activity-aware Pomodoro
        if (settings.enablePomodoro && isActivityDetected && updated.pomodoro > 0) {
          updated.pomodoro -= 1;
          if (updated.pomodoro === 0) {
            const snoozedUntilTime = snoozedUntil.pomodoro || 0;
            if (now >= snoozedUntilTime && activityCount > 10) {
              // Only prompt if significant activity detected
              toast.success('🍅 Focus session complete! Time for a 5-minute break.', {
                autoClose: 6000,
                position: 'bottom-right',
              });
              if (settings.soundEnabled) playSubtleSound();
              localStorage.setItem(LAST_BREAK_KEY, now.toString());
            }
            updated.pomodoro = settings.pomodoroFocusDuration * 60;
            setActivityCount(0);
          }
        }

        return updated;
      });
    }, 1000);

    return () => {
      if (timersIntervalRef.current) clearInterval(timersIntervalRef.current);
    };
  }, [settings, isActivityDetected, snoozedUntil, activityCount]);

  // Snooze function
  const snooze = useCallback((timerType, minutes = 5) => {
    const snoozedUntilTime = Date.now() + minutes * 60 * 1000;
    setSnoozedUntil(prev => ({
      ...prev,
      [timerType]: snoozedUntilTime,
    }));
    toast.info(`⏸️ ${timerType} snoozed for ${minutes} minutes.`, {
      autoClose: 3000,
      position: 'bottom-right',
    });
  }, []);

  // Helper to play subtle sound
  const playSubtleSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.1, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio context not available');
    }
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return {
    settings,
    updateSettings,
    timers,
    isActivityDetected,
    activityCount,
    snooze,
    formatTime,
  };
};
