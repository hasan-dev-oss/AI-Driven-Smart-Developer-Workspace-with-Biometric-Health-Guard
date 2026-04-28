import VideoCallToolbar from "./subComponent/VideoCallToolbar";
import VideoScreen from "./subComponent/VideoScreen";
import { useSocket } from "../../context/SocketProvider";
import React, { useEffect, useRef, useState } from "react";

const VideoCallSection = ({ roomIdVCS, isInterviewMode, onLocalStreamChange, onInterviewToggle, aiOpen }) => {
  const socket = useSocket();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const startingRef = useRef(false);
  const socketHandlersRef = useRef(null);

  const [micDisable, setMicDisable] = useState(true);
  const [camDisable, setCamDisable] = useState(true);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [remoteMicOff, setRemoteMicOff] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callError, setCallError] = useState(null);
  // const [remoteCamOn, setRemoteCamOn] = useState(true);

  // const [isRemoteConnected, setIsRemoteConnected] = useState(false);

  const registerSocketHandlers = () => {
    if (!socket || socketHandlersRef.current) return;

    const onAllUsers = async (users) => {
      if (!localStream.current) return;
      if (users.length > 0) {
        await createPeer(users[0], true);
      }
    };

    const onUserJoined = (userId) => {
      console.log("New user joined:", userId);
    };

    const onOffer = async ({ sdp, caller }) => {
      await createPeer(caller, false, sdp);
    };

    const onAnswer = async ({ sdp }) => {
      await peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );
    };

    const onIceCandidate = async ({ candidate }) => {
      try {
        await peerConnection.current?.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.error("Error adding received ice candidate", err);
      }
    };

    const onMediaToggled = (data) => {
      setRemoteMicOff(!data.mic); // mic === true means it's ON
    };

    const onUserLeft = () => {
      console.log("User disconnected");
    };

    socket.on("all-users", onAllUsers);
    socket.on("user-joined", onUserJoined);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("media-toggled", onMediaToggled);
    socket.on("user-left", onUserLeft);

    socketHandlersRef.current = {
      onAllUsers,
      onUserJoined,
      onOffer,
      onAnswer,
      onIceCandidate,
      onMediaToggled,
      onUserLeft,
    };
  };

  const unregisterSocketHandlers = () => {
    if (!socket || !socketHandlersRef.current) return;
    const handlers = socketHandlersRef.current;
    socket.off("all-users", handlers.onAllUsers);
    socket.off("user-joined", handlers.onUserJoined);
    socket.off("offer", handlers.onOffer);
    socket.off("answer", handlers.onAnswer);
    socket.off("ice-candidate", handlers.onIceCandidate);
    socket.off("media-toggled", handlers.onMediaToggled);
    socket.off("user-left", handlers.onUserLeft);
    socketHandlersRef.current = null;
  };

  const cleanupMedia = (resetState = true) => {
    peerConnection.current?.close();
    peerConnection.current = null;

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (typeof onLocalStreamChange === 'function') {
      try { onLocalStreamChange(null); } catch (e) { console.warn('onLocalStreamChange callback error', e); }
    }

    if (resetState) setIsCallActive(false);
  };

  const getCameraPermissionHint = async (error) => {
    if (!navigator.permissions?.query) return null;
    try {
      const status = await navigator.permissions.query({ name: 'camera' });
      if (status.state === 'denied') {
        return 'Camera permission is blocked. Open browser/site settings and allow access.';
      }
      if (status.state === 'prompt') {
        return 'Please allow camera access when prompted.';
      }
      if (status.state === 'granted') {
        return 'Camera access is granted. Refresh the page if the issue persists.';
      }
    } catch (err) {
      return null;
    }
    return null;
  };

  const handleStartCall = async () => {
    if (!socket || isCallActive || startingRef.current) return;
    startingRef.current = true;
    setCallError(null);

    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      if (typeof onLocalStreamChange === 'function') {
        try { onLocalStreamChange(localStream.current); } catch (e) { console.warn('onLocalStreamChange callback error', e); }
      }

      registerSocketHandlers();
      socket.emit("join-room", roomIdVCS);
      setIsCallActive(true);
    } catch (error) {
      console.error("Failed to start call:", error);
      let message = 'Unable to start video call. Please allow camera and microphone access.';

      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        message = 'Camera and microphone access denied. Please allow permission in browser settings.';
      } else if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        message = 'No camera or microphone found. Check your device or browser settings.';
      } else if (error?.name === 'NotReadableError') {
        message = 'Unable to access camera or microphone. Ensure no other app is using them.';
      }

      const hint = await getCameraPermissionHint(error);
      setCallError(hint ? `${message} ${hint}` : message);
      cleanupMedia(false);
    } finally {
      startingRef.current = false;
    }
  };

  const handleEndCall = () => {
    unregisterSocketHandlers();
    cleanupMedia(true);
  };

  const handleCloseScreen = () => {
    handleEndCall();
    window.location.href = "/dashboard";
  };

  useEffect(() => {
    if (!socket || !roomIdVCS) return;
    handleStartCall();

    return () => {
      unregisterSocketHandlers();
      cleanupMedia(false);
    };
  }, [roomIdVCS, socket]);

  const createPeer = async (targetId, isCaller, remoteSdp = null) => {
    if (!localStream.current) return;
    peerConnection.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.current.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          target: targetId,
          candidate: e.candidate,
        });
      }
    };

    peerConnection.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    if (isCaller) {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", { target: targetId, sdp: offer });
    } else if (remoteSdp) {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(remoteSdp)
      );
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { target: targetId, sdp: answer });
    }
  };

  const toggleMic = () => {
    if (!localStream.current?.getAudioTracks?.()?.length) return;
    const enabled = !micDisable;
    localStream.current.getAudioTracks()[0].enabled = enabled;
    setMicDisable(enabled);
    socket.emit("media-toggled", {
      room: roomIdVCS,
      mic: enabled,
      cam: camDisable,
    });
  };

  const toggleCam = () => {
    if (!localStream.current?.getVideoTracks?.()?.length) return;
    const enabled = !camDisable;
    localStream.current.getVideoTracks()[0].enabled = enabled;
    setCamDisable(enabled);
    socket.emit("media-toggled", {
      room: roomIdVCS,
      mic: micDisable,
      cam: enabled,
    });
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      const newMuted = !remoteVideoRef.current.muted;
      remoteVideoRef.current.muted = newMuted;
      setSpeakerOff(newMuted);
    }
  };

  return (
    <div className={`flex flex-col py-3 px-3 h-full `}>
      {callError && (
        <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 p-3 mb-3">
          <p className="font-semibold">Camera / Microphone Permission Required</p>
          <p>{callError}</p>
        </div>
      )}
      {/* Video Screen's */}
      <div className="flex flex-col gap-1 sm:gap-2 md:gap-3">
        {/*Guest Video*/}
        <VideoScreen
          isHost={false}
          isInterviewMode={isInterviewMode}
          videoRef={remoteVideoRef}
          micStaus={!remoteMicOff}
          displayName={"Guest"}
          />
          {/*Host Video*/}
        <VideoScreen
          isHost={true}
          isInterviewMode={isInterviewMode}
          videoRef={localVideoRef}
          micStaus={micDisable}
          displayName={"Host (You)"}
        />
      </div>

      {/* Video Call Toolbar */}
      <VideoCallToolbar
        micDisable={micDisable}
        camDisable={camDisable}
        speakerOff={speakerOff}
        isCallActive={isCallActive}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onCloseScreen={handleCloseScreen}
        toggleMic={toggleMic}
        toggleCam={toggleCam}
        toggleSpeaker={toggleSpeaker}
        onInterviewToggle={onInterviewToggle}
        interviewActive={aiOpen}
      />
    </div>
  );
};

export default VideoCallSection;
