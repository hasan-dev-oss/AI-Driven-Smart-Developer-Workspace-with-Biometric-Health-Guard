import React from 'react';
import { useUser } from '../../context/UserContext';
import { Eye, Volume2 } from 'lucide-react';

/**
 * ProximitySettings Component
 * 
 * Allows users to configure:
 * - Enable/disable proximity detection
 * - Set comfortable working distance threshold
 * - Toggle between feet and centimeters
 * - View current settings
 */
const ProximitySettings = () => {
  const {
    proximitySettings,
    updateProximityThreshold,
    toggleProximity,
    setDistanceUnit,
  } = useUser();

  const handleThresholdChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      updateProximityThreshold(value);
    }
  };

  const handleUnitToggle = () => {
    setDistanceUnit(proximitySettings.distanceUnit === 'feet' ? 'cm' : 'feet');
  };

  const convertedThreshold =
    proximitySettings.distanceUnit === 'cm'
      ? Math.round(proximitySettings.proximityThreshold * 30.48)
      : proximitySettings.proximityThreshold;

  return (
    <div className="proximity-settings">
      {/* Header */}
      <div className="proximity-settings-group">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#94FFF2]" />
          <h3 className="text-base font-semibold text-white">Proximity Detection</h3>
        </div>
        <p className="proximity-settings-description">
          Uses your webcam to detect how close you are to the screen and blurs the interface if you get too close.
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="proximity-settings-group">
        <div className="proximity-settings-row">
          <label className="proximity-settings-label">Enable Proximity Detection</label>
          <button
            onClick={toggleProximity}
            className={`proximity-toggle ${proximitySettings.proximityEnabled ? 'active' : ''}`}
          >
            <div className="proximity-toggle-switch">
              <div className="proximity-toggle-knob" />
            </div>
          </button>
        </div>
      </div>

      {/* Distance Threshold Slider */}
      {proximitySettings.proximityEnabled && (
        <>
          <div className="proximity-settings-group">
            <div className="proximity-settings-row">
              <label className="proximity-settings-label">Comfortable Working Distance</label>
              <span className="proximity-distance text-[#94FFF2]">
                {convertedThreshold}{proximitySettings.distanceUnit === 'cm' ? 'cm' : 'ft'}
              </span>
            </div>
            <p className="proximity-settings-description">
              Set how close you want to be to the screen before the blur effect activates.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={proximitySettings.distanceUnit === 'cm' ? '15' : '0.5'}
                max={proximitySettings.distanceUnit === 'cm' ? '300' : '10'}
                step={proximitySettings.distanceUnit === 'cm' ? '15' : '0.1'}
                value={convertedThreshold}
                onChange={handleThresholdChange}
                className="proximity-slider flex-1"
              />
              <button
                onClick={handleUnitToggle}
                className="proximity-input min-w-max text-center"
                title="Toggle unit"
              >
                {proximitySettings.distanceUnit === 'cm' ? 'cm' : 'ft'}
              </button>
            </div>
          </div>

          {/* Input Field Alternative */}
          <div className="proximity-settings-group">
            <label className="proximity-settings-label">Direct Input</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={proximitySettings.distanceUnit === 'cm' ? '15' : '0.5'}
                max={proximitySettings.distanceUnit === 'cm' ? '300' : '10'}
                step={proximitySettings.distanceUnit === 'cm' ? '5' : '0.1'}
                value={convertedThreshold}
                onChange={handleThresholdChange}
                className="proximity-input flex-1"
              />
              <span className="text-[#94FFF2] text-sm font-medium">
                {proximitySettings.distanceUnit === 'cm' ? 'cm' : 'ft'}
              </span>
            </div>
          </div>

          {/* Info Box */}
          <div className="proximity-settings-group">
            <div className="bg-[#3D415A]/30 border border-[#506DFF]/20 rounded-4px p-3">
              <p className="text-11px text-[#999] line-height-1.5">
                💡 <strong>Tip:</strong> The blur effect helps establish a healthy working distance. Keep your eyes at least 20 inches from your screen!
              </p>
            </div>
          </div>
        </>
      )}

      {/* Disabled State Info */}
      {!proximitySettings.proximityEnabled && (
        <div className="bg-[#3D415A]/30 border border-[#506DFF]/20 rounded-4px p-3">
          <p className="text-11px text-[#999] line-height-1.5">
            🎥 Enable proximity detection to start monitoring your working distance from the screen.
          </p>
        </div>
      )}

      {/* Requirements */}
      <div className="proximity-settings-group">
        <p className="proximity-settings-label">Requirements</p>
        <ul className="text-11px text-[#999] space-y-1">
          <li>✓ Webcam enabled and accessible</li>
          <li>✓ Good lighting for face detection</li>
          <li>✓ Face clearly visible to camera</li>
        </ul>
      </div>
    </div>
  );
};

export default ProximitySettings;
