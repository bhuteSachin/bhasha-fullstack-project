import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LogOut, MessageSquare, Crown, Languages, Menu, X, ShieldAlert, Bot } from 'lucide-react';

const ADMIN_EMAIL = 'shubhamgayke9168@gmail.com';

export const Navbar = () => {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const isAdmin = user?.email === ADMIN_EMAIL;

    const navLinks = [
        { to: '/', label: 'Translate', icon: Languages },
        { to: '/chat', label: 'Chat', icon: MessageSquare },
        { to: '/ai-practice', label: 'AI Practice', icon: Bot },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldAlert }] : []),
    ];

    return (
        <nav className="sticky top-0 z-50 w-full bg-dark-bg/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group" onClick={closeMenu}>
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                            <span className="text-xl md:text-2xl">✨</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 font-display tracking-tight">
                            LinguistAI
                        </h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        {user ? (
                            <>
                                <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/5">
                                    {navLinks.map((link) => {
                                        const Icon = link.icon;
                                        const isActive = location.pathname === link.to;
                                        return (
                                            <Link
                                                key={link.to}
                                                to={link.to}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {link.label}
                                            </Link>
                                        );
                                    })}
                                </div>

                                <div className="h-6 w-px bg-white/10" />

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-white">
                                            {user.username || user.email?.split('@')[0]}
                                        </div>
                                        {user.isPremium && (
                                            <div className="text-[10px] font-bold text-amber-400 flex items-center justify-end gap-1">
                                                <Crown className="w-3 h-3" /> PRO
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 hover:-translate-y-0.5"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMenu}
                        className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden overflow-hidden bg-dark-bg/95 backdrop-blur-xl border-b border-white/5"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-4">
                            {user ? (
                                <>
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {user.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">
                                                {user.username || user.email?.split('@')[0]}
                                            </div>
                                            {user.isPremium && (
                                                <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                                    <Crown className="w-3 h-3" /> PRO Member
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {navLinks.map((link) => {
                                            const Icon = link.icon;
                                            const isActive = location.pathname === link.to;
                                            return (
                                                <Link
                                                    key={link.to}
                                                    to={link.to}
                                                    onClick={closeMenu}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                                        ? 'bg-primary-600 text-white'
                                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    {link.label}
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => { logout(); closeMenu(); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-3 pt-2">
                                    <Link
                                        to="/login"
                                        onClick={closeMenu}
                                        className="block w-full text-center py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/signup"
                                        onClick={closeMenu}
                                        className="block w-full text-center py-3 rounded-xl bg-primary-600 text-white font-medium shadow-lg shadow-primary-600/20"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};
