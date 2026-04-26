import React, { useState } from 'react';
import { Eye, Clock, Droplet, Settings, X } from 'lucide-react';
import './HealthDashboard.css';

const HealthDashboard = ({ healthData, isOpen, onClose }) => {
  const { settings, updateSettings, timers, snooze, formatTime } = healthData;
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingChange = (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    updateSettings(updatedSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="health-dashboard-overlay" onClick={onClose}>
      <div className="health-dashboard-panel" onClick={e => e.stopPropagation()}>
        <div className="health-header">
          <h2>Health & Wellbeing</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!showSettings ? (
          <>
            {/* Eye Strain Guard */}
            <div className="health-item">
              <div className="health-item-header">
                <Eye size={18} className="health-icon eye" />
                <span>Eye Strain Guard (20-20-20)</span>
              </div>
              <div className="health-item-content">
                <div className="timer-display">{formatTime(timers.eyeStrain)}</div>
                <div className="health-controls">
                  <button
                    className="toggle-btn"
                    onClick={() => handleSettingChange('enableEyeStrain', !settings.enableEyeStrain)}
                  >
                    {settings.enableEyeStrain ? '✓ Enabled' : 'Disabled'}
                  </button>
                  <button className="snooze-btn" onClick={() => snooze('eyeStrain')}>
                    Snooze 5m
                  </button>
                </div>
              </div>
            </div>

            {/* Activity-aware Pomodoro */}
            <div className="health-item">
              <div className="health-item-header">
                <Clock size={18} className="health-icon pomodoro" />
                <span>Pomodoro Timer</span>
              </div>
              <div className="health-item-content">
                <div className="timer-display">{formatTime(timers.pomodoro)}</div>
                <div className="health-controls">
                  <button
                    className="toggle-btn"
                    onClick={() => handleSettingChange('enablePomodoro', !settings.enablePomodoro)}
                  >
                    {settings.enablePomodoro ? '✓ Enabled' : 'Disabled'}
                  </button>
                  <button className="snooze-btn" onClick={() => snooze('pomodoro')}>
                    Snooze 5m
                  </button>
                </div>
              </div>
            </div>

            {/* Hydration Reminder */}
            <div className="health-item">
              <div className="health-item-header">
                <Droplet size={18} className="health-icon hydration" />
                <span>Hydration Reminder</span>
              </div>
              <div className="health-item-content">
                <div className="timer-display">{formatTime(timers.hydration)}</div>
                <div className="health-controls">
                  <button
                    className="toggle-btn"
                    onClick={() => handleSettingChange('enableHydration', !settings.enableHydration)}
                  >
                    {settings.enableHydration ? '✓ Enabled' : 'Disabled'}
                  </button>
                  <button className="snooze-btn" onClick={() => snooze('hydration')}>
                    Snooze 5m
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Button */}
            <button className="settings-btn" onClick={() => setShowSettings(true)}>
              <Settings size={16} /> Configure Timers
            </button>
          </>
        ) : (
          <>
            <h3>Timer Settings</h3>
            
            <div className="setting-group">
              <label>Eye Strain Check Interval (minutes)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={settings.eyeStrainInterval}
                onChange={(e) => handleSettingChange('eyeStrainInterval', parseInt(e.target.value))}
                className="setting-input"
              />
            </div>

            <div className="setting-group">
              <label>Pomodoro Focus Duration (minutes)</label>
              <input
                type="number"
                min="15"
                max="60"
                value={settings.pomodoroFocusDuration}
                onChange={(e) => handleSettingChange('pomodoroFocusDuration', parseInt(e.target.value))}
                className="setting-input"
              />
            </div>

            <div className="setting-group">
              <label>Hydration Interval (minutes)</label>
              <input
                type="number"
                min="30"
                max="120"
                value={settings.hydrationInterval}
                onChange={(e) => handleSettingChange('hydrationInterval', parseInt(e.target.value))}
                className="setting-input"
              />
            </div>

            <div className="setting-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                />
                Enable sound notifications
              </label>
            </div>

            <button className="back-btn" onClick={() => setShowSettings(false)}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HealthDashboard;
