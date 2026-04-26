import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/**
 * PerformanceMonitor Component
 * 
 * A professional real-time system resource monitor with:
 * - Live CPU and Memory metrics visualization
 * - Dynamic alert system for critical CPU usage (>90%)
 * - Sliding window of last 20 data points
 * - Dark-themed UI optimized for IDE integration
 * - Performance optimized with React.memo and memoized computations
 */
const PerformanceMonitorComponent = ({ metrics = [], isConnected = true, error = null, isThrottled = false }) => {
  const [alertActive, setAlertActive] = useState(false);
  const [cpuPeakValue, setCpuPeakValue] = useState(0);

  // Memoized alert logic - only recalculate when metrics change
  const { isCritical, strokeColor, statusIndicator } = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return {
        isCritical: false,
        strokeColor: '#06B6D4', // cyan
        statusIndicator: 'NORMAL',
      };
    }

    // Check latest CPU value to set thresholds
    const latestCPU = metrics[metrics.length - 1].cpu;
    const isCrit = latestCPU > 85;
    const isHigh = latestCPU > 70 && latestCPU <= 85;

    let color = '#06B6D4'; // cyan
    let statusText = 'NORMAL';

    if (isCrit) {
      color = '#EF4444'; // Red
      statusText = 'CRITICAL';
    } else if (isHigh) {
      color = '#EAB308'; // Yellow
      statusText = 'HIGH LOAD';
    }

    return {
      isCritical: isCrit,
      strokeColor: color,
      statusIndicator: statusText,
    };
  }, [metrics]);

  // Track peak CPU value
  useEffect(() => {
    if (metrics.length > 0) {
      const latestCPU = metrics[metrics.length - 1].cpu;
      if (latestCPU > cpuPeakValue) {
        setCpuPeakValue(latestCPU);
      }
    }
  }, [metrics, cpuPeakValue]);

  // Trigger alert effect
  useEffect(() => {
    setAlertActive(isCritical);
  }, [isCritical]);

  // Memoized current metrics display
  const currentMetrics = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return { cpu: 0, memory: 0 };
    }
    const latest = metrics[metrics.length - 1];
    return { cpu: latest.cpu, memory: latest.memory };
  }, [metrics]);

  // Custom tooltip for better readability
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 shadow-lg">
          <p className="text-gray-300 text-sm">
            <span className="text-cyan-400 font-semibold">{payload[0].payload.timestamp}</span>
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: <span className="font-semibold">{entry.value.toFixed(1)}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 🚨🚨🚨 DEBUG INJECTION: MOUNT CHECK 🚨🚨🚨
  useEffect(() => {
    console.log("🛠️ [PerformanceMonitor] COMPONENT MOUNTED SUCCESSFULLY!");
    return () => console.log("⚠️ [PerformanceMonitor] COMPONENT UNMOUNTED!");
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                statusIndicator === 'CRITICAL' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'
              }`}
            />
            {statusIndicator === 'CRITICAL' && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-pulse opacity-50" />
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-100">System Monitor (DEBUG)</h2>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          {/* Smart Throttling Badge */}
          {isThrottled && (
            <div className="px-3 py-1 rounded-full text-xs font-bold bg-orange-900/60 text-orange-400 border border-orange-700/50 shadow-md animate-pulse">
              SYSTEM THROTTLED
            </div>
          )}

          <div
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
              statusIndicator === 'CRITICAL'
                ? 'bg-red-900/40 text-red-300 border border-red-700/50 shadow-red-500/20 shadow-md'
                : statusIndicator === 'HIGH LOAD'
                ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50'
                : 'bg-green-900/40 text-green-300 border border-green-700/50'
            }`}
          >
            {statusIndicator}
          </div>

          {/* Connection Status */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-blue-400' : 'bg-gray-600'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>

      {/* Metrics Display */}
      <div className="flex gap-8 px-6 py-3 bg-gray-900/30 border-b border-gray-800">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">CPU</span>
          <span className={`text-2xl font-bold`} style={{ color: strokeColor }}>
            {currentMetrics.cpu.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Memory</span>
          <span className="text-2xl font-bold text-purple-400">
            {currentMetrics.memory.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Peak CPU</span>
          <span className="text-2xl font-bold text-yellow-400">
            {cpuPeakValue.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 px-6 py-4 min-h-0" style={{ height: "100%", width: "100%" }}>
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {metrics.length === 0 && !error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">Waiting for metrics...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                stroke="#6B7280"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={{ stroke: '#4B5563' }}
                style={{ fontSize: '12px' }}
              />

              <YAxis
                stroke="#6B7280"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={{ stroke: '#4B5563' }}
                label={{
                  value: 'Percentage (%)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  fontSize: 12,
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                wrapperStyle={{ paddingTop: '15px' }}
                iconType="line"
                formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />

              <Line
                type="monotone"
                dataKey="cpu"
                stroke={strokeColor}
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
                animationDuration={300}
                fill="url(#cpuGradient)"
                name="CPU Usage"
                connectNulls
              />

              <Line
                type="monotone"
                dataKey="memory"
                stroke="#A78BFA"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={300}
                fill="url(#memoryGradient)"
                name="Memory Usage"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Alert Animation */}
      {alertActive && (
        <div className="absolute inset-0 pointer-events-none border-2 border-red-500/50 rounded-lg animate-pulse" />
      )}
    </div>
  );
};

// Export with React.memo to prevent unnecessary re-renders
export const PerformanceMonitor = React.memo(PerformanceMonitorComponent);

export default PerformanceMonitor;
