import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowRight, CheckCircle, KeyRound, Mail } from 'lucide-react';
import axios from 'axios';

export const ForgotPassword = () => {
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, { email });
            setStep('reset');
            setSuccessMessage('OTP sent to your email');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
                email,
                otp,
                newPassword
            });
            setSuccessMessage('Password reset successfully! Redirecting...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative z-10 px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-8 w-full max-w-md relative overflow-hidden holographic-border"
            >
                <AnimatePresence mode="wait">
                    {step === 'email' ? (
                        <motion.div
                            key="email"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <KeyRound className="w-8 h-8 text-primary-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
                                <p className="text-dark-muted text-sm mt-2">
                                    Enter your email to receive a reset code
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSendOTP} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-muted mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-muted" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-dark-input/50 border border-white/10 rounded-lg pl-10 p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Send Reset Code'}
                                    {!isLoading && <ArrowRight className="w-5 h-5" />}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="reset"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                                <p className="text-dark-muted text-sm mt-2">
                                    Enter the code sent to {email}
                                </p>
                            </div>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    {successMessage}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-muted mb-1">OTP Code</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-dark-input/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none text-center tracking-widest text-xl"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-muted mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-dark-input/50 border border-white/10 rounded-lg p-3 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all outline-none"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Reset Password'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-6 text-center text-dark-muted text-sm">
                    <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium flex items-center justify-center gap-1">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};
