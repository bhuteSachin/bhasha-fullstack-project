import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';
import { Send, Globe, Mic, MicOff, Phone, Video, MessageSquare, Paperclip, FileText, Music, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatSidebar } from '../components/ChatSidebar';
import { VideoCall } from '../components/VideoCall';
import axios from 'axios';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Message {
    id: string;
    text: string;
    author: string;
    time: string;
    lang: string;
    type?: 'text' | 'image' | 'document' | 'audio';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    translations?: {
        [key: string]: string;
    };
}

interface User {
    _id: string;
    id?: string;
    username: string;
    email: string;
    isOnline?: boolean;
    lastSeen?: string;
    isPremium?: boolean;
}

export const Chat = () => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [room, setRoom] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [displayLang, setDisplayLang] = useState('en');
    const [inputLang, setInputLang] = useState('en');
    const [isListening, setIsListening] = useState(false);
    const [isCallMode, setIsCallMode] = useState(false);

    const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Video Call State
    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const [incomingCallSignal, setIncomingCallSignal] = useState<any>(null);
    const [incomingCallFrom, setIncomingCallFrom] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const languages = [
        { code: 'en', name: 'English', voice: 'en-US' },
        { code: 'hi', name: 'Hindi', voice: 'hi-IN' },
        { code: 'mr', name: 'Marathi', voice: 'hi-IN' },
    ];

    // Socket Connection
    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);
        return () => { newSocket.disconnect(); };
    }, []);

    // Handle Messages, Calls & Status
    useEffect(() => {
        if (!socket) return;

        socket.on('receive_message', (data: Message) => {
            setMessages((prev) => [...prev, data]);
            if (isCallMode && data.author !== user?.email && data.type === 'text') {
                const textToSpeak = getDisplayedText(data);
                speakText(textToSpeak, displayLang);
            }
        });

        socket.on('call_user', (data) => {
            console.log("Incoming call data:", data);
            if (data.signal && data.from) {
                setIncomingCallSignal(data.signal);
                setIncomingCallFrom({ _id: data.from, username: data.name || 'Unknown' });
                setIsVideoCallActive(true);
            } else {
                console.error("Invalid incoming call data:", data);
            }
        });

        socket.on('user_status_change', (data: { userId: string, isOnline: boolean, lastSeen?: string }) => {
            if (selectedFriend && selectedFriend._id === data.userId) {
                setSelectedFriend(prev => prev ? { ...prev, isOnline: data.isOnline, lastSeen: data.lastSeen } : null);
            }
        });

        return () => {
            socket.off('receive_message');
            socket.off('call_user');
            socket.off('user_status_change');
        };
    }, [socket, isCallMode, displayLang, user, selectedFriend]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Join Personal Room for Calls
    useEffect(() => {
        if (user && socket) {
            const userId = user.id || user._id;
            console.log("Joining personal room:", userId);
            socket.emit('join_room', userId);
        } else {
            console.log("Waiting to join personal room. User:", user, "Socket:", !!socket);
        }
    }, [user, socket]);

    // Join Room & Fetch History when friend selected
    useEffect(() => {
        if (selectedFriend && user && socket) {
            const friendId = selectedFriend._id;
            const myId = user.id;
            const newRoom = [myId, friendId].sort().join('_');
            setRoom(newRoom);
            setMessages([]);
            socket.emit('join_room', newRoom);

            // Fetch History
            fetchHistory(friendId);

            // Fetch latest status
            fetchFriendStatus(friendId);
        }
    }, [selectedFriend?._id, user, socket]); // Only depend on ID change

    const fetchFriendStatus = async (friendId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/${friendId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setSelectedFriend(prev => prev ? { ...prev, isOnline: res.data.isOnline, lastSeen: res.data.lastSeen } : null);
            }
        } catch (err) {
            console.error("Failed to fetch friend status", err);
        }
    };

    const fetchHistory = async (friendId: string) => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/history/${friendId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    };

    const speakText = (text: string, langCode: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langConfig = languages.find(l => l.code === langCode);
        utterance.lang = langConfig?.voice || 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.includes(utterance.lang));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    };

    const startListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            if (isCallMode) setIsCallMode(false);
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert("Browser doesn't support speech recognition."); return; }

        const recognition = new SpeechRecognition();
        recognition.lang = inputLang === 'hi' ? 'hi-IN' : inputLang === 'mr' ? 'mr-IN' : 'en-US';
        recognition.continuous = isCallMode;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            if (isCallMode) recognition.start();
            else setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (isCallMode) {
                if (transcript.trim() && socket) {
                    const messageData = {
                        room,
                        author: user?.email || 'Anonymous',
                        message: transcript,
                        lang: inputLang,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'text'
                    };
                    socket.emit('send_message', messageData);
                }
            } else {
                setMessage((prev) => prev + ' ' + transcript);
            }
        };
        recognitionRef.current = recognition;
        recognition.start();
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (message !== '' && socket) {
            const messageData = {
                room,
                author: user?.email || 'Anonymous',
                message: message,
                lang: inputLang,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text'
            };
            await socket.emit('send_message', messageData);
            setMessage('');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !socket) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            const { fileUrl, fileName, fileSize, mimeType } = res.data;
            let type: 'image' | 'audio' | 'document' = 'document';

            if (mimeType.startsWith('image/')) type = 'image';
            else if (mimeType.startsWith('audio/')) type = 'audio';

            const messageData = {
                room,
                author: user?.email || 'Anonymous',
                message: '', // No text for file messages
                lang: inputLang,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type,
                fileUrl: `${import.meta.env.VITE_API_URL}${fileUrl}`,
                fileName,
                fileSize
            };

            await socket.emit('send_message', messageData);

        } catch (err) {
            console.error("File upload failed:", err);
            alert("Failed to upload file.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getDisplayedText = (msg: Message) => {
        if (msg.translations && msg.translations[displayLang]) {
            return msg.translations[displayLang];
        }
        return msg.text;
    };

    const startVideoCall = () => {
        setIsVideoCallActive(true);
    };

    const endVideoCall = () => {
        setIsVideoCallActive(false);
        setIncomingCallSignal(null);
        setIncomingCallFrom(null);
    };

    const renderMessageContent = (msg: Message) => {
        switch (msg.type) {
            case 'image':
                return (
                    <div className="space-y-2">
                        <img src={msg.fileUrl} alt="Shared image" className="max-w-xs rounded-lg border border-white/10" />
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-300 hover:underline block">
                            View Full Size
                        </a>
                    </div>
                );
            case 'audio':
                return (
                    <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="p-2 bg-white/10 rounded-full">
                            <Music className="w-5 h-5" />
                        </div>
                        <audio controls src={msg.fileUrl} className="h-8 w-48" />
                    </div>
                );
            case 'document':
                return (
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10">
                        <FileText className="w-8 h-8 text-primary-400" />
                        <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">{msg.fileName}</p>
                            <a href={msg.fileUrl} download target="_blank" rel="noopener noreferrer" className="text-xs text-primary-300 hover:underline">
                                Download
                            </a>
                        </div>
                    </div>
                );
            default:
                return (
                    <>
                        <p className="text-lg leading-relaxed">{getDisplayedText(msg)}</p>
                        {msg.translations && displayLang !== 'en' && (
                            <p className="text-xs mt-2 pt-2 border-t border-white/10 opacity-50">
                                Original: {msg.text}
                            </p>
                        )}
                    </>
                );
        }
    };

    // Helper to format last seen
    const formatLastSeen = (dateString?: string) => {
        if (!dateString) return 'Offline';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Last seen just now';
        if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
        return `Last seen ${date.toLocaleDateString()}`;
    };

    return (
        <div className="w-full max-w-6xl mx-auto h-[calc(100dvh-100px)] md:h-[85vh] flex bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">

            {/* Video Call Overlay */}
            {isVideoCallActive && socket && user && (selectedFriend || incomingCallFrom) && (
                <VideoCall
                    socket={socket}
                    room={room}
                    user={user}
                    friend={incomingCallFrom || selectedFriend}
                    onEndCall={endVideoCall}
                    isIncoming={!!incomingCallSignal}
                    incomingSignal={incomingCallSignal}
                />
            )}

            {/* Sidebar - Hidden on mobile when chat is active */}
            <div className={`${selectedFriend ? 'hidden md:block' : 'w-full md:w-80'} h-full border-r border-white/10`}>
                <ChatSidebar onSelectUser={setSelectedFriend} selectedUserId={selectedFriend?._id} socket={socket} />
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-dark-bg/20 ${!selectedFriend ? 'hidden md:flex' : 'w-full'}`}>
                {!selectedFriend ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-dark-muted p-6 text-center">
                        <div className="p-6 bg-white/5 rounded-full mb-4">
                            <MessageSquare className="w-12 h-12 opacity-50" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Select a friend to chat</h2>
                        <p>Search for users or check your friends list.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="p-3 md:p-4 border-b border-white/10 flex items-center justify-between bg-dark-bg/30 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedFriend(null)}
                                    className="md:hidden p-2 -ml-2 text-dark-muted hover:text-white"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="relative">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm md:text-base">
                                        {selectedFriend.username[0].toUpperCase()}
                                    </div>
                                    {selectedFriend.isOnline && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-dark-bg"></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-sm md:text-base">{selectedFriend.username}</h3>
                                    <p className="text-[10px] md:text-xs text-dark-muted">
                                        {selectedFriend.isOnline ? 'Online' : formatLastSeen(selectedFriend.lastSeen)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 md:gap-2">
                                <button
                                    onClick={() => {
                                        if (isCallMode) {
                                            setIsCallMode(false);
                                            recognitionRef.current?.stop();
                                            setIsListening(false);
                                            window.speechSynthesis.cancel();
                                        } else {
                                            setIsCallMode(true);
                                            setTimeout(() => {
                                                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                                                const recognition = new SpeechRecognition();
                                                recognition.lang = inputLang === 'hi' ? 'hi-IN' : inputLang === 'mr' ? 'mr-IN' : 'en-US';
                                                recognition.continuous = true;
                                                recognition.interimResults = false;
                                                recognition.onstart = () => setIsListening(true);
                                                recognition.onend = () => { if (true) recognition.start(); };
                                                recognition.onresult = (event: any) => {
                                                    const transcript = event.results[event.results.length - 1][0].transcript;
                                                    if (transcript.trim() && socket) {
                                                        const messageData = {
                                                            room,
                                                            author: user?.email || 'Anonymous',
                                                            message: transcript,
                                                            lang: inputLang,
                                                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                                            type: 'text'
                                                        };
                                                        socket.emit('send_message', messageData);
                                                    }
                                                };
                                                recognitionRef.current = recognition;
                                                recognition.start();
                                            }, 100);
                                        }
                                    }}
                                    className={`p-2 rounded-lg transition-all ${isCallMode ? 'bg-green-500 text-white animate-pulse' : 'bg-white/5 text-dark-muted hover:text-white'}`}
                                    title="Voice Call (Translated)"
                                >
                                    <Phone className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                                <button
                                    onClick={startVideoCall}
                                    className="p-2 bg-white/5 text-dark-muted hover:text-white rounded-lg transition-all"
                                    title="Video Call"
                                >
                                    <Video className="w-4 h-4 md:w-5 md:h-5" />
                                </button>

                                <div className="h-6 w-px bg-white/10 mx-1 md:mx-2" />

                                <div className="flex items-center gap-1 md:gap-2 bg-dark-bg/50 rounded-lg p-1 border border-white/5">
                                    <Globe className="w-3 h-3 md:w-4 md:h-4 text-primary-400 ml-1" />
                                    <select
                                        value={displayLang}
                                        onChange={(e) => setDisplayLang(e.target.value)}
                                        className="bg-transparent text-xs md:text-sm text-white border-none focus:ring-0 cursor-pointer py-1 pr-6 md:pr-8 max-w-[80px] md:max-w-none"
                                    >
                                        {languages.map((lang) => (
                                            <option key={lang.code} value={lang.code} className="bg-dark-bg text-white">
                                                {lang.code.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg, index) => {
                                const isMe = msg.author === (user?.email || 'Anonymous');
                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 md:p-4 ${isMe
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] md:text-xs">
                                                <span className="font-medium truncate max-w-[100px]">{msg.author}</span>
                                                <span>•</span>
                                                <span>{msg.time}</span>
                                            </div>

                                            {renderMessageContent(msg)}

                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 md:p-4 border-t border-white/10 bg-dark-bg/30 backdrop-blur-md">
                            <form onSubmit={sendMessage} className="flex gap-2 items-center">
                                <div className="relative shrink-0">
                                    <select
                                        value={inputLang}
                                        onChange={(e) => setInputLang(e.target.value)}
                                        className="appearance-none bg-dark-bg/50 border border-white/10 rounded-xl pl-2 md:pl-3 pr-6 md:pr-8 py-2 md:py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer text-xs md:text-sm w-16 md:w-auto"
                                    >
                                        <option value="en">EN</option>
                                        <option value="hi">HI</option>
                                        <option value="mr">MR</option>
                                    </select>
                                    <div className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 pointer-events-none text-dark-muted">
                                        <span className="text-[10px] md:text-xs">▼</span>
                                    </div>
                                </div>

                                {/* File Attachment */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className={`p-2 md:p-3 rounded-xl transition-all cursor-pointer shrink-0 ${isUploading ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-white/5 text-dark-muted hover:text-white'}`}
                                >
                                    <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                                </label>

                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type..."
                                    className="flex-1 min-w-0 bg-dark-bg/50 border border-white/10 rounded-xl px-3 md:px-4 py-2 md:py-3 text-white placeholder:text-dark-muted/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm"
                                />

                                {/* Mic Button - Hide when typing on mobile to save space */}
                                {!message.trim() && (
                                    <button
                                        type="button"
                                        onClick={startListening}
                                        className={`p-2 md:p-3 rounded-xl transition-all shrink-0 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-dark-muted hover:text-white'}`}
                                    >
                                        {isListening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={!message.trim()}
                                    className={`p-2 md:p-3 rounded-xl transition-all shadow-lg shrink-0 ${!message.trim()
                                        ? 'bg-white/5 text-dark-muted opacity-50 cursor-not-allowed'
                                        : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/20'}`}
                                >
                                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div >
        </div >
    );
};
