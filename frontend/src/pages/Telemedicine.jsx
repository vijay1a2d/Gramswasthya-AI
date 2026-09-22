// ── Telemedicine Page ────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import {
    Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare,
    Send, User, Settings, MoreVertical, PhoneCall, Activity, Calendar
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTeleconsultSync } from '../hooks/useTeleconsultSync'
import Peer from 'simple-peer/simplepeer.min.js'

export default function Telemedicine() {
    const { user } = useAuth()
    const { callStatus, patientRequest, messages, requestCall, acceptCall, endCall, sendMessage } = useTeleconsultSync()

    const [isMuted, setIsMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [showChat, setShowChat] = useState(true)
    
    // Feature States
    const [hasTimedOut, setHasTimedOut] = useState(false)
    const [permissionsGranted, setPermissionsGranted] = useState(false)
    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const [localStream, setLocalStream] = useState(null)
    const [remoteStream, setRemoteStream] = useState(null)
    const [useDemoVideo, setUseDemoVideo] = useState(false)
    const peerRef = useRef(null)
    
    // Chat input state
    const [newMessage, setNewMessage] = useState('')
    const chatEndRef = useRef(null)

    // Derived roles
    const isDoctor = user?.role === 'doctor' || user?.role === 'admin' // Admins can act as doctors here
    const isPatient = user?.role === 'patient'

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // --- TIMEOUT LOGIC ---
    useEffect(() => {
        if (callStatus === 'requested' && isPatient) {
            // Wait 2 minutes (120000ms) before auto-scheduling
            const timer = setTimeout(() => {
                handleEndCall();
                setHasTimedOut(true);
            }, 120000);
            return () => clearTimeout(timer);
        }
    }, [callStatus, isPatient, endCall]);

    // --- PERMISSIONS LOGIC ---
    // --- PERMISSIONS AND WEBRTC LOGIC ---
    useEffect(() => {
        if (callStatus === 'active' && !localStream) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    setLocalStream(stream);
                    setPermissionsGranted(true);
                    
                    // Init WebRTC Peer
                    if (isDoctor) {
                        // Doctor creates offer
                        const peer = new Peer({ initiator: true, stream, trickle: false })
                        peer.on('signal', data => {
                            localStorage.setItem('gs_webrtc_offer', JSON.stringify(data))
                        })
                        peer.on('stream', rStream => {
                            setRemoteStream(rStream)
                        })
                        peerRef.current = peer
                    } else {
                        // Patient waits for offer, then creates answer
                        const peer = new Peer({ initiator: false, stream, trickle: false })
                        peer.on('signal', data => {
                            localStorage.setItem('gs_webrtc_answer', JSON.stringify(data))
                        })
                        peer.on('stream', rStream => {
                            setRemoteStream(rStream)
                        })
                        peerRef.current = peer
                    }
                })
                .catch(err => {
                    console.error("Hardware permissions denied or not available", err);
                    alert("Camera and Microphone permissions are required for the consultation. Please allow access in your browser settings.");
                });
        }
    }, [callStatus, localStream, isDoctor]);
    
    // WebRTC Signaling via localStorage polling
    useEffect(() => {
        if (callStatus !== 'active') return;
        
        const handleStorage = () => {
             if (!peerRef.current) return;
             
             if (isPatient) {
                 const offer = localStorage.getItem('gs_webrtc_offer')
                 if (offer && !peerRef.current._remoteDescription) {
                     peerRef.current.signal(JSON.parse(offer))
                 }
             } else {
                 const answer = localStorage.getItem('gs_webrtc_answer')
                 if (answer && !peerRef.current._remoteDescription) {
                     peerRef.current.signal(JSON.parse(answer))
                 }
             }
        }
        
        window.addEventListener('storage', handleStorage)
        // Check immediately in case it was set just before setup
        const interval = setInterval(handleStorage, 1000)
        
        return () => {
            window.removeEventListener('storage', handleStorage)
            clearInterval(interval)
        }
    }, [callStatus, isPatient])

    // Attach stream to video tag
    useEffect(() => {
        if (localVideoRef.current && localStream && !isVideoOff) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, localVideoRef.current, isVideoOff]);

    useEffect(() => {
        if (remoteVideoRef.current) {
            if (useDemoVideo) {
                // Play stock medical professional video
                remoteVideoRef.current.srcObject = null;
                remoteVideoRef.current.src = "https://assets.mixkit.co/videos/preview/mixkit-medical-professional-checking-on-a-patient-in-a-hospital-40915-large.mp4";
                remoteVideoRef.current.loop = true;
                remoteVideoRef.current.muted = true; // Mute demo video to prevent noise
                remoteVideoRef.current.play().catch(e => console.log("Demo video autoplay prevented", e));
            } else if (remoteStream) {
                remoteVideoRef.current.src = "";
                remoteVideoRef.current.srcObject = remoteStream;
            } else {
                remoteVideoRef.current.src = "";
                remoteVideoRef.current.srcObject = null;
            }
        }
    }, [remoteStream, remoteVideoRef.current, useDemoVideo]);

    const handleEndCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (peerRef.current) {
            peerRef.current.destroy()
            peerRef.current = null
        }
        setRemoteStream(null);
        setPermissionsGranted(false);
        localStorage.removeItem('gs_webrtc_offer')
        localStorage.removeItem('gs_webrtc_answer')
        endCall();
    }

    const handleSendMessage = (e) => {
        e.preventDefault()
        if (!newMessage.trim() || callStatus !== 'active') return

        const senderName = isDoctor ? `Dr. ${user.name}` : 'You'
        sendMessage(senderName, newMessage.trim())
        setNewMessage('')
    }

    const handleRequestCall = () => {
        setHasTimedOut(false)
        requestCall({
            name: user?.name || 'Unknown Patient',
            id: user?.id || 'P123'
        })
    }

    // --- RENDER: Auto-Scheduled State ---
    
    if (hasTimedOut) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center shadow-lg shadow-amber-100/50">
                    <Calendar size={40} className="text-amber-600" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-gray-900">High Request Volume</h2>
                    <p className="text-gray-500 max-w-md mx-auto">All our doctors are currently assisting other patients. We have converted your request into a scheduled appointment to ensure you get care.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setHasTimedOut(false); window.location.href = '/appointments'; }}
                        className="px-8 py-3.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/30 flex items-center gap-2"
                    >
                        View Appointments
                    </button>
                    <button
                        onClick={() => setHasTimedOut(false)}
                        className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                        Back to Teleconsult
                    </button>
                </div>
            </div>
        )
    }

    // --- RENDER: Idle/Waiting States ---

    if (callStatus === 'idle') {
        if (isPatient) {
            return (
                <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center shadow-lg shadow-indigo-100/50">
                        <Video size={40} className="text-indigo-600" />
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-gray-900">Virtual Consultation</h1>
                        <p className="text-gray-500 max-w-md mx-auto">Connect instantly with an available doctor for remote diagnosis and guidance.</p>
                    </div>
                    <button
                        onClick={handleRequestCall}
                        className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-3 transform hover:-translate-y-1"
                    >
                        <PhoneCall size={20} />
                        Request Immediate Consultation
                    </button>
                </div>
            )
        }

        if (isDoctor) {
            return (
                <div className="h-full space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Teleconsultation Dashboard</h1>
                        <p className="text-gray-500">Waiting for patient requests...</p>
                    </div>
                    
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4 relative">
                            {/* Minimalistic ping animation looking for requests */}
                            <div className="absolute inset-0 rounded-full border-2 border-teal-400 opacity-20 animate-ping-slow"></div>
                            <Activity size={28} className="text-teal-600 relative z-10" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">No Active Requests</h3>
                        <p className="text-gray-500 max-w-sm mt-2">You will be notified here when a patient requests an immediate virtual consultation.</p>
                    </div>
                </div>
            )
        }
    }

    if (callStatus === 'requested') {
        if (isPatient) {
            return (
                <div className="h-[70vh] flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin-slow shadow-xl"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Video size={36} className="text-indigo-600" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900 animate-pulse">Contacting Available Doctors...</h2>
                        <p className="text-gray-500">Please wait while we connect you to a medical professional. If no doctors are available within 2 minutes, we will map you to a scheduled appointment.</p>
                    </div>
                    <button
                        onClick={handleEndCall}
                        className="px-6 py-2 border-2 border-red-100 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                        Cancel Request
                    </button>
                </div>
            )
        }

        if (isDoctor) {
             return (
                <div className="h-full space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Incoming Requests</h1>
                            <p className="text-red-500 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                1 Patient waiting
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-100 flex items-center justify-between transform transition-all hover:-translate-y-1 hover:shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
                                {patientRequest?.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{patientRequest?.name}</h3>
                                <p className="text-gray-500 text-sm">Requested at {patientRequest?.time} • Immediate Consultation</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleEndCall}
                                className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={acceptCall}
                                className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
                            >
                                <Video size={18} />
                                Accept Call
                            </button>
                        </div>
                    </div>
                </div>
            )
        }
    }


    // --- RENDER: Active Call State ---

    const remoteName = isDoctor ? patientRequest?.name : 'Dr. Rama Rao' // Fallback for demo
    const localName = 'You'
    const remoteSubtitle = isDoctor ? 'Patient' : 'General Physician'

    return (
        <div className="h-[calc(100vh-80px)] flex gap-4 overflow-hidden bg-gray-50 -m-4 p-4 lg:-m-8 lg:p-6 lg:pb-0">
            {/* Main Video Area */}
            <div className={`flex flex-col flex-1 transition-all duration-300 relative bg-gray-900 rounded-2xl overflow-hidden shadow-xl border border-gray-800`}>

                {/* Top Video Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                        <span className="text-white font-medium drop-shadow-md">Live</span>
                        <span className="bg-black/40 text-white/90 text-xs px-2 py-1 rounded backdrop-blur-md ml-2 border border-white/10">GramSwasthya Secure Call</span>
                    </div>
                    <div className="flex gap-2">
                         <button className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur text-white flex items-center justify-center transition-all border border-white/10 text-xs px-3 w-auto gap-2">
                             {patientRequest?.id && <span>ID: {patientRequest.id.slice(-4)}</span>}
                        </button>
                    </div>
                </div>

                {/* Main Remote Feed */}
                <div className="flex-1 relative w-full h-full bg-[#111]">
                    {(remoteStream || useDemoVideo) ? (
                        <video 
                            ref={remoteVideoRef}
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                            <User size={80} className="text-white/10 mb-6" />
                            <p className="text-white/40 text-lg font-medium tracking-wider uppercase">{remoteName} STREAM</p>
                            <p className="text-white/30 text-sm mt-2 animate-pulse">Connecting to remote video...</p>
                        </div>
                    )}

                    {/* Remote Name Tag */}
                    <div className="absolute bottom-6 left-6 bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-white">
                        <p className="font-semibold text-sm">{remoteName}</p>
                        <p className="text-xs text-blue-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {remoteSubtitle}</p>
                    </div>

                    {/* Local Feed PIP */}
                    <div className="absolute bottom-6 right-6 w-48 h-64 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 transition-transform hover:scale-105 cursor-pointer z-20">
                        {isVideoOff ? (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                                    <User size={24} className="text-gray-400" />
                                </div>
                            </div>
                        ) : (
                            <div className={`w-full h-full bg-gradient-to-t ${isDoctor ? 'from-blue-900 to-indigo-800' : 'from-emerald-900 to-teal-800'} relative`}>
                                <video 
                                    ref={localVideoRef}
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover"
                                />
                                {/* Local Name Tag */}
                                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur text-white text-[10px] px-2 py-1 rounded">{localName}</div>
                            </div>
                        )}
                        {isMuted && (
                            <div className="absolute top-2 right-2 bg-red-500 rounded p-1 shadow">
                                <MicOff size={12} className="text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Call Controls */}
                <div className="px-6 py-4 bg-gray-900 border-t border-gray-800 flex justify-center items-center gap-4 z-10">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'}`}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                    <button
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'}`}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                    <button
                        onClick={handleEndCall}
                        className="w-16 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    >
                        <PhoneOff size={24} />
                    </button>

                    <div className="w-px h-8 bg-gray-700 mx-2" />

                    <button
                        onClick={() => setUseDemoVideo(!useDemoVideo)}
                        title="Toggle Demo Video Feed"
                        className={`px-4 h-12 rounded-xl font-bold flex items-center justify-center transition-all ${useDemoVideo ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
                    >
                        {useDemoVideo ? 'Disable Demo' : 'Play Demo Video'}
                    </button>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showChat ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
                <div className="w-96 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-300 transform translate-x-0">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="font-bold text-gray-900">Consultation Chat</h3>
                            <p className="text-xs text-gray-500">Messages are end-to-end encrypted</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                                <MessageSquare size={32} className="mb-2 opacity-50" />
                                <p>No messages yet.</p>
                                <p>Say hello to start the conversation!</p>
                            </div>
                        )}
                        {messages.map((msg) => {
                            const isMe = msg.sender === 'You' || (isDoctor && msg.sender.startsWith('Dr.')) || (isPatient && msg.sender === 'You')
                            // Adjust alignment based on who sent it relative to current user
                            const alignSelfEnd = msg.sender === (isDoctor ? `Dr. ${user.name}` : 'You')

                            return (
                                <div key={msg.id} className={`flex w-full ${alignSelfEnd ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex flex-col max-w-[85%] ${alignSelfEnd ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-600">{msg.sender}</span>
                                            <span className="text-[10px] text-gray-400">{msg.time}</span>
                                        </div>
                                        <div className={`px-4 py-2.5 rounded-2xl ${alignSelfEnd
                                            ? 'bg-primary text-white rounded-tr-sm shadow-md shadow-primary/10'
                                            : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                                            }`}>
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-gray-100">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-gray-100 border-none rounded-full py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 disabled:bg-gray-400 transition-colors"
                            >
                                <Send size={14} className="ml-0.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
