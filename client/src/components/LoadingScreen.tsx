import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server } from 'lucide-react';

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Initializing Neural Network...');

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 500);
                    return 100;
                }
                return prev + 1;
            });
        }, 50); // 5 seconds total load time (simulated)

        const messageTimer = setInterval(() => {
            setMessage(prev => {
                if (prev === 'Initializing Neural Network...') return 'Waking up Server...';
                if (prev === 'Waking up Server...') return 'Loading Language Models...';
                if (prev === 'Loading Language Models...') return 'Connecting to LinguistAI...';
                return 'Initializing Neural Network...';
            });
        }, 1500);

        return () => {
            clearInterval(timer);
            clearInterval(messageTimer);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-dark-bg flex flex-col items-center justify-center">
            <div className="relative">
                {/* Glowing Orb */}
                <div className="absolute inset-0 bg-primary-500/30 blur-3xl rounded-full animate-pulse" />

                {/* Icon */}
                <div className="relative z-10 bg-dark-card p-8 rounded-2xl border border-white/10 shadow-2xl mb-8">
                    <Server className="w-16 h-16 text-primary-400 animate-bounce" />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-64 h-2 bg-dark-surface rounded-full overflow-hidden mb-4 relative">
                <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-glacier-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                />
            </div>

            {/* Text */}
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-glacier-400 mb-2">
                LinguistAI
            </h2>
            <p className="text-glacier-300/80 font-mono text-sm animate-pulse">
                {message}
            </p>
        </div>
    );
};
