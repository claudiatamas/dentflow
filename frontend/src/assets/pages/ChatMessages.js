import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, MessageCircle, X, Loader2, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import DashboardLayout from '../components/DashboardLayout';
import PatientLayout from '../components/PatientLayout';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
};

const formatTime = (timestamp) => {

    const normalized = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(normalized);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${timeStr}`;
};

const formatConversationTime = (timestamp) => {
    const normalized = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(normalized);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const formatDateDivider = (timestamp) => {
    const normalized = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(normalized);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};

// ─────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────
const Avatar = ({ src, firstName, lastName, size = 'md' }) => {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

    if (src) {
        return (
            <img
                src={src}
                alt={`${firstName} ${lastName}`}
                className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
            />
        );
    }
    return (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-semibold">{initials || '?'}</span>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// ConversationItem
// ─────────────────────────────────────────────────────────────
const ConversationItem = ({ conv, isActive, currentUserId, onClick }) => {
    const isLastMine = conv.last_message_sender_id === currentUserId;
    return (
        <div
            onClick={() => onClick(conv)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-blue-50 ${isActive ? 'bg-blue-50 border-r-4 border-blue-600' : ''}`}
        >
            <div className="relative flex-shrink-0">
                <Avatar
                    src={conv.other_user_profile_picture}
                    firstName={conv.other_user_first_name}
                    lastName={conv.other_user_last_name}
                    size="md"
                />
                {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {conv.other_user_first_name} {conv.other_user_last_name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatConversationTime(conv.last_message_timestamp)}
                    </span>
                </div>
                <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {isLastMine ? 'You: ' : ''}{conv.last_message_content}
                </p>
                <span className="text-xs text-blue-400 capitalize">{conv.other_user_role}</span>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// MessageBubble
// ─────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isMine, showAvatar, onDelete }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className={`flex gap-2 mb-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Avatar pentru mesaje primite */}
            {!isMine && (
                <div className="flex-shrink-0">
                    {showAvatar
                        ? <Avatar src={message.sender_profile_picture} firstName={message.sender_first_name} lastName={message.sender_last_name} size="sm" />
                        : <div className="w-8" />
                    }
                </div>
            )}

            <div className={`flex flex-col max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMine ? 'bg-[#1C398E] text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'}`}>
                    {message.content}
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">
                    {formatTime(message.timestamp)}
                    {isMine && <span className="ml-1 text-blue-400">{message.is_read ? ' ✓✓' : ' ✓'}</span>}
                </span>
            </div>

            {/* Buton ștergere */}
            {isMine && (
                <div className={`flex items-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button onClick={() => onDelete(message.id)} className="cursor-pointer p-1 text-gray-400 hover:text-red-500 transition-colors" title="Șterge">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// DateDivider
// ─────────────────────────────────────────────────────────────
const DateDivider = ({ timestamp }) => (
    <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium px-2">{formatDateDivider(timestamp)}</span>
        <div className="flex-1 h-px bg-gray-200" />
    </div>
);

// ─────────────────────────────────────────────────────────────
// DeleteConfirmModal
// ─────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Delete Message</h3>
                    <p className="text-sm text-gray-400 mb-6">Are you sure you want to delete this message? This action cannot be undone.</p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            className="cursor-pointer flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="cursor-pointer flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// NewChatModal — doctors see their patients, patients see doctors
// ─────────────────────────────────────────────────────────────
const NewChatModal = ({ isOpen, onClose, currentUser, onStartChat }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(null);
    const isDoctor = currentUser?.role === 'doctor';

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            let data = [];
            if (isDoctor) {
                // Doctor: fetch only patients with appointments
                const res = await axios.get('http://localhost:8000/doctor/appointment-patients', { headers: getHeaders() });
                data = res.data;
            } else {
                // Patient: fetch all doctors
                const res = await axios.get('http://localhost:8000/doctors', { headers: getHeaders() });
                data = res.data;
            }
            setResults(data.filter(p => p.id !== currentUser?.id));
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
        } finally {
            setLoading(false);
        }
    }, [isDoctor, currentUser]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            fetchContacts();
            setTimeout(() => searchRef.current?.focus(), 150);
        }
    }, [isOpen, fetchContacts]);

    const filtered = results.filter(p => {
        const name = `${p.first_name} ${p.last_name}`.toLowerCase();
        const extra = (isDoctor ? '' : (p.specialty || '')).toLowerCase();
        return name.includes(query.toLowerCase()) || extra.includes(query.toLowerCase());
    });

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="cursor-pointer text-lg font-semibold text-gray-800">New Conversation</h2>
                    <button onClick={onClose} className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={isDoctor ? 'Search by patient name...' : 'Search by name or specialty...'}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Results */}
                <div className="overflow-y-auto max-h-72">
                    {loading && (
                        <div className="flex items-center justify-center py-8 text-gray-400">
                            <Loader2 size={20} className="animate-spin mr-2" /> Loading...
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Search size={28} className="mb-2 opacity-20" />
                            <p className="text-sm">{isDoctor ? 'No patients found.' : 'No doctors found.'}</p>
                        </div>
                    )}
                    {!loading && filtered.map(person => (
                        <button
                            key={person.id}
                            onClick={() => {
                                onStartChat({
                                    other_user_id: person.id,
                                    other_user_first_name: person.first_name,
                                    other_user_last_name: person.last_name,
                                    other_user_role: isDoctor ? 'patient' : 'doctor',
                                    other_user_profile_picture: person.profile_picture,
                                    last_message_content: '',
                                    last_message_timestamp: new Date().toISOString(),
                                    last_message_sender_id: null,
                                    unread_count: 0,
                                });
                                onClose();
                            }}
                            className="cursor-pointer w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50 transition-colors text-left"
                        >
                            <Avatar
                                src={person.profile_picture}
                                firstName={person.first_name}
                                lastName={person.last_name}
                                size="md"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                    {isDoctor ? '' : 'Dr. '}{person.first_name} {person.last_name}
                                </p>
                                {!isDoctor && person.specialty && (
                                    <p className="text-xs text-gray-400 truncate">{person.specialty}</p>
                                )}
                            </div>
                            <span className="text-xs text-blue-500 font-medium flex-shrink-0">Message</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// ChatMessages Page
// ─────────────────────────────────────────────────────────────
const ChatMessages = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [sending, setSending] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, messageId: null });

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const pollingRef = useRef(null);

    // ── Fetch current user ──
    useEffect(() => {
        axios.get('http://localhost:8000/me', { headers: getHeaders() })
            .then(res => setCurrentUser(res.data))
            .catch(err => console.error('Failed to fetch user:', err));
    }, []);

    // ── Fetch conversations ──
    const fetchConversations = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:8000/messages/conversations', { headers: getHeaders() });
            setConversations(res.data);
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        } finally {
            setLoadingConvs(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    // ── Fetch messages for active conversation ──
    const fetchMessages = useCallback(async (isInitial = false) => {
        if (!activeConv) return;
        if (isInitial) setLoadingMsgs(true);
        try {
            const res = await axios.get(
                `http://localhost:8000/messages/${activeConv.other_user_id}`,
                { headers: getHeaders() }
            );
            setMessages(res.data);
            if (isInitial) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            else messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            if (isInitial) setLoadingMsgs(false);
        }
    }, [activeConv]);

    useEffect(() => {
        if (!activeConv) return;
        fetchMessages(true);
        clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => fetchMessages(false), 4000);
        setTimeout(() => inputRef.current?.focus(), 200);
        return () => clearInterval(pollingRef.current);
    }, [activeConv, fetchMessages]);

    // ── Send message ──
    const handleSend = async () => {
        if (!newMessage.trim() || sending || !activeConv) return;
        const content = newMessage.trim();
        setNewMessage('');
        setSending(true);

        const temp = {
            id: `temp-${Date.now()}`,
            sender_id: currentUser?.id,
            receiver_id: activeConv.other_user_id,
            content,
            timestamp: new Date().toISOString(),
            is_read: false,
            sender_first_name: currentUser?.first_name,
            sender_last_name: currentUser?.last_name,
            sender_profile_picture: currentUser?.profile_picture,
        };
        setMessages(prev => [...prev, temp]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        try {
            await axios.post(
                'http://localhost:8000/messages',
                { receiver_id: activeConv.other_user_id, content },
                { headers: { ...getHeaders(), 'Content-Type': 'application/json' } }
            );
            fetchMessages(false);
            fetchConversations();
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== temp.id));
            setNewMessage(content);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Delete message ──
    const handleDelete = (messageId) => {
        setDeleteModal({ isOpen: true, messageId });
    };

    const confirmDelete = async () => {
        const messageId = deleteModal.messageId;
        setDeleteModal({ isOpen: false, messageId: null });
        try {
            await axios.delete(`http://localhost:8000/messages/${messageId}`, { headers: getHeaders() });
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            alert('Failed to delete message.');
        }
    };

    // ── Select conversation ──
    const handleSelectConv = (conv) => {
        setActiveConv(conv);
        setMobileShowChat(true);
    };

    // ── Start new chat (from modal) ──
    const handleStartNewChat = (conv) => {
        setActiveConv(conv);
        setMobileShowChat(true);
        // Add to conversations list if not already there
        setConversations(prev => {
            const exists = prev.find(c => c.other_user_id === conv.other_user_id);
            if (exists) return prev;
            return [conv, ...prev];
        });
    };

    // ── Filter conversations by search ──
    const filteredConvs = conversations.filter(c => {
        const name = `${c.other_user_first_name} ${c.other_user_last_name}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    // ── Build messages with date dividers ──
    const messagesWithDividers = [];
    let lastDate = null;
    messages.forEach((msg) => {
        const msgDate = new Date(msg.timestamp).toDateString();
        if (msgDate !== lastDate) {
            messagesWithDividers.push({ type: 'divider', timestamp: msg.timestamp, key: `d-${msg.timestamp}` });
            lastDate = msgDate;
        }
        const idx = messages.indexOf(msg);
        const prev = messages[idx - 1];
        const showAvatar = !prev || prev.sender_id !== msg.sender_id;
        messagesWithDividers.push({ type: 'message', msg, showAvatar });
    });

    // ── Layout based on role ──
    const Layout = currentUser?.role === 'doctor' ? DashboardLayout : PatientLayout;

    return (
        <Layout>
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, messageId: null })}
                onConfirm={confirmDelete}
            />
            <NewChatModal
                isOpen={newChatOpen}
                onClose={() => setNewChatOpen(false)}
                currentUser={currentUser}
                onStartChat={handleStartNewChat}
            />

            <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-md overflow-hidden">

                {/* ── LEFT: Conversations List ── */}
                <div className={`flex flex-col border-r border-gray-200 bg-white ${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}>

                    {/* Header */}
                    <div className="px-4 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
                            <button
                                onClick={() => setNewChatOpen(true)}
                                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-[#1C398E] text-white text-xs font-medium rounded-xl hover:bg-blue-800 transition-colors"
                                title="New conversation"
                            >
                                <span className=" text-base leading-none">+</span>
                                New Chat
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingConvs && (
                            <div className="flex items-center justify-center py-10 text-gray-400">
                                <Loader2 size={20} className="animate-spin mr-2" /> Loading...
                            </div>
                        )}
                        {!loadingConvs && filteredConvs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-4 text-center">
                                <MessageCircle size={36} className="mb-3 opacity-20" />
                                {searchQuery ? (
                                    <p className="text-sm">No conversations found.</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-500 mb-1">No conversations yet</p>
                                        <p className="text-xs text-gray-400 mb-4">Start a new chat with your doctor.</p>
                                        <button
                                            onClick={() => setNewChatOpen(true)}
                                            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[#1C398E] text-white text-sm font-medium rounded-xl hover:bg-blue-800 transition-colors"
                                        >
                                            <span className="text-base leading-none">+</span>
                                            Start a conversation
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                        {!loadingConvs && filteredConvs.map(conv => (
                            <ConversationItem
                                key={conv.other_user_id}
                                conv={conv}
                                isActive={activeConv?.other_user_id === conv.other_user_id}
                                currentUserId={currentUser?.id}
                                onClick={handleSelectConv}
                            />
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Chat Window ── */}
                <div className={`flex-1 flex flex-col ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
                    {!activeConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <MessageCircle size={56} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium text-gray-500">Select a conversation</p>
                            <p className="text-sm mt-1 text-gray-400">Choose a conversation on the left to view messages.</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                                <button
                                    onClick={() => setMobileShowChat(false)}
                                    className="md:hidden p-1 text-gray-500 hover:text-gray-700 mr-1"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <Avatar
                                    src={activeConv.other_user_profile_picture}
                                    firstName={activeConv.other_user_first_name}
                                    lastName={activeConv.other_user_last_name}
                                    size="md"
                                />
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {activeConv.other_user_first_name} {activeConv.other_user_last_name}
                                    </p>
                                    <p className="text-xs text-gray-400 capitalize">{activeConv.other_user_role}</p>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
                                {loadingMsgs && (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 size={24} className="animate-spin text-blue-500" />
                                    </div>
                                )}
                                {!loadingMsgs && messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <MessageCircle size={40} className="mb-2 opacity-20" />
                                        <p className="text-sm">No messages yet. Send the first one!</p>
                                    </div>
                                )}
                                {!loadingMsgs && messagesWithDividers.map((item) => {
                                    if (item.type === 'divider') return <DateDivider key={item.key} timestamp={item.timestamp} />;
                                    return (
                                        <MessageBubble
                                            key={item.msg.id}
                                            message={item.msg}
                                            isMine={item.msg.sender_id === currentUser?.id}
                                            showAvatar={item.showAvatar}
                                            onDelete={handleDelete}
                                        />
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="px-4 py-3 bg-white border-t border-gray-200 flex items-end gap-2 flex-shrink-0">
                                <textarea
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message... (Enter to send)"
                                    rows={1}
                                    className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-28 overflow-y-auto"
                                    style={{ minHeight: '44px' }}
                                    onInput={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    className="cursor-pointer p-3 bg-[#1C398E] text-white rounded-2xl hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    {sending
                                        ? <Loader2 size={18} className="animate-spin" />
                                        : <Send size={18} />
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ChatMessages;