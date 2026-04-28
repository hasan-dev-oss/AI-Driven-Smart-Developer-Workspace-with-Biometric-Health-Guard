import React, { useEffect, useState } from 'react';
import { Mic, Video, AlertTriangle, CheckCircle, RefreshCw, Clipboard } from 'lucide-react';

export default function TroubleshootPanel() {
  const [micPermission, setMicPermission] = useState('unknown');
  const [camPermission, setCamPermission] = useState('unknown');
  const [micDevice, setMicDevice] = useState(false);
  const [camDevice, setCamDevice] = useState(false);
  const [checking, setChecking] = useState(false);

  const isSecure = typeof window !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost');

  useEffect(() => {
    checkAll();

    // try to listen to permission changes if supported
    let micPermObj = null;
    let camPermObj = null;

    (async () => {
      try {
        if (navigator.permissions) {
          try {
            micPermObj = await navigator.permissions.query({ name: 'microphone' });
            setMicPermission(micPermObj.state);
            micPermObj.onchange = () => setMicPermission(micPermObj.state);
          } catch (e) {
            // some browsers don't support 'microphone' permission name
          }

          try {
            camPermObj = await navigator.permissions.query({ name: 'camera' });
            setCamPermission(camPermObj.state);
            camPermObj.onchange = () => setCamPermission(camPermObj.state);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      try {
        if (micPermObj) micPermObj.onchange = null;
        if (camPermObj) camPermObj.onchange = null;
      } catch (e) {}
    };
  }, []);

  async function checkAll() {
    setChecking(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setMicDevice(false);
        setCamDevice(false);
        setMicPermission('unsupported');
        setCamPermission('unsupported');
        setChecking(false);
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicDevice(devices.some((d) => d.kind === 'audioinput'));
      setCamDevice(devices.some((d) => d.kind === 'videoinput'));

      // If permissions API didn't populate states earlier, keep unknown
      if (micPermission === 'unknown' && navigator.permissions) {
        try {
          const mp = await navigator.permissions.query({ name: 'microphone' });
          setMicPermission(mp.state);
        } catch (e) {}
      }
      if (camPermission === 'unknown' && navigator.permissions) {
        try {
          const cp = await navigator.permissions.query({ name: 'camera' });
          setCamPermission(cp.state);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Device check failed:', err);
    } finally {
      setChecking(false);
    }
  }

  async function requestMic() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      setMicDevice(true);
    } catch (err) {
      console.error('Microphone request failed:', err);
      if (err && err.name && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setMicPermission('denied');
      } else {
        setMicPermission('error');
      }
    }
  }

  async function requestCam() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCamPermission('granted');
      setCamDevice(true);
    } catch (err) {
      console.error('Camera request failed:', err);
      if (err && err.name && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setCamPermission('denied');
      } else {
        setCamPermission('error');
      }
    }
  }

  async function copyDiagnostics() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const diag = {
        protocol: location.protocol,
        hostname: location.hostname,
        secure: isSecure,
        micPermission,
        camPermission,
        micDevice,
        camDevice,
        devices: devices.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId }))
      };
      await navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
      alert('Diagnostics copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
      alert('Failed to copy diagnostics, check console for details');
    }
  }

  const renderStatus = (state) => {
    if (state === 'granted') return <span className="text-green-600 font-semibold">Granted</span>;
    if (state === 'denied') return <span className="text-red-600 font-semibold">Denied</span>;
    if (state === 'prompt') return <span className="text-yellow-600 font-semibold">Prompt</span>;
    if (state === 'unsupported') return <span className="text-gray-600">Unsupported</span>;
    if (state === 'error') return <span className="text-red-600">Error</span>;
    return <span className="text-gray-600">Unknown</span>;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 m-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="text-gray-700" />
          <h4 className="text-sm font-semibold text-gray-800">Troubleshooting</h4>
          <p className="text-xs text-gray-500">Quick checks for camera & microphone</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={checkAll} className="px-3 py-1 text-sm bg-white border rounded text-gray-700 hover:bg-gray-100">Refresh</button>
          <button onClick={copyDiagnostics} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Copy Diagnostics</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="p-3 bg-white rounded border">
          <div className="flex items-center gap-2">
            <Mic className="text-blue-600" />
            <div>
              <div className="text-sm font-medium">Microphone</div>
              <div className="text-xs text-gray-500">Device: {micDevice ? 'Found' : 'Not found'}</div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs">Permission: {renderStatus(micPermission)}</div>
            <div className="flex gap-2">
              <button onClick={requestMic} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Request Access</button>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-600">If denied: open browser site settings → Camera & Microphone → Allow</div>
        </div>

        <div className="p-3 bg-white rounded border">
          <div className="flex items-center gap-2">
            <Video className="text-purple-600" />
            <div>
              <div className="text-sm font-medium">Camera</div>
              <div className="text-xs text-gray-500">Device: {camDevice ? 'Found' : 'Not found'}</div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs">Permission: {renderStatus(camPermission)}</div>
            <div className="flex gap-2">
              <button onClick={requestCam} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Request Access</button>
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-600">If denied: open browser site settings → Camera & Microphone → Allow</div>
        </div>

        <div className="p-3 bg-white rounded border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-500" />
            <div>
              <div className="text-sm font-medium">Environment</div>
              <div className="text-xs text-gray-500">Secure connection: {isSecure ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-600">If your site is not served over HTTPS (except localhost), getUserMedia may be blocked. Serve via HTTPS or use localhost for testing.</div>

          <div className="mt-3">
            <button onClick={() => window.open('https://support.google.com/chrome/answer/2693767', '_blank')} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded mr-2">Open Help</button>
            <button onClick={copyDiagnostics} className="px-2 py-1 text-xs bg-gray-200 rounded">Copy Diagnostics</button>
          </div>
        </div>
      </div>
    </div>
  );
}
