# Proximity System - Developer Code Examples

## Table of Contents
1. [Hook Usage Examples](#hook-usage-examples)
2. [Component Integration](#component-integration)
3. [Settings Management](#settings-management)
4. [CSS Customization](#css-customization)
5. [Error Handling](#error-handling)
6. [Advanced Usage](#advanced-usage)

---

## Hook Usage Examples

### Basic Usage
```jsx
import { useProximityDetection } from '../hooks/useProximityDetection';

function MyComponent() {
  const { currentDistance, faceDetected, isSupported } = useProximityDetection({
    distanceThreshold: 2,
    enabled: true,
  });

  return (
    <div>
      {isSupported ? (
        <>
          <p>Face Detected: {faceDetected ? 'Yes' : 'No'}</p>
          <p>Distance: {currentDistance?.toFixed(2)} feet</p>
        </>
      ) : (
        <p>Camera not supported</p>
      )}
    </div>
  );
}
```

### With Callbacks
```jsx
function ComponentWithCallbacks() {
  const handleDistanceChange = (distance) => {
    console.log('User is now at', distance, 'feet');
  };

  const handleProximityAlert = ({ distance, threshold }) => {
    console.warn(`Too close! Distance: ${distance}ft, Threshold: ${threshold}ft`);
    showNotification('Please move away from screen');
  };

  const { currentDistance } = useProximityDetection({
    distanceThreshold: 2,
    onDistanceChange: handleDistanceChange,
    onProximityAlert: handleProximityAlert,
    enabled: true,
  });

  return <div>Distance: {currentDistance}</div>;
}
```

### Multiple Thresholds
```jsx
function MultiThresholdComponent() {
  const [alertLevel, setAlertLevel] = useState('safe');

  const handleDistanceChange = (distance) => {
    if (distance > 2.5) {
      setAlertLevel('safe');
    } else if (distance > 1.5) {
      setAlertLevel('warning');
    } else {
      setAlertLevel('critical');
    }
  };

  const { currentDistance } = useProximityDetection({
    distanceThreshold: 1.5,
    onDistanceChange: handleDistanceChange,
  });

  return (
    <div className={`alert-level-${alertLevel}`}>
      Alert: {alertLevel}
    </div>
  );
}
```

### With Distance Unit Conversion
```jsx
function DistanceDisplay() {
  const { currentDistance, distanceInCm } = useProximityDetection({
    distanceThreshold: 2,
  });

  const displayValue = useUnit((unit) => {
    return unit === 'cm' ? distanceInCm : currentDistance;
  });

  return (
    <div>
      <p>{displayValue.toFixed(2)}</p>
      <p>{useUnit((u) => (u === 'cm' ? 'cm' : 'ft'))}</p>
    </div>
  );
}
```

---

## Component Integration

### Wrapping Editor with Provider
```jsx
import ProximityDetectionProvider from './ProximityDetectionProvider';
import EditorContent from './EditorContent';

function EditorPage() {
  const editorRef = useRef();

  return (
    <ProximityDetectionProvider containerRef={editorRef}>
      <div ref={editorRef} className="editor-container">
        <EditorContent />
      </div>
    </ProximityDetectionProvider>
  );
}
```

### Status Indicator in Navigation
```jsx
import ProximityStatusIndicator from './ProximityStatusIndicator';

function EditorNav() {
  return (
    <header className="navbar">
      <div className="nav-left">Logo</div>
      <div className="nav-center">Actions</div>
      <div className="nav-right">
        <ProximityStatusIndicator />
        {/* Other nav items */}
      </div>
    </header>
  );
}
```

### Settings Panel Integration
```jsx
import ProximitySettings from './ProximitySettings';

function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="settings-panel">
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab name="general" label="General">
          {/* General settings */}
        </Tab>
        <Tab name="proximity" label="Proximity Detection">
          <ProximitySettings />
        </Tab>
      </Tabs>
    </div>
  );
}
```

---

## Settings Management

### Update Settings
```jsx
import { useUser } from '../context/UserContext';

function SettingsComponent() {
  const { 
    proximitySettings,
    updateProximityThreshold,
    toggleProximity,
    setDistanceUnit,
  } = useUser();

  return (
    <div>
      {/* Enable/Disable */}
      <button onClick={toggleProximity}>
        {proximitySettings.proximityEnabled ? 'Disable' : 'Enable'} Detection
      </button>

      {/* Update Threshold */}
      <input
        type="number"
        value={proximitySettings.proximityThreshold}
        onChange={(e) => updateProximityThreshold(parseFloat(e.target.value))}
        min="0.5"
        max="10"
        step="0.1"
      />

      {/* Switch Units */}
      <button onClick={() => setDistanceUnit(
        proximitySettings.distanceUnit === 'feet' ? 'cm' : 'feet'
      )}>
        Switch to {proximitySettings.distanceUnit === 'feet' ? 'cm' : 'feet'}
      </button>
    </div>
  );
}
```

### Access Settings
```jsx
function ComponentNeedingSettings() {
  const { proximitySettings } = useUser();

  useEffect(() => {
    console.log('Current threshold:', proximitySettings.proximityThreshold);
    console.log('Detection enabled:', proximitySettings.proximityEnabled);
    console.log('Unit:', proximitySettings.distanceUnit);
  }, [proximitySettings]);

  return <div>{/* Content */}</div>;
}
```

### Batch Update Settings
```jsx
function AdvancedSettingsPanel() {
  const { updateProximitySettings } = useUser();

  const handlePreset = (preset) => {
    if (preset === 'strict') {
      updateProximitySettings({
        proximityEnabled: true,
        proximityThreshold: 1.5,
        distanceUnit: 'feet',
      });
    } else if (preset === 'relaxed') {
      updateProximitySettings({
        proximityEnabled: true,
        proximityThreshold: 2.5,
        distanceUnit: 'feet',
      });
    } else if (preset === 'disabled') {
      updateProximitySettings({
        proximityEnabled: false,
      });
    }
  };

  return (
    <div>
      <button onClick={() => handlePreset('strict')}>Strict (1.5ft)</button>
      <button onClick={() => handlePreset('relaxed')}>Relaxed (2.5ft)</button>
      <button onClick={() => handlePreset('disabled')}>Disabled</button>
    </div>
  );
}
```

---

## CSS Customization

### Custom Blur Effect
```css
/* Stronger blur */
.screen-blur {
  filter: blur(20px);
  transition: filter 0.5s ease-in-out;
}

/* Subtle blur */
.screen-blur-subtle {
  filter: blur(5px);
  transition: filter 0.2s ease;
}

/* With color overlay */
.screen-blur-overlay {
  filter: blur(10px);
  background: rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;
}
```

### Custom Status Indicator
```css
/* Compact indicator */
.proximity-status-indicator.compact {
  padding: 2px 6px;
  font-size: 10px;
  gap: 4px;
}

/* Large indicator */
.proximity-status-indicator.large {
  padding: 10px 16px;
  font-size: 14px;
  gap: 12px;
}

/* Custom colors */
.proximity-status-dot.custom-safe {
  background: #00FF00;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
}
```

### Responsive Adjustments
```css
/* Mobile */
@media (max-width: 600px) {
  .screen-blur {
    filter: blur(8px);  /* Lighter blur on mobile */
  }

  .proximity-status-indicator {
    padding: 4px 8px;
    font-size: 10px;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .proximity-settings {
    padding: 12px;
    gap: 12px;
  }
}
```

---

## Error Handling

### Handle Camera Errors
```jsx
function SafeProximityComponent() {
  const { error, isSupported } = useProximityDetection({
    enabled: true,
  });

  if (!isSupported) {
    return <ErrorBanner>Camera not supported in your browser</ErrorBanner>;
  }

  if (error) {
    return (
      <ErrorBanner>
        Camera Error: {error}
        <button onClick={() => window.location.reload()}>Retry</button>
      </ErrorBanner>
    );
  }

  return <ProximityStatusIndicator />;
}
```

### Graceful Degradation
```jsx
function EditorWithFallback() {
  const { isSupported, error, faceDetected } = useProximityDetection({});

  return (
    <EditorContainer>
      {isSupported && !error && faceDetected && (
        <ProximityStatusIndicator />
      )}
      {!isSupported && (
        <WarningBanner>Proximity detection unavailable</WarningBanner>
      )}
      <Editor />
    </EditorContainer>
  );
}
```

### Try-Catch Pattern
```jsx
async function initializeProximity() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
    });
    
    // Initialize detection
    return { success: true, stream };
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.error('Camera permission denied');
    } else if (error.name === 'NotFoundError') {
      console.error('No camera device found');
    } else {
      console.error('Unknown camera error:', error);
    }
    return { success: false, error };
  }
}
```

---

## Advanced Usage

### Custom Distance Calculation
```jsx
function CustomDistanceCalculation() {
  // Override distance calculation
  const estimateCustomDistance = (faceWidth, cameraFov = 60) => {
    // Assuming face width is roughly 10cm
    const faceWidthCm = 10;
    const focalLength = (faceWidth * cameraFov) / 2;
    const distanceCm = (faceWidthCm * focalLength) / faceWidth;
    return distanceCm / 30.48; // Convert to feet
  };

  return <div>{/* Implementation */}</div>;
}
```

### Real-time Analytics
```jsx
function ProximityAnalytics() {
  const [stats, setStats] = useState({
    totalTime: 0,
    alertCount: 0,
    avgDistance: 0,
  });

  const [distances, setDistances] = useState([]);

  const handleDistanceChange = useCallback((distance) => {
    setDistances((prev) => {
      const updated = [...prev, { time: Date.now(), distance }];
      // Keep last 100 readings
      return updated.slice(-100);
    });
  }, []);

  const handleProximityAlert = useCallback(() => {
    setStats((prev) => ({
      ...prev,
      alertCount: prev.alertCount + 1,
    }));
  }, []);

  useProximityDetection({
    onDistanceChange: handleDistanceChange,
    onProximityAlert: handleProximityAlert,
  });

  return (
    <div>
      <p>Alerts: {stats.alertCount}</p>
      <p>Average Distance: {(stats.avgDistance).toFixed(2)}ft</p>
    </div>
  );
}
```

### Feature Flags
```jsx
function FeatureFlaggedProximity() {
  const proximityEnabled = localStorage.getItem('feature_proximity') === 'true';

  if (!proximityEnabled) {
    return <EditorWithoutProximity />;
  }

  return <EditorWithProximity />;
}

// Enable/disable feature
function FeatureToggle() {
  const handleToggle = (enabled) => {
    localStorage.setItem('feature_proximity', enabled);
    window.location.reload();
  };

  return (
    <button onClick={() => handleToggle(true)}>
      Enable Proximity Detection
    </button>
  );
}
```

### Performance Monitoring
```jsx
function MonitorProximityPerformance() {
  const detectionStart = useRef(null);
  const { isDetecting } = useProximityDetection({});

  useEffect(() => {
    if (isDetecting) {
      detectionStart.current = performance.now();
    } else if (detectionStart.current) {
      const duration = performance.now() - detectionStart.current;
      console.log('Detection took:', duration.toFixed(2), 'ms');
      detectionStart.current = null;
    }
  }, [isDetecting]);

  return <div>{/* Content */}</div>;
}
```

### Export Statistics
```jsx
function ExportProximityStats() {
  const [stats, setStats] = useState([]);

  const handleExport = () => {
    const csvData = stats
      .map((s) => `${s.time},${s.distance},${s.status}`)
      .join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proximity-stats.csv';
    a.click();
  };

  return (
    <button onClick={handleExport}>
      Export Statistics
    </button>
  );
}
```

---

## Complete Example: Full Editor with Proximity

```jsx
import React, { useRef, useState } from 'react';
import ProximityDetectionProvider from './ProximityDetectionProvider';
import ProximityStatusIndicator from './ProximityStatusIndicator';
import EditorPane from './EditorPane';
import { useUser } from '../context/UserContext';

export default function FullEditorWithProximity() {
  const editorContainerRef = useRef();
  const [code, setCode] = useState('');
  const { proximitySettings, updateProximityThreshold } = useUser();

  const handleThresholdChange = (e) => {
    updateProximityThreshold(parseFloat(e.target.value));
  };

  return (
    <ProximityDetectionProvider containerRef={editorContainerRef}>
      <div ref={editorContainerRef} className="editor-full">
        {/* Header */}
        <header className="editor-header">
          <div>SynCodex Editor</div>
          <ProximityStatusIndicator />
        </header>

        {/* Settings Bar */}
        <div className="settings-bar">
          <label>Proximity Threshold: </label>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.1"
            value={proximitySettings.proximityThreshold}
            onChange={handleThresholdChange}
            className="proximity-slider"
          />
          <span>{proximitySettings.proximityThreshold.toFixed(2)} {proximitySettings.distanceUnit}</span>
        </div>

        {/* Editor Area */}
        <div className="editor-main">
          <EditorPane
            code={code}
            onChange={setCode}
          />
        </div>
      </div>
    </ProximityDetectionProvider>
  );
}
```

---

## Testing Examples

### Unit Test
```jsx
import { render, screen } from '@testing-library/react';
import ProximityStatusIndicator from './ProximityStatusIndicator';

test('displays safe status when far', () => {
  render(<ProximityStatusIndicator />);
  expect(screen.getByText(/safe/i)).toBeInTheDocument();
});
```

### Integration Test
```jsx
test('applies blur when too close', async () => {
  const { container } = render(
    <ProximityDetectionProvider containerRef={ref}>
      <div ref={ref} className="test-container">Content</div>
    </ProximityDetectionProvider>
  );

  // Simulate distance change
  act(() => {
    // Mock proximity alert
  });

  expect(container.querySelector('.test-container')).toHaveClass('screen-blur');
});
```

---

## Resources

- [MediaPipe Documentation](https://developers.google.com/mediapipe/solutions/vision/face_detector)
- [React Hooks Documentation](https://react.dev/reference/react)
- [UserContext API](../context/UserContext.jsx)
- [Proximity CSS Reference](../styles/proximity.css)

---

**Note**: Always ensure proper error handling and user feedback in production applications.
