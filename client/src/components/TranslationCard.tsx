import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, Sparkles, Copy, Loader2, Mic, MicOff, Volume2, Upload, FileText, Download, Image as ImageIcon, Lock, Bookmark } from 'lucide-react';
import { jsPDF } from "jspdf";
import { LanguageSelector } from './LanguageSelector';
import { HistoryModal } from './HistoryModal';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ReactTransliterate } from "react-transliterate";
import "react-transliterate/dist/index.css";

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'mr', name: 'Marathi' },
];

const DIALECTS = [
    "Standard",
    "Formal",
    "Informal",
    "Rural (Varhadi - Marathi)",
    "Urban (Mumbaiya - Hindi/Marathi)",
    "Pure/Shuddh"
];

// Add type definition for Web Speech API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const TranslationCard = () => {
    const { user, isAuthenticated } = useAuth();
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('mr');
    const [dialect, setDialect] = useState('Standard');
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [activeTab, setActiveTab] = useState<'text' | 'document'>('text');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const recognitionRef = useRef<any>(null);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && showHistory) {
            fetchHistory();
        }
    }, [isAuthenticated, showHistory]);

    const fetchHistory = async () => {
        setIsHistoryLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/history?email=${user?.email}`);
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/history/${id}?email=${user?.email}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setHistory(prev => prev.filter(item => item._id !== id));
            }
        } catch (error) {
            console.error("Failed to delete history item", error);
        }
    };

    const handleClearHistory = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/history?email=${user?.email}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setHistory([]);
            }
        } catch (error) {
            console.error("Failed to clear history", error);
        }
    };

    const handleSaveHistory = async () => {
        if (!outputText || !isAuthenticated) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/history?email=${user?.email}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_lang: sourceLang,
                    target_lang: targetLang,
                    original_text: activeTab === 'text' ? inputText : `[Document] ${selectedFile?.name || 'Unknown File'}`,
                    translated_text: outputText,
                    email: user?.email
                }),
            });

            const data = await response.json();
            if (response.ok) {
                if (data.warning) {
                    alert(data.warning);
                } else {
                    alert("Translation saved to history!");
                }
                // Refresh history if open
                if (showHistory) fetchHistory();
            } else {
                console.error("Failed to save history", data);
                alert("Failed to save history: " + data.message);
            }
        } catch (error) {
            console.error("Failed to save history", error);
            alert("Failed to save history");
        }
    };

    useEffect(() => {
        // Pre-load voices (Chrome requires this)
        const loadVoices = () => {
            window.speechSynthesis.getVoices();
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    useEffect(() => {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputText((prev) => prev + (prev ? " " : "") + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Set language based on sourceLang
            let langCode = sourceLang;
            if (sourceLang === 'hi') langCode = 'hi-IN';
            if (sourceLang === 'mr') langCode = 'mr-IN';
            if (sourceLang === 'en') langCode = 'en-US';

            recognitionRef.current.lang = langCode;
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSpeak = () => {
        if (!outputText) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any current speech

            const utterance = new SpeechSynthesisUtterance(outputText);

            // Set language
            let langCode = targetLang;
            if (targetLang === 'hi') langCode = 'hi-IN';
            if (targetLang === 'mr') langCode = 'mr-IN';
            if (targetLang === 'en') langCode = 'en-US';

            utterance.lang = langCode;

            // Voice Selection Logic
            const voices = window.speechSynthesis.getVoices();

            // 1. Filter by language
            const langVoices = voices.filter(v => v.lang.includes(langCode));

            if (langVoices.length > 0) {
                // 2. Try to find a male voice (common names or keywords)
                // "Hemant" is a common Microsoft Hindi Male voice. "Kalpana" is female.
                // Google voices often don't specify gender in name, but "Google Hindi" is usually female.
                // We look for "Male" keyword or specific known male voice names.
                let selectedVoice = langVoices.find(v =>
                    v.name.toLowerCase().includes('male') ||
                    v.name.includes('Hemant') ||
                    v.name.includes('David') || // English Male
                    v.name.includes('Rishi') // Sometimes available
                );

                // 3. If no male voice, prioritize "Microsoft" or "Google" voices (usually better quality)
                if (!selectedVoice) {
                    selectedVoice = langVoices.find(v => v.name.includes('Microsoft') || v.name.includes('Google'));
                }

                // 4. Fallback to the first available voice for this language
                if (!selectedVoice) {
                    selectedVoice = langVoices[0];
                }

                utterance.voice = selectedVoice;
                console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
            } else {
                console.warn(`No specific voice found for ${langCode}. Using default.`);
            }

            window.speechSynthesis.speak(utterance);
        } else {
            alert("Text-to-speech is not supported in this browser.");
        }
    };

    const handleTranslate = async () => {
        if (activeTab === 'text' && !inputText.trim()) return;
        if (activeTab === 'document' && !selectedFile) return;

        setIsLoading(true);
        try {
            let data;
            if (activeTab === 'text') {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/translate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: inputText,
                        source_lang: sourceLang,
                        target_lang: targetLang,
                        dialect: dialect,
                        email: user?.email, // Send email for history tracking
                    }),
                });
                data = await response.json();
            } else {
                const formData = new FormData();
                formData.append('file', selectedFile!);
                formData.append('source_lang', sourceLang);
                formData.append('target_lang', targetLang);
                formData.append('dialect', dialect);
                if (user?.email) formData.append('email', user.email);

                const response = await fetch(`${import.meta.env.VITE_API_URL}/translate/document`, {
                    method: 'POST',
                    body: formData,
                });
                data = await response.json();
            }

            if (data.translated_text) {
                setOutputText(data.translated_text);
                // Refresh history if open or just to keep sync
                if (isAuthenticated && showHistory) {
                    fetchHistory();
                }
            } else if (data.detail) {
                console.error(data.detail);
                setOutputText("Error: " + data.detail);
            }
        } catch (error) {
            console.error("Translation failed", error);
            setOutputText("Translation failed. Is the backend running?");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!outputText) return;
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(16);
        doc.text("LinguistAI Translation", 10, 10);

        // Add metadata
        doc.setFontSize(10);
        doc.text(`Source: ${LANGUAGES.find(l => l.code === sourceLang)?.name} | Target: ${LANGUAGES.find(l => l.code === targetLang)?.name}`, 10, 20);
        doc.text(`Dialect: ${dialect}`, 10, 25);

        // Add content
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(outputText, 180);
        doc.text(splitText, 10, 35);

        doc.save("translation.pdf");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSwapLanguages = () => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setInputText(outputText);
        setOutputText(inputText);
    };

    return (
        <div className="w-full max-w-6xl mx-auto perspective-1000">
            <motion.div
                initial={{ opacity: 0, rotateX: 20, y: 100 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="glass-card p-4 md:p-10 relative overflow-hidden holographic-border"
            >
                {/* Holographic Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none" />

                {/* History Button */}
                {isAuthenticated && (
                    <div className="absolute top-6 right-6 z-20">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowHistory(true)}
                            className="p-2 rounded-lg bg-dark-surface/50 hover:bg-primary-500/20 text-dark-muted hover:text-primary-400 border border-white/10 transition-all"
                            title="Bookmarks"
                        >
                            <Bookmark className="w-5 h-5" />
                        </motion.button>
                    </div>
                )}

                <HistoryModal
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    history={history}
                    onDelete={handleDeleteHistory}
                    onClearAll={handleClearHistory}
                    isLoading={isHistoryLoading}
                />

                {/* Tabs */}
                <div className="flex justify-center mb-8 relative z-10">
                    <div className="bg-dark-surface/50 p-1 rounded-xl border border-white/10 backdrop-blur-md flex">
                        <button
                            onClick={() => setActiveTab('text')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'text'
                                ? 'bg-primary-600 text-white shadow-lg'
                                : 'text-dark-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Text
                        </button>
                        <button
                            onClick={() => setActiveTab('document')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'document'
                                ? 'bg-primary-600 text-white shadow-lg'
                                : 'text-dark-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Upload className="w-4 h-4" />
                            Document {!isAuthenticated && <Lock className="w-3 h-3 ml-1" />}
                        </button>
                    </div>
                </div>

                {/* Controls Header */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-end mb-8 relative z-10">
                    <LanguageSelector
                        label="Translate from"
                        value={sourceLang}
                        onChange={setSourceLang}
                        options={LANGUAGES}
                    />

                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 180 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSwapLanguages}
                        className="p-4 rounded-full bg-dark-surface/50 hover:bg-primary-500/20 border border-white/10 hover:border-primary-500/50 transition-all shadow-lg hover:shadow-primary-500/30 group mx-auto rotate-90 lg:rotate-0 backdrop-blur-md"
                    >
                        <ArrowRightLeft className="w-5 h-5 text-dark-muted group-hover:text-primary-400 transition-colors" />
                    </motion.button>

                    <LanguageSelector
                        label="Translate to"
                        value={targetLang}
                        onChange={setTargetLang}
                        options={LANGUAGES}
                    />
                </div>

                {/* Dialect Selection */}
                <div className="mb-8 p-4 rounded-xl bg-dark-surface/20 border border-white/5 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <label className="text-primary-400 text-sm font-semibold tracking-wide uppercase mb-3 flex items-center gap-2 relative z-10">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        Select Dialect / Style
                    </label>
                    <div className="flex flex-wrap gap-3 relative z-10">
                        {DIALECTS.map((d) => (
                            <motion.button
                                key={d}
                                onClick={() => setDialect(d)}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden ${dialect === d
                                    ? 'bg-primary-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                                    : 'bg-dark-surface/50 text-dark-muted hover:bg-dark-surface/80 hover:text-white border border-white/5 hover:border-white/20'
                                    }`}
                            >
                                {dialect === d && (
                                    <motion.div
                                        layoutId="activeDialect"
                                        className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 -z-10"
                                    />
                                )}
                                {d}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Input/Output Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    <div className="relative group">
                        <div className="relative h-full">
                            {activeTab === 'text' ? (
                                <>
                                    {(sourceLang === 'hi' || sourceLang === 'mr') ? (
                                        <ReactTransliterate
                                            value={inputText}
                                            onChangeText={(text) => setInputText(text)}
                                            lang={sourceLang}
                                            placeholder="Enter text here... (Type in English to transliterate)"
                                            className="w-full h-60 md:h-80 bg-dark-input backdrop-blur-md border border-white/10 rounded-xl p-4 md:p-6 resize-none focus:outline-none focus:border-primary-500/50 focus:bg-dark-input/80 transition-all text-base md:text-lg placeholder-dark-muted font-normal leading-relaxed text-white shadow-inner"
                                            containerClassName="w-full h-full"
                                        />
                                    ) : (
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Enter text here..."
                                            className="w-full h-60 md:h-80 bg-dark-input backdrop-blur-md border border-white/10 rounded-xl p-4 md:p-6 resize-none focus:outline-none focus:border-primary-500/50 focus:bg-dark-input/80 transition-all text-base md:text-lg placeholder-dark-muted font-normal leading-relaxed text-white shadow-inner"
                                        />
                                    )}
                                    <div className="absolute bottom-4 right-4 text-xs text-dark-muted font-mono bg-black/20 px-2 py-1 rounded backdrop-blur-sm">
                                        {inputText.length} chars
                                    </div>

                                    {/* Voice Input Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={toggleListening}
                                        className={`absolute bottom-4 left-4 p-3 rounded-full transition-all duration-300 backdrop-blur-sm ${isListening
                                            ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                            : 'bg-dark-surface/50 text-dark-muted hover:text-primary-400 hover:bg-primary-500/10 border border-white/5'
                                            }`}
                                        title="Voice Input"
                                    >
                                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </motion.button>
                                </>
                            ) : (
                                <div className="w-full h-80 bg-dark-input backdrop-blur-md border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center border-dashed border-2 border-white/20 hover:border-primary-500/50 transition-all group-hover:bg-dark-input/80 relative overflow-hidden">
                                    {!isAuthenticated && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                                            <Lock className="w-12 h-12 text-primary-400 mb-4" />
                                            <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
                                            <p className="text-dark-muted mb-6 max-w-xs">
                                                Document translation is available only for registered users.
                                            </p>
                                            <Link to="/login">
                                                <button className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-all shadow-lg shadow-primary-600/20">
                                                    Login to Access
                                                </button>
                                            </Link>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept=".pdf,image/*,.txt"
                                        disabled={!isAuthenticated}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`flex flex-col items-center ${!isAuthenticated ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                                    >
                                        <div className="p-4 rounded-full bg-primary-500/10 mb-4 group-hover:scale-110 transition-transform duration-300">
                                            {selectedFile ? (
                                                selectedFile.type.startsWith('image/') ? <ImageIcon className="w-8 h-8 text-primary-400" /> : <FileText className="w-8 h-8 text-primary-400" />
                                            ) : (
                                                <Upload className="w-8 h-8 text-primary-400" />
                                            )}
                                        </div>
                                        <span className="text-lg font-medium text-white mb-2">
                                            {selectedFile ? selectedFile.name : "Upload Document"}
                                        </span>
                                        <span className="text-sm text-dark-muted">
                                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "PDF, Images, or Text files"}
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="w-full h-60 md:h-80 bg-dark-card/30 backdrop-blur-md border border-white/10 rounded-xl p-4 md:p-6 relative overflow-hidden flex flex-col shadow-inner transition-all duration-500 group-hover:bg-dark-card/40">
                            <AnimatePresence>
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center bg-dark-card/80 backdrop-blur-sm z-20"
                                    >
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-primary-500 blur-xl opacity-20 animate-pulse"></div>
                                                <Loader2 className="w-12 h-12 text-primary-400 animate-spin relative z-10" />
                                            </div>
                                            <span className="text-sm text-primary-400 font-medium tracking-wider animate-pulse">TRANSLATING...</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex-grow overflow-auto custom-scrollbar relative z-10">
                                {outputText ? (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-lg leading-relaxed text-white/90 font-normal"
                                    >
                                        {outputText}
                                    </motion.p>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-dark-muted italic">
                                        <p>Translation will appear here...</p>
                                    </div>
                                )}
                            </div>

                            {outputText && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 justify-end mt-4 pt-4 border-t border-white/5"
                                >
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleSpeak}
                                        className="p-2.5 rounded-lg bg-dark-surface/50 hover:bg-primary-500/10 text-dark-muted hover:text-primary-400 transition-all border border-transparent hover:border-primary-500/20"
                                        title="Listen"
                                    >
                                        <Volume2 className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => navigator.clipboard.writeText(outputText)}
                                        className="p-2.5 rounded-lg bg-dark-surface/50 hover:bg-primary-500/10 text-dark-muted hover:text-primary-400 transition-all border border-transparent hover:border-primary-500/20"
                                        title="Copy to clipboard"
                                    >
                                        <Copy className="w-5 h-5" />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleDownloadPDF}
                                        className="p-2.5 rounded-lg bg-dark-surface/50 hover:bg-primary-500/10 text-dark-muted hover:text-primary-400 transition-all border border-transparent hover:border-primary-500/20"
                                        title="Download PDF"
                                    >
                                        <Download className="w-5 h-5" />
                                    </motion.button>
                                    {isAuthenticated && (
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleSaveHistory}
                                            className="p-2.5 rounded-lg bg-dark-surface/50 hover:bg-primary-500/10 text-dark-muted hover:text-primary-400 transition-all border border-transparent hover:border-primary-500/20"
                                            title="Save to History"
                                        >
                                            <Bookmark className="w-5 h-5" />
                                        </motion.button>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-8 md:mt-10 flex justify-center relative z-10">
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleTranslate}
                        disabled={isLoading || (activeTab === 'text' && !inputText) || (activeTab === 'document' && !selectedFile)}
                        className="group relative px-8 py-4 md:px-10 md:py-5 bg-transparent rounded-full font-bold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />

                        <span className="relative flex items-center justify-center gap-3 text-base md:text-lg tracking-wide">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            TRANSLATE NOW
                        </span>
                    </motion.button>
                </div>

            </motion.div>
        </div>
    );
};
