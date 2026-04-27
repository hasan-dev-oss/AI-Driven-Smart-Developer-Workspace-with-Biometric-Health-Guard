import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useProximityDetection } from '../../hooks/useProximityDetection';
import { useUser } from '../../context/UserContext';

/**
 * ProximityDetectionProvider Component
 * 
 * Wraps editor pages and manages:
 * - Face detection lifecycle
 * - Blur state management
 * - Alert triggering
 * - Settings integration
 */
const ProximityDetectionProvider = ({ children, containerRef }) => {
  const { proximitySettings } = useUser();
  const [isBlurred, setIsBlurred] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [lastAlertDistance, setLastAlertDistance] = useState(null);
  const alertTimeoutRef = useRef(null);

  const handleProximityAlert = useCallback(
    ({ distance, threshold }) => {
      setIsBlurred(true);
      setLastAlertDistance(distance);
      setShowAlert(true);

      // Auto-dismiss alert after 5 seconds
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      alertTimeoutRef.current = setTimeout(() => {
        setShowAlert(false);
      }, 5000);
    },
    []
  );

  const handleDistanceChange = useCallback(
    (distance) => {
      // Only blur if distance is LESS than threshold
      if (distance < proximitySettings.proximityThreshold) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    },
    [proximitySettings.proximityThreshold]
  );

  // Proximity detection hook
  const { currentDistance, faceDetected, error, isSupported, videoRef, distanceInCm } =
    useProximityDetection({
      distanceThreshold: proximitySettings.proximityThreshold,
      onProximityAlert: handleProximityAlert,
      onDistanceChange: handleDistanceChange,
      enabled: proximitySettings.proximityEnabled,
    });

  // Apply blur class to container
  useEffect(() => {
    if (!containerRef?.current) return;

    if (isBlurred && proximitySettings.proximityEnabled) {
      containerRef.current.classList.add('screen-blur');
    } else {
      containerRef.current.classList.remove('screen-blur');
    }

    return () => {
      if (containerRef?.current) {
        containerRef.current.classList.remove('screen-blur');
      }
    };
  }, [isBlurred, proximitySettings.proximityEnabled, containerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (containerRef?.current) {
        containerRef.current.classList.remove('screen-blur');
      }
    };
  }, [containerRef]);

  return (
    <>
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        className="proximity-camera-video"
        muted
        playsInline
        width="640"
        height="480"
      />

      {/* Render children with proximity context */}
      {children}
    </>
  );
};

export default ProximityDetectionProvider;
