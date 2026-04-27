import React, { useState, useEffect } from 'react';
import { useProximityDetection } from '../../hooks/useProximityDetection';
import { useUser } from '../../context/UserContext';
import { Camera, AlertCircle, CheckCircle, Eye } from 'lucide-react';

/**
 * ProximityStatusIndicator Component
 * 
 * Displays:
 * - Camera connection status
 * - Current distance from screen
 * - Alert when too close
 * - Distance unit indicator
 */
const ProximityStatusIndicator = () => {
  const { proximitySettings } = useUser();
  const [statusText, setStatusText] = useState('Initializing...');
  const [statusDot, setStatusDot] = useState('disabled');

  const { currentDistance, faceDetected, error, isSupported, distanceInCm } =
    useProximityDetection({
      distanceThreshold: proximitySettings.proximityThreshold,
      enabled: proximitySettings.proximityEnabled,
    });

  // Format distance based on unit setting
  const formatDistance = (distance) => {
    if (!distance) return '—';
    if (proximitySettings.distanceUnit === 'cm') {
      return `${distanceInCm}cm`;
    }
    return `${distance.toFixed(1)}ft`;
  };

  // Update status based on proximity state
  useEffect(() => {
    if (!isSupported || error) {
      setStatusDot('error');
      setStatusText('Camera unavailable');
      return;
    }

    if (!proximitySettings.proximityEnabled) {
      setStatusDot('disabled');
      setStatusText('Proximity off');
      return;
    }

    if (!faceDetected) {
      setStatusDot('no-face');
      setStatusText('No face detected');
      return;
    }

    if (!currentDistance) {
      setStatusDot('no-face');
      setStatusText('Detecting...');
      return;
    }

    if (currentDistance < proximitySettings.proximityThreshold) {
      setStatusDot('alert');
      setStatusText(`Too close (${formatDistance(currentDistance)})`);
    } else {
      setStatusDot('safe');
      setStatusText(`Safe (${formatDistance(currentDistance)})`);
    }
  }, [
    faceDetected,
    currentDistance,
    error,
    isSupported,
    proximitySettings.proximityEnabled,
    proximitySettings.proximityThreshold,
    proximitySettings.distanceUnit,
    distanceInCm,
  ]);

  return (
    <div className="proximity-status-indicator" title="Proximity Detection Status">
      <div className={`proximity-status-dot ${statusDot}`} />
      <div className={`proximity-status-text ${statusDot}`}>
        <span>{statusText}</span>
      </div>
    </div>
  );
};

export default ProximityStatusIndicator;
