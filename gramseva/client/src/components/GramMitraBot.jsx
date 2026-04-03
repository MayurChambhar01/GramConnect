import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

/* ─── Suggested quick prompts ─── */
const QUICK = [
  { icon: '📜', text: 'Certificate kaise apply karein?' },
  { icon: '💳', text: 'Tax payment kaise karein?' },
  { icon: '🏛', text: 'Govt schemes ki jankari' },
  { icon: '📋', text: 'Complaint file karna hai' },
  { icon: '🏥', text: 'Ayushman Bharat eligibility' },
  { icon: '🚨', text: 'SOS emergency kab use karein?' },
];

/* ─── Typing indicator ─── */
const TypingDots = () => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 8, height: 8, borderRadius: '50%', background: '#2D5A3D',
        animation: 'botDot 1.2s ease-in-out infinite',
        animationDelay: `${i * 0.2}s`,
      }} />
    ))}
  </div>
);

/* ─── Markdown-lite renderer ─── */
function renderText(text) {
  return text
    .split('\n')
    .map((line, i) => {
      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const bullet = bold.startsWith('• ') || bold.startsWith('- ')
        ? `<span style="display:flex;gap:6px"><span>•</span><span>${bold.slice(2)}</span></span>`
        : bold;
      return <div key={i} dangerouslySetInnerHTML={{ __html: bullet }} style={{ marginBottom: line ? 3 : 6 }} />;
    });
}

