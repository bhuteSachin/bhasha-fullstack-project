import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Check, X, Loader2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Payment {
    _id: string;
    email: string;
    transactionId: string;
    plan: string;
    amount: number;
    status: string;
    createdAt: string;
}

export const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'payments' | 'users' | 'pricing'>('payments');

    // Data States
    const [payments, setPayments] = useState<Payment[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [pricing, setPricing] = useState({
        monthly_price: 199,
        yearly_price: 799,
        monthly_discount: 0,
        yearly_discount: 0
    });

    // Loading States
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const isAdmin = user?.email === 'shubhamgayke9168@gmail.com';

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (!isAdmin) { navigate('/'); return; }
        fetchData();
    }, [user, isAdmin, navigate, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'payments') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/payment/admin/payments`);
                setPayments(res.data);
            } else if (activeTab === 'users') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`);
                setUsers(res.data);
            } else if (activeTab === 'pricing') {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/settings/pricing`);
                setPricing(res.data);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Payment Actions ---
    const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this payment?`)) return;
        setActionLoading(paymentId);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/admin/${action}`, { paymentId });
            setPayments(prev => prev.filter(p => p._id !== paymentId));
            alert(`Payment ${action}d successfully`);
        } catch (error) {
            alert("Action failed");
        } finally {
            setActionLoading(null);
        }
    };

    // --- User Actions ---
    const handleBanUser = async (userId: string) => {
        if (!confirm("Are you sure?")) return;
        setActionLoading(userId);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/ban`);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: res.data.isBanned } : u));
        } catch (error) {
            alert("Failed to ban user");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        setActionLoading(userId);
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`);
            setUsers(prev => prev.filter(u => u._id !== userId));
        } catch (error) {
            alert("Failed to delete user");
        } finally {
            setActionLoading(null);
        }
    };

    // --- Pricing Actions ---
    const handleUpdatePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading('pricing');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/settings`, { settings: pricing });
            alert("Pricing updated successfully!");
        } catch (error) {
            alert("Failed to update pricing");
        } finally {
            setActionLoading(null);
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen py-20 px-4">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-dark-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <ShieldAlert className="w-8 h-8 text-primary-400" />
                        <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
                        {['payments', 'users', 'pricing'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 rounded-lg capitalize font-medium transition-all ${activeTab === tab
                                        ? 'bg-primary-600 text-white'
                                        : 'text-dark-muted hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'payments' && (
                                <div className="overflow-x-auto">
                                    <h3 className="text-xl font-semibold text-white mb-4">Pending Verifications</h3>
                                    {payments.length === 0 ? <p className="text-dark-muted">No pending payments.</p> : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/10 text-dark-muted text-sm uppercase">
                                                    <th className="py-4 px-4">Date</th>
                                                    <th className="py-4 px-4">Email</th>
                                                    <th className="py-4 px-4">Plan</th>
                                                    <th className="py-4 px-4">Amount</th>
                                                    <th className="py-4 px-4">UTR</th>
                                                    <th className="py-4 px-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-white">
                                                {payments.map((p) => (
                                                    <tr key={p._id} className="border-b border-white/5 hover:bg-white/5">
                                                        <td className="py-4 px-4 text-sm text-dark-muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                                                        <td className="py-4 px-4">{p.email}</td>
                                                        <td className="py-4 px-4 capitalize">{p.plan}</td>
                                                        <td className="py-4 px-4">₹{p.amount}</td>
                                                        <td className="py-4 px-4 font-mono text-primary-300">{p.transactionId}</td>
                                                        <td className="py-4 px-4 text-right flex justify-end gap-2">
                                                            <button onClick={() => handlePaymentAction(p._id, 'approve')} className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30">
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handlePaymentAction(p._id, 'reject')} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="overflow-x-auto">
                                    <h3 className="text-xl font-semibold text-white mb-4">Manage Users</h3>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10 text-dark-muted text-sm uppercase">
                                                <th className="py-4 px-4">Email</th>
                                                <th className="py-4 px-4">Status</th>
                                                <th className="py-4 px-4">Plan</th>
                                                <th className="py-4 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-white">
                                            {users.map((u) => (
                                                <tr key={u._id} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-4 px-4">{u.email}</td>
                                                    <td className="py-4 px-4">
                                                        {u.isBanned ? <span className="text-red-400">Banned</span> : <span className="text-green-400">Active</span>}
                                                    </td>
                                                    <td className="py-4 px-4 capitalize">{u.subscriptionPlan || 'Free'}</td>
                                                    <td className="py-4 px-4 text-right flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleBanUser(u._id)}
                                                            className={`px-3 py-1 rounded-lg text-sm ${u.isBanned ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}
                                                        >
                                                            {u.isBanned ? 'Unban' : 'Ban'}
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(u._id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'pricing' && (
                                <div className="max-w-md">
                                    <h3 className="text-xl font-semibold text-white mb-6">Update Pricing</h3>
                                    <form onSubmit={handleUpdatePricing} className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-dark-muted mb-1">Monthly Price (₹)</label>
                                            <input
                                                type="number"
                                                value={pricing.monthly_price}
                                                onChange={e => setPricing({ ...pricing, monthly_price: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-dark-muted mb-1">Yearly Price (₹)</label>
                                            <input
                                                type="number"
                                                value={pricing.yearly_price}
                                                onChange={e => setPricing({ ...pricing, yearly_price: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-white"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!!actionLoading}
                                            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-lg font-medium"
                                        >
                                            {actionLoading === 'pricing' ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
