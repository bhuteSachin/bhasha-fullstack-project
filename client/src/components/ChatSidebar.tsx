import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Bell, Check, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Socket } from 'socket.io-client';

interface User {
    _id: string;
    username: string;
    email: string;
    isOnline?: boolean;
}

interface FriendRequest {
    _id: string;
    from: User;
    status: string;
}

interface ChatSidebarProps {
    onSelectUser: (user: User) => void;
    selectedUserId?: string;
    socket: Socket | null;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ onSelectUser, selectedUserId, socket }) => {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'chats' | 'search' | 'requests'>('chats');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [friends, setFriends] = useState<User[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchRequests();
        }
    }, [token]);

    // Listen for status changes
    useEffect(() => {
        if (!socket) return;

        const handleStatusChange = (data: { userId: string, isOnline: boolean }) => {
            setFriends(prev => prev.map(f =>
                f._id === data.userId ? { ...f, isOnline: data.isOnline } : f
            ));
        };

        socket.on('user_status_change', handleStatusChange);

        return () => {
            socket.off('user_status_change', handleStatusChange);
        };
    }, [socket]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchFriends = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/friends`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFriends(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/search?q=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const sendRequest = async (userId: string) => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/user/request/${userId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Friend request sent!');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to send request');
        }
    };

    const handleRequest = async (userId: string, action: 'accept' | 'reject') => {
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/user/request/${userId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchRequests();
            fetchFriends();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="w-80 border-r border-white/10 bg-dark-bg/30 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 p-4 text-sm font-medium transition-all ${activeTab === 'chats' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-muted hover:text-white'}`}
                >
                    <Users className="w-5 h-5 mx-auto mb-1" />
                    Chats
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 p-4 text-sm font-medium transition-all ${activeTab === 'search' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-muted hover:text-white'}`}
                >
                    <Search className="w-5 h-5 mx-auto mb-1" />
                    Search
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 p-4 text-sm font-medium transition-all ${activeTab === 'requests' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-dark-muted hover:text-white'} relative`}
                >
                    <Bell className="w-5 h-5 mx-auto mb-1" />
                    Requests
                    {requests.length > 0 && (
                        <span className="absolute top-3 right-6 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {activeTab === 'chats' && (
                    <div className="space-y-2">
                        {friends.length === 0 ? (
                            <p className="text-center text-dark-muted text-sm mt-10">No friends yet. Search to add some!</p>
                        ) : (
                            friends.map(friend => (
                                <div
                                    key={friend._id}
                                    onClick={() => onSelectUser(friend)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedUserId === friend._id ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {friend.username[0].toUpperCase()}
                                        </div>
                                        {friend.isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-bg"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">{friend.username}</h3>
                                        <p className="text-xs text-dark-muted">
                                            {friend.isOnline ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
                            <input
                                type="text"
                                placeholder="Search username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-dark-bg/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-dark-muted/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                            />
                        </div>
                        <div className="space-y-2">
                            {loading ? (
                                <p className="text-center text-dark-muted text-sm">Searching...</p>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user._id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-dark-muted text-xs">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <span className="text-white text-sm">{user.username}</span>
                                        </div>
                                        <button
                                            onClick={() => sendRequest(user._id)}
                                            className="p-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600 hover:text-white transition-all"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div className="space-y-2">
                        {requests.length === 0 ? (
                            <p className="text-center text-dark-muted text-sm mt-10">No pending requests.</p>
                        ) : (
                            requests.map(req => (
                                <div key={req._id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-dark-bg flex items-center justify-center text-dark-muted text-xs">
                                            {req.from.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="text-white text-sm font-medium">{req.from.username}</span>
                                            <p className="text-xs text-dark-muted">sent a friend request</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRequest(req.from._id, 'accept')}
                                            className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium"
                                        >
                                            <Check className="w-3 h-3" /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleRequest(req.from._id, 'reject')}
                                            className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium"
                                        >
                                            <X className="w-3 h-3" /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
