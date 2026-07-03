import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const BackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Don't show back button on main landing/home pages or auth pages if desired
    // Adjust this list based on where you want the button to appear
    const hiddenPaths = ['/', '/login', '/signup'];

    if (hiddenPaths.includes(location.pathname)) {
        return null;
    }

    return (
        <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => navigate(-1)}
            className="fixed top-24 left-4 z-40 p-2 md:p-3 rounded-full bg-dark-card/50 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg group"
            title="Go Back"
        >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
        </motion.button>
    );
};
