import { useEffect, useRef, useState } from 'react';

const FACE_WIDTH_BASELINE = 100; // pixels - average face width at 2 feet
const DISTANCE_BASELINE = 2; // feet - baseline distance
const PIXEL_TO_FEET = 0.0104; // conversion factor (approximate)

/**
 * Calculate distance based on detected face bounding box
 * Simplified distance estimation: as face gets smaller, user is farther away
 * Formula: distance = baseline_distance * (baseline_width / detected_width)
 */
const estimateDistance = (faceWidth) => {
  if (!faceWidth || faceWidth < 20) return null;
  return (DISTANCE_BASELINE * FACE_WIDTH_BASELINE) / faceWidth;
};

/**
 * Convert feet to centimeters
 */
const feetToCm = (feet) => Math.round(feet * 30.48);

/**
 * useProximityDetection Hook
 * 
 * Real-time face detection via webcam using MediaPipe
 * Calculates distance and triggers callbacks when thresholds are met
 * 
 * Returns: { isDetecting, currentDistance, faceDetected, error, isSupported }
 */
export const useProximityDetection = ({
  distanceThreshold = 2, // feet
  onDistanceChange = () => {},
  onProximityAlert = () => {},
  enabled = true,
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const lastAlertTimeRef = useRef(0);
  const lastDistanceRef = useRef(null);

  // Initialize detector and webcam
  useEffect(() => {
    if (!enabled) return;

    const initializeDetector = async () => {
      try {
        // Check browser support
        if (!navigator.mediaDevices?.getUserMedia) {
          setIsSupported(false);
          setError('Camera not supported in this browser');
          return;
        }

        // Lazy load MediaPipe
        const FilesetResolver = await import('@mediapipe/tasks-vision').then(
          (m) => m.FilesetResolver
        );
        const FaceDetector = await import('@mediapipe/tasks-vision').then(
          (m) => m.FaceDetector
        );

        const vision = await FilesetResolver.forVisionOnJs('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm');
        
        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite'
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });

        detectorRef.current = detector;
        setIsDetecting(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize face detector:', err);
        setError(err.message || 'Failed to load face detection model');
        setIsSupported(false);
      }
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Wait for video to load
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch((err) => {
              console.error('Failed to play video:', err);
              setError('Failed to start camera');
            });
          };
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setError('Camera access denied. Please allow camera permission in settings.');
        setIsSupported(false);
      }
    };

    initializeDetector();
    startWebcam();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Detection loop
  useEffect(() => {
    if (!enabled || !detectorRef.current || !videoRef.current) return;

    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 100; // Run detection every 100ms

    const detectFace = () => {
      const now = performance.now();
      
      if (now - lastDetectionTime < DETECTION_INTERVAL) {
        animationFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }

      try {
        if (videoRef.current && videoRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
          const detections = detectorRef.current.detectForVideo(videoRef.current, Date.now());

          if (detections?.detections?.length > 0) {
            const face = detections.detections[0]; // Use first (largest) face
            const boundingBox = face.boundingBox;

            if (boundingBox) {
              const faceWidth = boundingBox.width * videoRef.current.videoWidth;
              const distance = estimateDistance(faceWidth);

              if (distance && distance > 0.5 && distance < 10) {
                // Reasonable distance range (0.5 to 10 feet)
                setFaceDetected(true);
                setCurrentDistance(distance);
                lastDistanceRef.current = distance;
                
                // Notify on distance change
                onDistanceChange(distance);

                // Alert if too close (with debounce)
                if (distance < distanceThreshold) {
                  const now = Date.now();
                  if (now - lastAlertTimeRef.current > 1000) {
                    // Only alert every 1 second
                    onProximityAlert({ distance, threshold: distanceThreshold });
                    lastAlertTimeRef.current = now;
                  }
                }
              } else {
                setFaceDetected(false);
              }
            }
          } else {
            setFaceDetected(false);
            setCurrentDistance(null);
          }
        }

        lastDetectionTime = now;
      } catch (err) {
        console.error('Detection error:', err);
      }

      animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    animationFrameRef.current = requestAnimationFrame(detectFace);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, distanceThreshold, onDistanceChange, onProximityAlert]);

  return {
    isDetecting,
    currentDistance,
    faceDetected,
    error,
    isSupported,
    videoRef,
    distanceInCm: currentDistance ? feetToCm(currentDistance) : null,
  };
};
