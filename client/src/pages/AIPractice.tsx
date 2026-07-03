import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, VolumeX, Globe, Bot, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const LANGUAGES = [
    { code: 'en', name: 'English', voiceCode: 'en-US' },
    { code: 'hi', name: 'Hindi', voiceCode: 'hi-IN' },
    { code: 'mr', name: 'Marathi', voiceCode: 'mr-IN' },
    { code: 'es', name: 'Spanish', voiceCode: 'es-ES' },
    { code: 'fr', name: 'French', voiceCode: 'fr-FR' },
    { code: 'de', name: 'German', voiceCode: 'de-DE' },
    { code: 'ja', name: 'Japanese', voiceCode: 'ja-JP' },
    { code: 'ko', name: 'Korean', voiceCode: 'ko-KR' },
    { code: 'zh', name: 'Chinese', voiceCode: 'zh-CN' },
    { code: 'ar', name: 'Arabic', voiceCode: 'ar-SA' },
    { code: 'pt', name: 'Portuguese', voiceCode: 'pt-BR' },
    { code: 'ru', name: 'Russian', voiceCode: 'ru-RU' },
    { code: 'it', name: 'Italian', voiceCode: 'it-IT' }
];

export const AIPractice = () => {
    const { token } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('en');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            const langName = LANGUAGES.find(l => l.code === language)?.name || 'English';
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Hello! I'm your ${langName} practice partner. Start typing or click the microphone to speak. I'll help you practice and correct any mistakes. Let's have a conversation! 🎯`,
                timestamp: new Date()
            }]);
        }
    }, []);

    // Send message to AI
    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const conversationHistory = messages.slice(-6).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/ai-practice/chat`,
                {
                    message: text.trim(),
                    language,
                    conversationHistory
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.data.message,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error('AI Practice error:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I had trouble responding. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    // Speech-to-Text
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser doesn't support speech recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        const langConfig = LANGUAGES.find(l => l.code === language);
        recognition.lang = langConfig?.voiceCode || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
                sendMessage(transcript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // Text-to-Speech
    const speakMessage = (text: string, messageId: string) => {
        if (!window.speechSynthesis) {
            alert("Your browser doesn't support text-to-speech.");
            return;
        }

        // If already speaking this message, stop
        if (speakingMessageId === messageId) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        // Stop any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const langConfig = LANGUAGES.find(l => l.code === language);
        utterance.lang = langConfig?.voiceCode || 'en-US';
        utterance.rate = 0.9;

        // Try to find a matching voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(langConfig?.voiceCode?.split('-')[0] || 'en'));
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
            setSpeakingMessageId(messageId);
        };

        utterance.onend = () => {
            setSpeakingMessageId(null);
        };

        utterance.onerror = () => {
            setSpeakingMessageId(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    // Change language handler
    const handleLanguageChange = (newLang: string) => {
        setLanguage(newLang);
        const langName = LANGUAGES.find(l => l.code === newLang)?.name || 'English';
        setMessages([{
            id: 'welcome-' + newLang,
            role: 'assistant',
            content: `Great! Let's practice ${langName} now. Say something in ${langName} or ask me anything! 🌟`,
            timestamp: new Date()
        }]);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl mx-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">AI Practice Partner</h1>
                        <p className="text-sm text-dark-muted">Practice any language with AI</p>
                    </div>
                </div>

                {/* Language Selector */}
                <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/10">
                    <Globe className="w-5 h-5 text-primary-400" />
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-transparent text-white border-none focus:ring-0 cursor-pointer pr-8"
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code} className="bg-dark-bg text-white">
                                {lang.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chat Container */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Messages Area */}
                <div className="h-[500px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${message.role === 'user'
                                    ? 'bg-primary-600'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                    }`}>
                                    {message.role === 'user' ? (
                                        <User className="w-5 h-5 text-white" />
                                    ) : (
                                        <Bot className="w-5 h-5 text-white" />
                                    )}
                                </div>

                                {/* Message Bubble */}
                                <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                                    <div className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                                        ? 'bg-primary-600 text-white rounded-tr-none'
                                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                                        }`}>
                                        <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    </div>

                                    {/* Speak button for AI messages */}
                                    {message.role === 'assistant' && message.id !== 'welcome' && (
                                        <button
                                            onClick={() => speakMessage(message.content, message.id)}
                                            className={`mt-2 p-2 rounded-lg transition-all ${speakingMessageId === message.id
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-white/5 text-dark-muted hover:text-white hover:bg-white/10'
                                                }`}
                                            title={speakingMessageId === message.id ? 'Stop speaking' : 'Listen'}
                                        >
                                            {speakingMessageId === message.id ? (
                                                <VolumeX className="w-4 h-4" />
                                            ) : (
                                                <Volume2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3 border border-white/5">
                                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-dark-bg/30">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`p-3 rounded-xl transition-all shrink-0 ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-white/5 text-dark-muted hover:text-white hover:bg-white/10'
                                }`}
                            title={isListening ? 'Stop listening' : 'Speak'}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Type in ${LANGUAGES.find(l => l.code === language)?.name || 'English'}...`}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-dark-muted/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`p-3 rounded-xl transition-all shrink-0 ${!input.trim() || isLoading
                                ? 'bg-white/5 text-dark-muted opacity-50 cursor-not-allowed'
                                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20'
                                }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>

                    {/* Listening Indicator */}
                    {isListening && (
                        <p className="text-center text-sm text-primary-400 mt-2 animate-pulse">
                            🎤 Listening... Speak now
                        </p>
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="mt-4 text-center text-sm text-dark-muted">
                <p>💡 Tip: Click the speaker icon on AI messages to hear the pronunciation</p>
            </div>
        </motion.div>
    );
};
