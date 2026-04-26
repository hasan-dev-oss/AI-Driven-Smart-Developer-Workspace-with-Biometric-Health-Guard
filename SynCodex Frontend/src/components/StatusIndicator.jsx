import React from 'react';

const StatusIndicator = ({ flowState }) => {
  const getStatusDisplay = () => {
    switch (flowState) {
      case 'flowing':
        return { text: 'Flowing', color: 'text-green-400', icon: '🟢' };
      case 'normal':
        return { text: 'Normal', color: 'text-yellow-400', icon: '🟡' };
      case 'fatigue':
        return { text: 'Take a Break', color: 'text-red-400', icon: '🔴' };
      default:
        return { text: 'Calibrating', color: 'text-gray-400', icon: '⏳' };
    }
  };

  const { text, color, icon } = getStatusDisplay();

  return (
    <div className={`flex items-center space-x-2 text-sm ${color}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
};

export default StatusIndicator;