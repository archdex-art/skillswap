import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, ArrowLeft, Calendar, Globe, MapPin, Loader2 } from 'lucide-react';

function timeLabel(dateString) {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { matchId }   = useParams();
  const { user }       = useAuth();
  const { socket }     = useSocket() || {};
  const navigate       = useNavigate();

  const [match,    setMatch]    = useState(null);
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);
  const bottomRef   = useRef(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch match + message history ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Load match details
        const { data: matches } = await axios.get('/api/matches', { headers });
        const m = matches.find(mx => mx._id === matchId);
        setMatch(m || null);

        // Load message history
        const { data: msgs } = await axios.get(`/api/messages/${matchId}`, { headers });
        setMessages(msgs || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, [matchId]);

  // ── Socket join + listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_room', matchId);

    socket.on('receive_message', (msg) => {
      setMessages(prev => {
        // Replace any matching optimistic placeholder (same sender + text + close timestamp)
        // or deduplicate if the server echo already arrived.
        const isDuplicate = prev.some(m => m._id === msg._id);
        if (isDuplicate) return prev;

        // Replace optimistic entry from the same user with the persisted one
        const optimisticIndex = prev.findIndex(
          m => m._id.startsWith('optimistic-') &&
               (m.sender?._id || m.sender) === (msg.sender?._id || msg.sender) &&
               m.text === msg.text
        );
        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = msg;
          return updated;
        }
        return [...prev, msg];
      });
    });

    socket.on('user_typing', ({ name }) => {
      setIsTyping(name);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
    };
  }, [socket, matchId]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit('typing', { matchId, userId: user?._id, name: user?.name });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('stopped_typing', { matchId }), 1200);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;

    const msgText = text.trim();
    setText('');

    // Optimistic update — show message instantly for the sender
    const optimistic = {
      _id: `optimistic-${Date.now()}`,
      matchId,
      sender: { _id: user?._id, name: user?.name },
      text: msgText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    socket.emit('send_message', { matchId, sender: user?._id, text: msgText });
  };

  // Determine partner
  const partner = match
    ? (match.requester._id === user?._id ? match.recipient : match.requester)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-t-2xl shadow-sm shrink-0">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <ArrowLeft size={18} className="text-slate-500" />
        </button>

        {partner && (
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
              {partner.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">{partner.name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                {partner.skillsOffered?.slice(0, 2).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Session info pill */}
        {match?.schedule?.date && (
          <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 px-3 py-1.5 rounded-full shrink-0">
            <Calendar size={12} />
            <span>{match.schedule.date}</span>
            {match.schedule.mode === 'online' ? <Globe size={11} /> : <MapPin size={11} />}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/30 border-x border-slate-200 dark:border-dark-border">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-10">
            Start a conversation with {partner?.name}!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = (msg.sender?._id || msg.sender) === user?._id;
          return (
            <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-gradient-to-br from-brand-500 to-indigo-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 px-1">
                  {msg.sender?.name && !isMe ? `${msg.sender.name} · ` : ''}{timeLabel(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs text-slate-400 italic">
              {isTyping} is typing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 p-3 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-b-2xl shadow-sm shrink-0"
      >
        <input
          type="text"
          value={text}
          onChange={handleTyping}
          placeholder={`Message ${partner?.name || ''}…`}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white hover:opacity-90 disabled:opacity-50 transition"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
