import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const Background = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 150 };
    const springX = useSpring(mouseX, springConfig);
    const springY = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-dark-bg">
            {/* Ambient Glows - Lavender & Glacier */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-500/20 blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-glacier-500/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />

            {/* Interactive Mouse Follower */}
            <motion.div
                style={{
                    x: springX,
                    y: springY,
                    translateX: '-50%',
                    translateY: '-50%'
                }}
                className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-primary-500/10 to-glacier-500/10 blur-[100px] pointer-events-none"
            />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />

            {/* Floating Orbs (Lightweight CSS Animation) */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-400/10 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-glacier-400/10 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '12s', animationDelay: '1s' }} />
        </div>
    );
};
