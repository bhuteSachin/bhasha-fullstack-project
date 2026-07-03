import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ArrowRight, Bookmark } from 'lucide-react';

interface HistoryItem {
    _id: string;
    source_lang: string;
    target_lang: string;
    original_text: string;
    translated_text: string;
    timestamp: string;
}

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onDelete: (id: string) => void;
    onClearAll: () => void;
    isLoading: boolean;
}

export const HistoryModal = ({ isOpen, onClose, history, onDelete, onClearAll, isLoading }: HistoryModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-[80vh] bg-dark-bg border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-dark-surface/50 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <Bookmark className="w-6 h-6 text-primary-400" />
                                <h2 className="text-xl font-bold text-white">Bookmarks</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/5 text-dark-muted hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full text-dark-muted">
                                    Loading bookmarks...
                                </div>
                            ) : history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-dark-muted gap-4">
                                    <Bookmark className="w-12 h-12 opacity-20" />
                                    <p>No bookmarks found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((item) => (
                                        <motion.div
                                            key={item._id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-dark-surface/30 border border-white/5 rounded-xl p-4 hover:border-primary-500/30 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2 text-xs font-medium text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                                                    <span className="uppercase">{item.source_lang}</span>
                                                    <ArrowRight className="w-3 h-3" />
                                                    <span className="uppercase">{item.target_lang}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-dark-muted">
                                                        {new Date(item.timestamp).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => onDelete(item._id)}
                                                        className="text-dark-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-dark-muted text-sm">{item.original_text}</p>
                                                <div className="h-px bg-white/5" />
                                                <p className="text-white text-sm">{item.translated_text}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {history.length > 0 && (
                            <div className="p-4 border-t border-white/10 bg-dark-surface/50 backdrop-blur-md flex justify-end">
                                <button
                                    onClick={onClearAll}
                                    className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear All Bookmarks
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
