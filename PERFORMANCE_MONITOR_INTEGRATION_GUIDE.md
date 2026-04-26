# Real-time System Resource Monitor - Integration Guide

## Overview
This guide explains how to integrate the Real-time System Resource Monitor component into your SynCodex IDE, including backend setup and memory leak prevention strategies.

---

## Components Delivered

### 1. **useSystemMetrics Hook** (`src/hooks/useSystemMetrics.js`)
A custom React hook that manages socket.io connection and metrics data with:
- Sliding window of last 20 data points
- Automatic data validation and clamping (0-100%)
- Mounted state tracking to prevent memory leaks
- Connection status monitoring
- Error handling

### 2. **PerformanceMonitor Component** (`src/components/PerformanceMonitor.jsx`)
A fully-featured monitoring component featuring:
- Responsive Recharts Line Chart (dark-themed)
- Dual-metric visualization (CPU & Memory)
- Dynamic alert system (CPU > 90% → red + "CRITICAL" badge)
- Current metrics display
- Peak CPU tracking
- Custom tooltips with timestamps
- React.memo optimization for performance

---

## Integration Steps

### Step 1: Frontend Integration
The component is ready to use in your application. Simply import and render it:

```jsx
import PerformanceMonitor from './components/PerformanceMonitor';

function Dashboard() {
  return (
    <div className="flex gap-4">
      <main className="flex-1">
        {/* Your IDE content */}
      </main>
      <aside className="w-96">
        <PerformanceMonitor />
      </aside>
    </div>
  );
}
```

### Step 2: Backend Socket.io Setup
Add the system metrics emitter to your `SynCodex Backend/src/server.js`:

```javascript
const io = require('socket.io')(8000, {
  cors: { origin: '*' }
});

// Collect system metrics every 500ms
setInterval(() => {
  // Import OS module at top of file: const os = require('os');
  
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercent = (usedMemory / totalMemory) * 100;
  
  // For CPU, use os.loadavg() or process.cpuUsage()
  const cpuUsage = process.cpuUsage();
  // Convert to percentage (this is a simplified example)
  const cpuPercent = Math.min(100, (cpuUsage.user + cpuUsage.system) / 10000000);
  
  // Emit to all connected clients
  io.emit('system-metrics', {
    cpu: cpuPercent,
    memory: memoryPercent
  });
}, 500); // Emit every 500ms (adjust based on needs)
```

### Step 3: Backend with More Accurate CPU Metrics
For more accurate CPU monitoring, consider using a library:

```bash
npm install systeminformation
```

Then update your metrics collection:

```javascript
const si = require('systeminformation');
const io = require('socket.io')(8000, {
  cors: { origin: '*' }
});

setInterval(async () => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    
    io.emit('system-metrics', {
      cpu: cpu.currentLoad, // Already in percentage
      memory: (mem.used / mem.total) * 100
    });
  } catch (error) {
    console.error('Metrics collection error:', error);
  }
}, 500);
```

---

## Memory Leak Prevention

### How the Hook Prevents Memory Leaks

**1. Mounted State Tracking**
```javascript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false; // Prevent state updates after unmount
  };
}, []);
```
This prevents setting state on unmounted components, which is a common source of memory leaks.

**2. Single Listener Registration**
```javascript
const listenerRegisteredRef = useRef(false);

if (!listenerRegisteredRef.current) {
  socket.on('system-metrics', handleSystemMetrics);
  listenerRegisteredRef.current = true;
}
```
Listeners are registered once and persist for the application lifetime, preventing duplicate listeners.

**3. Event Validation**
```javascript
if (typeof data.cpu !== 'number' || typeof data.memory !== 'number') {
  setError('Invalid metrics data structure');
  return;
}
```
Validates data before processing to prevent errors from malformed events.

### Best Practices for Socket Listener Management

**DO:**
- ✅ Keep listeners registered for the entire app lifetime (as implemented)
- ✅ Use refs to prevent duplicate registrations
- ✅ Check component mounted state before setState
- ✅ Memoize callbacks to prevent re-registrations

**DON'T:**
- ❌ Remove/re-add listeners on every component render
- ❌ Create new socket connections repeatedly
- ❌ Forget to unsubscribe from listeners on component unmount (only if global listeners)
- ❌ Update state without checking mount status

**Global Listener Cleanup (Optional)**
If you need to clean up all listeners globally (e.g., on app shutdown):

```javascript
// In your app root or when user logs out
const { disconnect } = useSystemMetrics();

// Then call when needed
disconnect();
```

---

## Performance Optimization Details

### 1. **React.memo Wrapper**
```javascript
export const PerformanceMonitor = React.memo(PerformanceMonitorComponent);
```
Prevents re-renders when parent props haven't changed. The component only re-renders when metrics update.

### 2. **Memoized Calculations**
```javascript
const { isCritical, strokeColor } = useMemo(() => {
  // Expensive calculations only re-run when metrics change
}, [metrics]);
```
Prevents recalculating alert status and colors on every render.

### 3. **Sliding Window (Max 20 Points)**
```javascript
const newMetrics = [...prevMetrics, clampedData];
return newMetrics.length > MAX_DATA_POINTS 
  ? newMetrics.slice(-MAX_DATA_POINTS) 
  : newMetrics;
```
Limits data points to prevent memory bloat and rendering lag.

### 4. **Efficient Updates**
- Uses functional setState to avoid dependency on previous state
- Timestamps are formatted once at collection time
- Chart animations use 300ms duration for smooth updates

---

## Customization Options

### Adjust Update Frequency
In backend, change the interval (currently 500ms):
```javascript
}, 500); // Change this value in milliseconds
```

### Modify Data Retention
In the hook, change `MAX_DATA_POINTS`:
```javascript
const MAX_DATA_POINTS = 20; // Change to 30, 50, etc.
```

### Adjust Critical Alert Threshold
In the component, modify the condition:
```javascript
const isCrit = latestCPU > 90; // Change 90 to your threshold
```

### Theme Customization
Colors are defined via Tailwind classes and hex values:
- Cyan (normal): `#06B6D4` or `text-cyan-400`
- Red (critical): `#EF4444` or `text-red-400`
- Purple (memory): `#A78BFA` or `text-purple-400`

---

## Troubleshooting

### Metrics Not Updating
1. Verify backend is emitting 'system-metrics' events
2. Check socket.io connection status (blue dot in component header)
3. Inspect browser console for errors
4. Verify socket.io CORS configuration

### High Memory Usage
1. Reduce update frequency on backend (increase interval)
2. Reduce MAX_DATA_POINTS from 20 to 10
3. Check browser DevTools for memory leaks
4. Ensure component is properly memoized

### Alert Always Showing
1. Verify CPU threshold value (currently 90%)
2. Check that CPU metrics are being sent correctly
3. Inspect data structure: `{ cpu: number, memory: number }`

---

## Dependencies Required

Ensure your `package.json` includes:
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "socket.io-client": "^4.5.0",
    "recharts": "^2.8.0",
    "tailwindcss": "^3.0.0"
  }
}
```

Install any missing dependencies:
```bash
npm install socket.io-client recharts
```

---

## Implementation Complete ✅

Your performance monitor is now ready for production use with:
- ✅ Real-time metrics visualization
- ✅ Intelligent CPU alert system
- ✅ Memory leak prevention
- ✅ Professional dark UI
- ✅ Optimized performance
- ✅ Responsive design
- ✅ Comprehensive error handling
