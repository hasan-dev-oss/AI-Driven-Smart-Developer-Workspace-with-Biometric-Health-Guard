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

const getCameraPermissionMessage = async (err) => {
  const base = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
    ? 'Camera access denied.'
    : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
      ? 'Camera not found.'
      : 'Unable to access camera.';

  if (!navigator.permissions?.query) {
    return `${base} Please check browser settings and allow camera access.`;
  }

  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    if (status.state === 'denied') {
      return `${base} Camera permission is blocked. Open browser/site settings and allow access.`;
    }
    if (status.state === 'prompt') {
      return `${base} Please allow camera access when prompted.`;
    }
    if (status.state === 'granted') {
      return `${base} Camera access is granted. Refresh the page if the issue persists.`;
    }
  } catch (permissionErr) {
    console.warn('Camera permissions query failed:', permissionErr);
  }

  return `${base} Please check browser settings and allow camera access.`;
};

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

        // Try MediaPipe Tasks Vision first (if available)
        try {
          const mp = await import('@mediapipe/tasks-vision');
          const { FilesetResolver, FaceDetector } = mp;
          const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

          let vision;
          if (typeof FilesetResolver.forVisionTasks === 'function') {
            vision = await FilesetResolver.forVisionTasks(wasmUrl);
          } else if (typeof FilesetResolver.forVision === 'function') {
            vision = await FilesetResolver.forVision(wasmUrl);
          } else if (typeof FilesetResolver.forVisionOnJs === 'function') {
            vision = await FilesetResolver.forVisionOnJs(wasmUrl);
          } else {
            throw new Error('FilesetResolver.forVision API not found');
          }

          const modelPath = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
          const detector = await FaceDetector.createFromModelPath(vision, modelPath);
          if (detector.setOptions) {
            detector.setOptions({ runningMode: 'VIDEO', minDetectionConfidence: 0.5 });
          }

          // Use mediapipe detector as-is
          detectorRef.current = detector;
          setIsDetecting(true);
          setError(null);
          return;
        } catch (mpErr) {
          console.warn('MediaPipe init failed, falling back to TF.js face-landmarks-detection:', mpErr);
        }

        // Fallback: TensorFlow.js face-landmarks-detection
        try {
          const tf = await import('@tensorflow/tfjs-core');
          await import('@tensorflow/tfjs-backend-webgl');
          await tf.setBackend('webgl');
          await tf.ready();

          const faceLandmarks = await import('@tensorflow-models/face-landmarks-detection');
          let model;
          let api = 'v1';

          if (faceLandmarks.createDetector && faceLandmarks.SupportedModels?.MediaPipeFaceMesh) {
            model = await faceLandmarks.createDetector(
              faceLandmarks.SupportedModels.MediaPipeFaceMesh,
              { runtime: 'tfjs', maxFaces: 1 }
            );
          } else if (faceLandmarks.load && faceLandmarks.SupportedPackages?.mediapipeFacemesh) {
            api = 'v0';
            model = await faceLandmarks.load(
              faceLandmarks.SupportedPackages.mediapipeFacemesh,
              { maxFaces: 1 }
            );
          } else {
            throw new Error('Face landmarks model API not found');
          }

          detectorRef.current = { type: 'tfjs_facemesh', model, api };
          setIsDetecting(true);
          setError(null);
          return;
        } catch (tfErr) {
          console.error('TF.js face-landmarks fallback failed:', tfErr);
          throw tfErr;
        }
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
        const message = await getCameraPermissionMessage(err);
        setError(message);
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

    let cancelled = false;
    let lastDetectionTime = 0;
    const DETECTION_INTERVAL = 100; // Run detection every 100ms

    const detectFace = async () => {
      const now = performance.now();

      if (now - lastDetectionTime < DETECTION_INTERVAL) {
        if (!cancelled) animationFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }

      try {
        if (videoRef.current && videoRef.current.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
          let faceWidth = null;
          const detector = detectorRef.current;

          if (detector && detector.type === 'tfjs_facemesh') {
            // TF.js face-landmarks-detection model (supports v0 and v1 APIs)
            let preds;
            if (detector.api === 'v1') {
              preds = await detector.model.estimateFaces(videoRef.current, { flipHorizontal: false });
            } else {
              preds = await detector.model.estimateFaces({ input: videoRef.current, returnTensors: false, flipHorizontal: false });
            }
            if (preds && preds.length > 0) {
              const p = preds[0];
              if (p.box) {
                const width = p.box.width ?? Math.abs(p.box.xMax - p.box.xMin);
                faceWidth = width;
              } else {
                const topLeft = p.topLeft || (p.boundingBox && p.boundingBox.topLeft);
                const bottomRight = p.bottomRight || (p.boundingBox && p.boundingBox.bottomRight);
                if (topLeft && bottomRight) {
                  faceWidth = Math.abs(bottomRight[0] - topLeft[0]);
                } else if (p.boundingBox && p.boundingBox.width) {
                  faceWidth = p.boundingBox.width;
                } else if (p.scaledMesh && p.scaledMesh.length) {
                  const xs = p.scaledMesh.map((m) => m[0]);
                  faceWidth = Math.max(...xs) - Math.min(...xs);
                }
              }
            }
          } else {
            // Assume mediapipe FaceDetector (tasks-vision)
            const detections = detector.detectForVideo ? await detector.detectForVideo(videoRef.current, Date.now()) : await detector.detect(videoRef.current);
            if (detections?.detections?.length > 0) {
              const face = detections.detections[0];
              const boundingBox = face.boundingBox;
              if (boundingBox) {
                faceWidth = boundingBox.width * videoRef.current.videoWidth;
              }
            }
          }

          if (faceWidth && faceWidth > 0) {
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
                const nowTs = Date.now();
                if (nowTs - lastAlertTimeRef.current > 1000) {
                  // Only alert every 1 second
                  onProximityAlert({ distance, threshold: distanceThreshold });
                  lastAlertTimeRef.current = nowTs;
                }
              }
            } else {
              setFaceDetected(false);
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

      if (!cancelled) animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    animationFrameRef.current = requestAnimationFrame(detectFace);

    return () => {
      cancelled = true;
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
