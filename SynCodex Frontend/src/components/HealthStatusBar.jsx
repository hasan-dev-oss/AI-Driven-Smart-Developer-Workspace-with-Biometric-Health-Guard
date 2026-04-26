import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import HealthDashboard from './HealthDashboard';
import './HealthStatusBar.css';

const HealthStatusBar = ({ healthData }) => {
  const [isHealthPanelOpen, setIsHealthPanelOpen] = useState(false);
  const { timers } = healthData;

  const getHealthStatus = () => {
    const eyeStrainLow = timers.eyeStrain < 60;
    const hydrationLow = timers.hydration < 60;
    const pomodoroComplete = timers.pomodoro < 30;

    if (eyeStrainLow || hydrationLow) {
      return 'warning';
    }
    if (pomodoroComplete) {
      return 'break-time';
    }
    return 'healthy';
  };

  const status = getHealthStatus();
  const statusColors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    'break-time': 'text-red-400',
  };

  return (
    <>
      <button
        className={`health-status-btn ${statusColors[status]}`}
        onClick={() => setIsHealthPanelOpen(!isHealthPanelOpen)}
        title="Health & Wellbeing"
        aria-label="Open Health Dashboard"
      >
        <Heart size={18} fill="currentColor" />
      </button>

      <HealthDashboard
        healthData={healthData}
        isOpen={isHealthPanelOpen}
        onClose={() => setIsHealthPanelOpen(false)}
      />
    </>
  );
};

export default HealthStatusBar;
