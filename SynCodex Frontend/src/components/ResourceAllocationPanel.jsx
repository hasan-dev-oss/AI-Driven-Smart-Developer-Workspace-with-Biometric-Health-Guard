import React, { useMemo, useState } from 'react';

const profiles = [
  {
    key: 'performance',
    title: 'Performance Focus',
    cpu: 82,
    memory: 72,
    description: 'Prioritize active session responsiveness and low latency for collaboration flows.',
    badge: 'High Priority',
  },
  {
    key: 'balanced',
    title: 'Balanced',
    cpu: 62,
    memory: 55,
    description: 'Balanced resource allocation for stable editing, video, and AI assistance.',
    badge: 'Recommended',
  },
  {
    key: 'eco',
    title: 'Eco Mode',
    cpu: 42,
    memory: 45,
    description: 'Conserve system resources while maintaining usable collaboration performance.',
    badge: 'Energy Saver',
  },
];

const ResourceAllocationPanel = ({ currentCPU, currentMem, isThrottled }) => {
  const [selectedProfile, setSelectedProfile] = useState('balanced');

  const profile = useMemo(
    () => profiles.find((item) => item.key === selectedProfile) || profiles[1],
    [selectedProfile]
  );

  const cpuHeadroom = Math.max(0, profile.cpu - currentCPU);
  const memoryHeadroom = Math.max(0, profile.memory - currentMem);

  return (
    <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 shadow-xl shadow-slate-900/40">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Resource Allocation</p>
          <h3 className="text-lg font-semibold text-gray-100">Smart Reservation Settings</h3>
          <p className="max-w-2xl text-sm text-slate-400">
            Allocate CPU and memory capacity for the current room session with a professional resource profile.
            Change modes to adapt to session load while keeping the collaboration experience stable.
          </p>
        </div>
        <span className="rounded-full border border-slate-700/80 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {isThrottled ? 'Throttled' : 'Live allocation'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {profiles.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSelectedProfile(item.key)}
            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
              selectedProfile === item.key
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                : 'border-slate-700/70 bg-slate-950/70 hover:border-slate-500 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-100">{item.title}</p>
                <p className="text-xs text-slate-400">{item.badge}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                {item.cpu}% CPU
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-400">{item.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reserved CPU Capacity</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-3xl font-semibold text-cyan-300">{profile.cpu}%</span>
            <span className="text-xs text-slate-400">soft reserve</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Headroom: {cpuHeadroom.toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reserved Memory Budget</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-3xl font-semibold text-violet-300">{profile.memory}%</span>
            <span className="text-xs text-slate-400">estimated</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Available reserve: {memoryHeadroom.toFixed(1)}%</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold text-gray-100">Session resource status</p>
        <p className="mt-2 text-sm text-slate-400">
          Current load: <span className="font-semibold text-gray-100">{currentCPU.toFixed(1)}%</span> CPU, <span className="font-semibold text-gray-100">{currentMem.toFixed(1)}%</span> Memory.
          {isThrottled && ' The engine has detected sustained high load and adjusted resource reservation automatically.'}
        </p>
      </div>
    </div>
  );
};

export default ResourceAllocationPanel;