export default function GramMitraBot({ user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `🙏 Namaste ${user?.name?.split(' ')[0] || 'ji'}!\n\nमैं **GramMitra** हूं — आपका AI Panchayat Assistant!\n\nकोई भी सवाल पूछें — Certificates, Tax, Schemes, Complaints सब कुछ!\n\nआप **Hindi**, **English** या **Hinglish** में बात कर सकते हैं। 😊`,
      time: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  /* ── Check browser support ── */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) setVoiceSupported(true);
    if (window.speechSynthesis) setTtsSupported(true);
    synthRef.current = window.speechSynthesis;
  }, []);

  /* ── Auto scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!open && messages.length > 1) setUnread(u => u + 1);
  }, [messages]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  /* ── Voice Input (STT) ── */
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'hi-IN'; // Supports Hindi + English
    recognitionRef.current.interimResults = true;
    recognitionRef.current.continuous = false;

    recognitionRef.current.onstart = () => setListening(true);
    recognitionRef.current.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setInput(transcript);
    };
    recognitionRef.current.onend = () => {
      setListening(false);
      // Auto-send if we got something
      setTimeout(() => {
        setInput(prev => { if (prev.trim()) sendMessage(prev); return prev; });
      }, 500);
    };
    recognitionRef.current.onerror = () => setListening(false);
    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  /* ── Voice Output (TTS) ── */
  const speak = useCallback((text) => {
    if (!synthRef.current || !ttsSupported) return;
    synthRef.current.cancel();
    const clean = text.replace(/\*\*/g, '').replace(/[•\-]/g, '').replace(/\n+/g, '. ');
    const utt = new SpeechSynthesisUtterance(clean);

    // Pick Hindi voice if available
    const voices = synthRef.current.getVoices();
    const hindiVoice = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang.startsWith('en-IN'));
    if (hindiVoice) utt.voice = hindiVoice;
    utt.rate = 0.92;
    utt.pitch = 1.05;
    utt.volume = 1;

    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);

    synthRef.current.speak(utt);
  }, [ttsSupported]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
  };

  /* ── Send message ── */
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/chatbot/message', { message: msg, history });
      const botMsg = { role: 'assistant', content: data.reply, time: new Date(), demo: data.demo };
      setMessages(prev => [...prev, botMsg]);
      if (autoSpeak) speak(data.reply);
    } catch (e) {
      const err = { role: 'assistant', content: '⚠️ Sorry, network error. Please try again.', time: new Date() };
      setMessages(prev => [...prev, err]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, autoSpeak, speak]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `🙏 नया conversation शुरू करें! मैं ready हूं — कोई भी सवाल पूछें। 😊`,
      time: new Date(),
    }]);
  };

  /* ─── STYLES ─── */
  const C = {
    forest: '#1A3A2A', forestMid: '#2D5A3D', gold: '#C9962A',
    cream: '#F4EFE4', border: '#E8E0CE', light: '#F9F7F3',
    bubble_bot: '#F0F7F2', bubble_user: '#1A3A2A',
  };

  return (
    <>
      <style>{`
        @keyframes botDot { 0%,80%,100%{transform:scale(0.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes botSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes botPulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,150,42,.4)} 50%{box-shadow:0 0 0 10px rgba(201,150,42,0)} }
        @keyframes waveBar { 0%,100%{height:6px} 50%{height:20px} }
        .bot-msg { animation: botSlide .25s ease both; }
        .bot-btn:hover { filter: brightness(.88); transform: scale(1.02); }
        .bot-input:focus { border-color: #1A3A2A !important; box-shadow: 0 0 0 3px rgba(26,58,42,.1) !important; }
        .quick-chip:hover { background: #1A3A2A !important; color: #fff !important; border-color: #1A3A2A !important; }
        .mic-btn:hover { background: rgba(201,150,42,.15) !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #C8BCA8; border-radius: 4px; }
      `}</style>

      {/* ── FAB BUTTON ── */}
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          width: 60, height: 60, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.forest}, #3E7A55)`,
          display: open ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 8px 28px rgba(26,58,42,.45)',
          animation: 'botPulse 2.5s ease-in-out infinite',
          transition: 'transform .2s',
          flexDirection: 'column', gap: 2,
        }}
        className="bot-btn"
      >
        <span style={{ fontSize: 26 }}>🤖</span>
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: 2, right: 2,
            width: 20, height: 20, background: '#ef4444',
            borderRadius: '50%', fontSize: 11, fontWeight: 700,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>{unread}</div>
        )}
      </div>

      {/* ── CHAT WINDOW ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 390, maxWidth: 'calc(100vw - 32px)',
          height: 600, maxHeight: 'calc(100vh - 80px)',
          background: '#fff', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'botSlide .3s ease both',
          border: `1.5px solid ${C.border}`,
        }}>

          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, #2D5A3D 100%)`,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            flexShrink: 0,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
              border: '2px solid rgba(255,255,255,.25)',
              position: 'relative',
            }}>
              🤖
              <div style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 10, height: 10, background: '#4ade80',
                borderRadius: '50%', border: '2px solid #1A3A2A',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: "'Playfair Display',serif" }}>
                GramMitra AI
              </div>
              <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, marginTop: 1 }}>
                {speaking ? '🔊 Speaking...' : loading ? '💭 Thinking...' : '✅ Online — Ask anything!'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Auto-speak toggle */}
              {ttsSupported && (
                <button
                  onClick={() => setAutoSpeak(a => !a)}
                  title={autoSpeak ? 'Disable auto-speak' : 'Enable auto-speak'}
                  style={{
                    background: autoSpeak ? 'rgba(201,150,42,.3)' : 'rgba(255,255,255,.1)',
                    border: `1px solid ${autoSpeak ? '#C9962A' : 'rgba(255,255,255,.2)'}`,
                    borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                    fontSize: 15, color: autoSpeak ? '#C9962A' : 'rgba(255,255,255,.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >🔊</button>
              )}
              {/* Clear */}
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                  fontSize: 14, color: 'rgba(255,255,255,.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >🗑</button>
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
                  borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
                  fontSize: 18, color: '#fff', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '14px 14px 8px',
            background: '#FAFAF8',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, idx) => (
              <div key={idx} className="bot-msg" style={{
                display: 'flex',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 8,
              }}>
                {/* Avatar */}
                {m.role === 'assistant' && (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.forest}, #3E7A55)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>🤖</div>
                )}
                {m.role === 'user' && (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `linear-gradient(135deg, #C9962A, #E8B84B)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>{(window._gramUser?.name || 'U')[0]}</div>
                )}

                <div style={{ maxWidth: '78%' }}>
                  <div style={{
                    background: m.role === 'user' ? C.forest : C.bubble_bot,
                    color: m.role === 'user' ? '#fff' : '#1a1a1a',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '10px 14px',
                    fontSize: 13, lineHeight: 1.55,
                    border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  }}>
                    {renderText(m.content)}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#aaa', marginTop: 3,
                    textAlign: m.role === 'user' ? 'right' : 'left',
                    display: 'flex', gap: 6,
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                  }}>
                    {m.time?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {m.role === 'assistant' && ttsSupported && (
                      <button
                        onClick={() => speaking ? stopSpeaking() : speak(m.content)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 0, fontSize: 12, color: '#888', lineHeight: 1,
                        }}
                        title="Read aloud"
                      >{speaking ? '⏹' : '🔊'}</button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="bot-msg" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.forest}, #3E7A55)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🤖</div>
                <div style={{
                  background: C.bubble_bot, borderRadius: '16px 16px 16px 4px',
                  padding: '12px 16px', border: `1px solid ${C.border}`,
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions — only at start */}
          {messages.length <= 1 && (
            <div style={{
              padding: '8px 14px 4px',
              background: '#FAFAF8',
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 600, letterSpacing: .5 }}>
                QUICK QUESTIONS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {QUICK.map((q, i) => (
                  <button
                    key={i}
                    className="quick-chip"
                    onClick={() => sendMessage(q.text)}
                    style={{
                      background: '#fff', border: `1px solid ${C.border}`,
                      borderRadius: 20, padding: '5px 11px',
                      fontSize: 11.5, cursor: 'pointer',
                      color: '#334155', fontFamily: 'inherit',
                      transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {q.icon} {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '10px 12px',
            background: '#fff',
            borderTop: `1.5px solid ${C.border}`,
            flexShrink: 0,
          }}>
            {/* Voice wave animation */}
            {listening && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                justifyContent: 'center', marginBottom: 8,
                padding: '6px 12px',
                background: 'rgba(201,150,42,.08)',
                borderRadius: 20, border: '1px solid rgba(201,150,42,.3)',
              }}>
                {[...Array(9)].map((_, i) => (
                  <div key={i} style={{
                    width: 3, height: 6, background: C.gold,
                    borderRadius: 2,
                    animation: `waveBar .6s ease-in-out infinite`,
                    animationDelay: `${i * 0.07}s`,
                  }} />
                ))}
                <span style={{ fontSize: 11, color: C.gold, fontWeight: 600, marginLeft: 6 }}>
                  Listening... बोलें
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                className="bot-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="अपना सवाल यहाँ लिखें... (Hindi/English)"
                rows={1}
                style={{
                  flex: 1, border: `1.5px solid ${C.border}`,
                  borderRadius: 12, padding: '10px 14px',
                  fontSize: 13, fontFamily: 'inherit', color: '#1a1a1a',
                  resize: 'none', outline: 'none', background: C.light,
                  lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                }}
              />

              {/* Mic button */}
              {voiceSupported && (
                <button
                  className="mic-btn"
                  onClick={listening ? stopListening : startListening}
                  title={listening ? 'Stop listening' : 'Voice input (Hindi/English)'}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: listening ? 'rgba(239,68,68,.1)' : 'rgba(201,150,42,.08)',
                    border: `1.5px solid ${listening ? '#ef4444' : C.gold}`,
                    cursor: 'pointer', fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s', flexShrink: 0,
                    animation: listening ? 'botPulse 1s ease-in-out infinite' : 'none',
                  }}
                >
                  {listening ? '⏹' : '🎤'}
                </button>
              )}

              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: input.trim() && !loading
                    ? `linear-gradient(135deg, ${C.forest}, #3E7A55)`
                    : '#e5e7eb',
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, transition: 'all .2s', flexShrink: 0,
                  boxShadow: input.trim() && !loading ? '0 4px 12px rgba(26,58,42,.3)' : 'none',
                }}
              >
                {loading ? '⏳' : '➤'}
              </button>
            </div>

            <div style={{
              fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              🤖 Powered by Claude AI &nbsp;•&nbsp; 🎤 Voice in Hindi/English supported
            </div>
          </div>
        </div>
      )}
    </>
  );
}
