import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Mic, MicOff, Volume2, VolumeX, Sparkles, Trash2 } from 'lucide-react';

/* ── Speech helpers ─────────────────────────────────────────────── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function speak(text, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  // Strip markdown-style formatting for cleaner speech
  const clean = text.replace(/\*\*/g, '').replace(/[#_\->`]/g, '').replace(/\n+/g, '. ');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.lang = 'en-IN';

  // Try to pick a natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

/* ── Markdown-lite renderer ─────────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ margin: '6px 0', paddingLeft: '18px' }}>
          {listItems.map((li, idx) => (
            <li key={idx} style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '2px' }}>{formatInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Numbered list
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    // Bullet list
    const bulletMatch = line.match(/^[-*]\s+(.+)/);

    if (numMatch) {
      listItems.push(numMatch[1]);
    } else if (bulletMatch) {
      listItems.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={`br-${i}`} style={{ height: '6px' }} />);
      } else {
        elements.push(
          <p key={`p-${i}`} style={{ fontSize: '13px', lineHeight: '1.6', margin: '2px 0' }}>
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();
  return elements;
}

function formatInline(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Emoji warning
    if (part.includes('⚠️') || part.includes('🚨')) {
      return <span key={i} style={{ color: '#dc2626' }}>{part}</span>;
    }
    // Italic disclaimer
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i} style={{ opacity: 0.7, fontSize: '11px' }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

/* ── Main component ──────────────────────────────────────────────── */
export default function HealthBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello! 👋 I\'m your **GramSwasthya AI Assistant** powered by advanced AI.\n\nI can help you with:\n- Health questions and symptom guidance\n- Understanding lab reports\n- Diet and wellness advice\n- Finding the right specialist\n\nYou can **type** or press the 🎤 **mic button** to speak!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, isOpen]);

  // Load voices (needed for some browsers)
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const handle = () => window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', handle);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', handle);
  }, []);

  // Pulse animation for floating button
  useEffect(() => {
    if (!isOpen) {
      const timer = setInterval(() => setPulseCount(c => c + 1), 4000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isThinking) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Build history for context (last 10 messages)
    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const res = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history
        })
      });

      const data = await res.json();
      const reply = data.reply || 'I apologize, I couldn\'t process that. Please try again.';

      const botMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

      // Speak the response
      if (isSpeechEnabled) {
        speak(reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I\'m sorry, I\'m having trouble connecting right now. Please try again in a moment.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, messages, isSpeechEnabled]);

  // ── Handle form submit ────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // ── Voice input ───────────────────────────────────────────────
  const toggleListening = () => {
    if (!SpeechRecognition) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(finalTranscript);
        // Auto-send after a short delay
        setTimeout(() => sendMessage(finalTranscript), 300);
      } else {
        setInput(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── Clear chat ────────────────────────────────────────────────
  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: 'Chat cleared! How can I help you?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // ── Stop speech ───────────────────────────────────────────────
  const toggleSpeech = () => {
    if (isSpeechEnabled) {
      window.speechSynthesis?.cancel();
    }
    setIsSpeechEnabled(!isSpeechEnabled);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '72px',
          right: '0',
          width: '400px',
          maxWidth: 'calc(100vw - 48px)',
          height: '580px',
          maxHeight: 'calc(100vh - 120px)',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
          animation: 'chatSlideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          background: '#fff',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '14px',
              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0, letterSpacing: '-0.01em' }}>
                GramSwasthya AI
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: '2px 0 0', fontWeight: 500 }}>
                {isThinking ? '● Thinking...' : '● Online · Gemini AI'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={toggleSpeech}
                title={isSpeechEnabled ? 'Mute voice' : 'Unmute voice'}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px',
                  width: '34px', height: '34px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                {isSpeechEnabled ? <Volume2 size={16} color="#fff" /> : <VolumeX size={16} color="#fff" />}
              </button>
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px',
                  width: '34px', height: '34px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <Trash2 size={15} color="#fff" />
              </button>
              <button
                onClick={() => { setIsOpen(false); window.speechSynthesis?.cancel(); }}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px',
                  width: '34px', height: '34px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <X size={18} color="#fff" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#f8faf9',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'chatFadeIn 0.3s ease-out',
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  maxWidth: '88%',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '10px',
                    background: msg.role === 'user' ? '#e0e7ff' : '#d1fae5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {msg.role === 'user'
                      ? <User size={14} color="#4f46e5" />
                      : <Bot size={14} color="#059669" />
                    }
                  </div>
                  {/* Bubble */}
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #059669, #047857)'
                      : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#1f2937',
                    boxShadow: msg.role === 'user'
                      ? '0 2px 8px rgba(5, 150, 105, 0.3)'
                      : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                  }}>
                    <div>{renderMarkdown(msg.content)}</div>
                    <p style={{
                      fontSize: '10px',
                      marginTop: '6px',
                      opacity: 0.5,
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                    }}>{msg.time}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', animation: 'chatFadeIn 0.3s ease-out' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '10px',
                  background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={14} color="#059669" />
                </div>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '16px 16px 16px 4px',
                  background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', animation: 'chatDot 1.4s ease-in-out infinite', animationDelay: '0ms' }} />
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', animation: 'chatDot 1.4s ease-in-out infinite', animationDelay: '200ms' }} />
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', animation: 'chatDot 1.4s ease-in-out infinite', animationDelay: '400ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Voice indicator bar */}
          {isListening && (
            <div style={{
              background: '#fef3c7',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderTop: '1px solid #fde68a',
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#dc2626', animation: 'chatPulse 1s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
                Listening... Speak now
              </span>
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '12px 14px',
            background: '#fff',
            borderTop: '1px solid #f0f0f0',
            flexShrink: 0,
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Mic button */}
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Voice input'}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: isListening ? '#fef2f2' : '#f0fdf4',
                  border: isListening ? '2px solid #fca5a5' : '1px solid #d1fae5',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                  animation: isListening ? 'chatPulse 1s ease-in-out infinite' : 'none',
                }}
              >
                {isListening
                  ? <MicOff size={18} color="#dc2626" />
                  : <Mic size={18} color="#059669" />
                }
              </button>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Type your health question...'}
                disabled={isThinking}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  padding: '0 14px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#f9fafb',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.target.style.borderColor = '#059669'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: input.trim() && !isThinking ? '#059669' : '#e5e7eb',
                  border: 'none', cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                <Send size={16} color={input.trim() && !isThinking ? '#fff' : '#9ca3af'} style={{ marginLeft: '1px' }} />
              </button>
            </form>
            <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '6px' }}>
              Powered by Gemini AI · {isSpeechEnabled ? '🔊 Voice on' : '🔇 Voice off'} · Press 🎤 to speak
            </p>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px', height: '60px', borderRadius: '18px',
          background: isOpen
            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
            : 'linear-gradient(135deg, #059669, #047857)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isOpen
            ? '0 8px 30px rgba(220, 38, 38, 0.4)'
            : '0 8px 30px rgba(5, 150, 105, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          position: 'relative',
        }}
      >
        {isOpen ? <X size={26} color="#fff" /> : <MessageCircle size={28} color="#fff" />}
        {/* Notification dot */}
        {!isOpen && (
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: '#f59e0b', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 700, color: '#fff',
          }}>AI</span>
        )}
      </button>

      {/* Inline CSS animations */}
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes chatPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
