import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, X } from 'lucide-react';

interface VideoCallProps {
    socket: Socket;
    room: string;
    user: any;
    friend: any;
    onEndCall: () => void;
    isIncoming?: boolean;
    incomingSignal?: any;
}

// Optimized ICE servers configuration for better connectivity and speed
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    iceCandidatePoolSize: 10 // Pre-fetch ICE candidates for faster connection
};

export const VideoCall: React.FC<VideoCallProps> = ({ socket, room: _room, user, friend, onEndCall, isIncoming, incomingSignal }) => {
    console.log("VideoCall rendering. User:", user?.id, "Friend:", friend?._id, "Incoming:", isIncoming);

    const [callAccepted, setCallAccepted] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [status, setStatus] = useState(isIncoming ? 'Incoming Call...' : 'Calling...');

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const isMounted = useRef(true);

    const stopMedia = (currentStream?: MediaStream | null) => {
        console.log('stopMedia called');

        // Stop tracks from the passed stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                console.log('Stopping track:', track.kind, track.readyState);
                track.stop();
            });
        }

        // Stop tracks from ref stream
        if (streamRef.current && streamRef.current !== currentStream) {
            streamRef.current.getTracks().forEach(track => {
                console.log('Stopping ref track:', track.kind, track.readyState);
                track.stop();
            });
        }

        // Clear video element sources
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

        streamRef.current = null;
        setStream(null);
    };

    const cleanup = (currentStream?: MediaStream | null) => {
        console.log('cleanup called');
        stopMedia(currentStream);

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        socket.off('call_accepted');
        socket.off('ice_candidate');
        socket.off('end_call');
    };

    const startCall = async () => {
        console.log('startCall initiated');
        try {
            // Optimized media constraints for smoother video
            const mediaConstraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const currentStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            console.log('getUserMedia success');

            if (!isMounted.current) {
                currentStream.getTracks().forEach(track => track.stop());
                return;
            }

            setStream(currentStream);
            streamRef.current = currentStream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = currentStream;
            }

            const peer = new RTCPeerConnection(ICE_SERVERS);
            peerRef.current = peer;

            // Add tracks to peer connection
            currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));

            peer.ontrack = (event) => {
                console.log('Remote track received');
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: friend._id, candidate: event.candidate });
                }
            };

            peer.onconnectionstatechange = () => {
                console.log('Connection state:', peer.connectionState);
                if (peer.connectionState === 'connected') {
                    setStatus('Connected');
                }
            };

            socket.on('ice_candidate', (candidate) => {
                if (peerRef.current) {
                    peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            if (!isIncoming) {
                const offer = await peer.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await peer.setLocalDescription(offer);
                socket.emit('call_user', {
                    userToCall: friend._id,
                    signalData: offer,
                    from: user.id || user._id,
                    name: user.username
                });

                socket.on('call_accepted', (signal) => {
                    setCallAccepted(true);
                    setStatus('Connected');
                    peer.setRemoteDescription(new RTCSessionDescription(signal));
                });
            }

        } catch (err) {
            console.error('Error starting call:', err);
            setStatus('Failed to access camera/mic');
        }
    };

    // Global listener for end_call
    useEffect(() => {
        const handleEndCall = () => {
            console.log('end_call received');
            stopMedia(streamRef.current);
            onEndCall();
        };

        socket.on('end_call', handleEndCall);
        return () => {
            socket.off('end_call', handleEndCall);
        };
    }, [socket, onEndCall]);

    useEffect(() => {
        console.log('VideoCall mounted');
        isMounted.current = true;
        if (!isIncoming) {
            startCall();
        }

        return () => {
            console.log('VideoCall unmounting');
            isMounted.current = false;
            cleanup(streamRef.current);
        };
    }, []);

    // Attach streams to video elements
    useEffect(() => {
        if (stream && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const answerCall = async () => {
        setCallAccepted(true);
        setStatus('Connecting...');
        try {
            const mediaConstraints = {
                video: {
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const currentStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

            if (!isMounted.current) {
                currentStream.getTracks().forEach(track => track.stop());
                return;
            }

            setStream(currentStream);
            streamRef.current = currentStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = currentStream;

            const peer = new RTCPeerConnection(ICE_SERVERS);
            peerRef.current = peer;

            currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));

            peer.ontrack = (event) => {
                console.log('Remote track received');
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: friend._id, candidate: event.candidate });
                }
            };

            peer.onconnectionstatechange = () => {
                console.log('Connection state:', peer.connectionState);
                if (peer.connectionState === 'connected') {
                    setStatus('Connected');
                }
            };

            socket.on('ice_candidate', (candidate) => {
                if (peerRef.current) {
                    peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            });

            await peer.setRemoteDescription(new RTCSessionDescription(incomingSignal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('answer_call', { signal: answer, to: friend._id });

        } catch (err) {
            console.error('Error answering call:', err);
            setStatus('Failed to answer call');
        }
    };

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isMicOn;
                setIsMicOn(!isMicOn);
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoOn;
                setIsVideoOn(!isVideoOn);
            }
        }
    };

    const endCall = () => {
        console.log('endCall triggered');

        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        stopMedia(streamRef.current);

        if (friend && friend._id) {
            socket.emit('end_call', { to: friend._id });
        }

        onEndCall();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">

                {/* Incoming Call UI */}
                {isIncoming && !callAccepted && (
                    <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-primary-600/50">
                            <span className="text-4xl font-bold text-white">{friend?.username?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">{friend?.username || 'Unknown User'}</h2>
                        <p className="text-dark-muted mb-8 text-lg">Incoming Video Call...</p>
                        <div className="flex gap-6">
                            <button
                                onClick={endCall}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-110 shadow-lg"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>
                            <button
                                onClick={answerCall}
                                className="p-4 rounded-full bg-green-500 hover:bg-green-600 text-white transition-all transform hover:scale-110 shadow-lg animate-bounce"
                            >
                                <Video className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Remote Video */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Waiting for connection */}
                {!remoteStream && callAccepted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <span className="text-2xl font-bold text-white">{friend?.username?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <p className="text-white text-xl font-medium">{status}</p>
                        </div>
                    </div>
                )}

                {/* Caller waiting UI */}
                {!isIncoming && !callAccepted && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="text-center">
                            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg shadow-primary-600/50">
                                <span className="text-4xl font-bold text-white">{friend?.username?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">{friend?.username || 'Unknown User'}</h2>
                            <p className="text-dark-muted mb-8 text-lg">{status}</p>
                            <button
                                onClick={endCall}
                                className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-110 shadow-lg"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Local Video (PiP) */}
                {(callAccepted || !isIncoming) && (
                    <div className="absolute bottom-4 right-4 w-48 aspect-video bg-black rounded-xl overflow-hidden border border-white/20 shadow-lg z-30">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isVideoOn ? 'hidden' : ''}`}
                        />
                        {!isVideoOn && (
                            <div className="w-full h-full flex items-center justify-center bg-dark-bg">
                                <VideoOff className="text-dark-muted" />
                            </div>
                        )}
                    </div>
                )}

                {/* Controls - Clean and simple */}
                {callAccepted && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 z-50">
                        <button
                            onClick={toggleMic}
                            className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
                            title="Toggle Microphone"
                        >
                            {isMicOn ? <Mic /> : <MicOff />}
                        </button>

                        <button
                            onClick={endCall}
                            className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/20"
                            title="End Call"
                        >
                            <PhoneOff className="w-6 h-6" />
                        </button>

                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition-all ${isVideoOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
                            title="Toggle Camera"
                        >
                            {isVideoOn ? <Video /> : <VideoOff />}
                        </button>
                    </div>
                )}
            </div>

            {/* Emergency Close Button */}
            <button
                onClick={endCall}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-full transition-all z-50"
                title="Close Call"
            >
                <X className="w-6 h-6" />
            </button>
        </div>
    );
};
