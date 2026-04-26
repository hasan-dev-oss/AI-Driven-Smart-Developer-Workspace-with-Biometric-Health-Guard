import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to manage real-time system metrics.
 * Simulates realistic system load behavior to power the monitor.
 * Maintains a sliding window of the last 20 data points.
 * 
 * Includes Smart Throttling Awareness: tracks if CPU > 85% for >5s
 * 
 * @returns {Object} - { metrics: Array, isConnected: Boolean, error: String|null, isThrottled: Boolean }
 */
export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);
  const [isThrottled, setIsThrottled] = useState(false);
  
  const isMountedRef = useRef(true);
  const highCpuTicksRef = useRef(0);

  const MAX_DATA_POINTS = 20;
  const CPU_THRESHOLD = 85;
  const THROTTLE_TIME_SEC = 5;

  useEffect(() => {
    let currentCPU = 30;
    let currentMemory = 45;
    let spikeDurationCounter = 0; // Tracks consecutive seconds of forced high load

    const generateMetrics = () => {
      // 15% chance to trigger an 8-second sustained CPU spike (if not already spiking)
      if (spikeDurationCounter === 0 && Math.random() > 0.85) {
        spikeDurationCounter = 8; 
      }

      if (spikeDurationCounter > 0) {
        // Force CPU to stay in the 88% - 98% range during the spike!
        currentCPU = 93 + (Math.random() * 10 - 5);
        spikeDurationCounter--;
      } else {
        // Normal system fluctuation (idling around 20-60%)
        currentCPU = currentCPU + (Math.random() * 15 - 7);
        if (currentCPU > 65) currentCPU -= 10;
        if (currentCPU < 5) currentCPU += 5;
      }
      
      // Memory fluctuates gently regardless
      currentMemory = currentMemory + (Math.random() * 4 - 2);
      
      return {
        cpu: Math.max(0, Math.min(100, currentCPU)),
        memory: Math.max(0, Math.min(100, currentMemory)),
      };
    };

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;

      const data = generateMetrics();
      
      // Resource Allocation Awareness Logic
      if (data.cpu > CPU_THRESHOLD) {
        highCpuTicksRef.current += 1;
        if (highCpuTicksRef.current >= THROTTLE_TIME_SEC && !isThrottled) {
          setIsThrottled(true);
          console.warn(`⚠️ System Throttled: CPU usage sustained >${CPU_THRESHOLD}% for over ${THROTTLE_TIME_SEC} seconds.`);
        }
      } else {
        highCpuTicksRef.current = 0;
        if (isThrottled) setIsThrottled(false);
      }

      const newPoint = {
        cpu: data.cpu,
        memory: data.memory,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        id: Date.now()
      };

      // Ensure stable native state updates without 3rd-party lodash clashes
      setMetrics((prev) => {
        const nextMetrics = [...prev, newPoint];
        return nextMetrics.length > MAX_DATA_POINTS 
          ? nextMetrics.slice(-MAX_DATA_POINTS) 
          : nextMetrics;
      });

    }, 1000);

    return () => {
      // Cleanup interval and refs on unmount to prevent MEMORY LEAKS
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [isThrottled]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  return {
    metrics,
    isConnected,
    error,
    isThrottled,
    disconnect,
  };
};
