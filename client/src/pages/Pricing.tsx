import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Crown, Loader2, X, QrCode, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Declare Razorpay type for TypeScript
declare global {
    interface Window {
        Razorpay: any;
    }
}

const PricingCard = ({
    title,
    price,
    features,
    recommended = false,
    onSelect,
    loading
}: {
    title: string;
    price: string;
    features: string[];
    recommended?: boolean;
    onSelect: () => void;
    loading: boolean;
}) => (
    <motion.div
        whileHover={{ y: -10 }}
        className={`relative p-8 rounded-2xl border ${recommended
            ? 'bg-primary-900/20 border-primary-500/50 shadow-lg shadow-primary-500/20'
            : 'bg-white/5 border-white/10'
            } backdrop-blur-xl flex flex-col`}
    >
        {recommended && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Crown className="w-3 h-3" /> Most Popular
            </div>
        )}

        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-white">{price}</span>
            <span className="text-dark-muted">/period</span>
        </div>

        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3 text-dark-muted">
                    <Check className="w-5 h-5 text-primary-400" />
                    {feature}
                </li>
            ))}
        </ul>

        <button
            onClick={onSelect}
            disabled={loading}
            className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${recommended
                ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20'
                : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Choose Plan'}
        </button>
    </motion.div>
);

export const Pricing = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi'>('razorpay');
    const [transactionId, setTransactionId] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [processingRazorpay, setProcessingRazorpay] = useState(false);
    const [pricing, setPricing] = useState({
        monthly_price: 199,
        yearly_price: 799,
        monthly_discount: 0,
        yearly_discount: 0
    });

    React.useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/settings/pricing`)
            .then(res => setPricing(res.data))
            .catch(err => console.error("Failed to fetch pricing:", err));
    }, []);

    const handleSelectPlan = (plan: 'monthly' | 'yearly') => {
        if (!user) {
            navigate('/login');
            return;
        }
        setSelectedPlan(plan);
        setShowModal(true);
    };

    const handleRazorpayPayment = async () => {
        if (!selectedPlan || !user) return;

        setProcessingRazorpay(true);
        try {
            // Create order on backend
            const orderRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/create-order`, {
                email: user.email,
                plan: selectedPlan
            });

            const { orderId, amount, currency, keyId } = orderRes.data;

            // Open Razorpay checkout
            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: 'LinguistAI',
                description: `${selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Premium Subscription`,
                order_id: orderId,
                handler: async (response: any) => {
                    try {
                        // Verify payment on backend
                        const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            email: user.email,
                            plan: selectedPlan
                        });

                        if (verifyRes.data.success) {
                            await refreshUser();
                            alert("✅ Payment Successful! Welcome to Premium.");
                            setShowModal(false);
                            navigate('/chat');
                        } else {
                            alert("❌ Payment verification failed. Please contact support.");
                        }
                    } catch (error: any) {
                        console.error("Verification error:", error);
                        alert("❌ Payment verification failed: " + (error.response?.data?.detail || error.message));
                    }
                },
                prefill: {
                    email: user.email
                },
                theme: {
                    color: '#8B5CF6'
                },
                modal: {
                    ondismiss: () => {
                        setProcessingRazorpay(false);
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();

        } catch (error: any) {
            console.error("Razorpay error:", error);
            alert(error.response?.data?.detail || "Failed to initiate payment. Please try again.");
        } finally {
            setProcessingRazorpay(false);
        }
    };

    const handleSubmitUPIPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionId.trim()) return;

        setVerifying(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/submit-manual`, {
                email: user?.email,
                plan: selectedPlan,
                transactionId: transactionId
            });

            if (res.data.status === 'pending') {
                alert("✅ Payment Submitted! \n\nYour request is pending verification. Please wait for admin approval (usually takes 1-2 hours).");
                setShowModal(false);
                setTransactionId('');
            } else {
                await refreshUser();
                alert("✅ Payment Verified! Welcome to Premium.");
                navigate('/chat');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || "Verification failed. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-4"
                    >
                        Upgrade to <span className="text-primary-400">Premium</span>
                    </motion.h2>
                    <p className="text-xl text-dark-muted mb-4">Unlock the full power of AI translation and real-time chat.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <PricingCard
                        title="Monthly"
                        price={`₹${pricing.monthly_price}`}
                        features={[
                            "Unlimited Text Translation",
                            "Real-time Chat Access",
                            "Voice Input & Output",
                            "Priority Support",
                            "No Ads"
                        ]}
                        onSelect={() => handleSelectPlan('monthly')}
                        loading={false}
                    />
                    <PricingCard
                        title="Yearly"
                        price={`₹${pricing.yearly_price}`}
                        recommended={true}
                        features={[
                            "All Monthly Features",
                            `Save ₹${(pricing.monthly_price * 12) - pricing.yearly_price} per year`,
                            "Early Access to New Features",
                            "Premium Badge",
                            "Exclusive Dialects"
                        ]}
                        onSelect={() => handleSelectPlan('yearly')}
                        loading={false}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-dark-800 border border-white/10 rounded-2xl p-6 max-w-md w-full relative"
                        >
                            <button
                                onClick={() => setShowModal(false)}
                                className="absolute top-4 right-4 text-dark-muted hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-2xl font-bold text-white mb-6">
                                Complete Payment
                            </h3>

                            {/* Payment Method Toggle */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => setPaymentMethod('razorpay')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${paymentMethod === 'razorpay'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white/10 text-dark-muted hover:bg-white/20'
                                        }`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Razorpay
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('upi')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${paymentMethod === 'upi'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-white/10 text-dark-muted hover:bg-white/20'
                                        }`}
                                >
                                    <QrCode className="w-5 h-5" />
                                    UPI Manual
                                </button>
                            </div>

                            {/* Amount Display */}
                            <div className="bg-white/5 rounded-xl p-4 mb-6 text-center">
                                <p className="text-dark-muted text-sm mb-1">
                                    {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
                                </p>
                                <p className="text-3xl font-bold text-primary-400">
                                    ₹{selectedPlan === 'monthly' ? pricing.monthly_price : pricing.yearly_price}
                                </p>
                            </div>

                            {paymentMethod === 'razorpay' ? (
                                /* Razorpay Payment */
                                <div className="space-y-4">
                                    <p className="text-dark-muted text-sm text-center">
                                        Pay securely using Credit/Debit Card, UPI, Net Banking, or Wallets
                                    </p>
                                    <button
                                        onClick={handleRazorpayPayment}
                                        disabled={processingRazorpay}
                                        className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                                    >
                                        {processingRazorpay ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <CreditCard className="w-5 h-5" />
                                                Pay with Razorpay
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* UPI Manual Payment */
                                <div>
                                    <div className="bg-white p-4 rounded-xl mb-6 flex flex-col items-center">
                                        <div className="w-48 h-auto bg-white flex items-center justify-center mb-4 rounded-lg overflow-hidden">
                                            <img
                                                src="/upi-qr.png"
                                                alt="Payment QR Code"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <p className="text-gray-800 font-medium text-center text-sm">
                                            UPI ID: <span className="font-bold select-all">9168469745@ibl</span>
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmitUPIPayment} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-dark-muted mb-1">Transaction ID / UTR</label>
                                            <input
                                                type="text"
                                                value={transactionId}
                                                onChange={(e) => setTransactionId(e.target.value)}
                                                placeholder="Enter Transaction ID (e.g., 1234567890)"
                                                className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={verifying}
                                            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                                        >
                                            {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Verification'}
                                        </button>
                                        <p className="text-xs text-dark-muted text-center">
                                            Manual payments are verified within 1-2 hours
                                        </p>
                                    </form>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

