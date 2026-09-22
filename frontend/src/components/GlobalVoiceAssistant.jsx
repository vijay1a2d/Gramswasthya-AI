import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Globe, Bot, X, Maximize2, Minimize2, ChevronRight, Activity } from 'lucide-react';

/* ── Markdown-lite renderer ─────────────────────────────────────── */
function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.includes('⚠️') || part.includes('🚨')) {
      return <span key={i} className="text-red-500">{part}</span>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i} className="opacity-80 text-[13px]">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1.5 pl-5 list-disc space-y-1">
          {listItems.map((li, idx) => (
            <li key={idx} className="text-[15px] sm:text-[16px] leading-relaxed mb-0.5">{formatInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const numMatch = line.match(/^\d+\.\s+(.+)/);
    const bulletMatch = line.match(/^[-*]\s+(.+)/);

    if (numMatch) {
      listItems.push(numMatch[1]);
    } else if (bulletMatch) {
      listItems.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={`br-${i}`} className="h-1.5" />);
      } else {
        if (line.startsWith('### ')) {
          elements.push(<h3 key={`h3-${i}`} className="text-[17px] font-bold mt-2 mb-1 text-teal-800">{formatInline(line.substring(4))}</h3>);
        } else if (line.startsWith('## ')) {
          elements.push(<h2 key={`h2-${i}`} className="text-[18px] font-bold mt-2 mb-1 text-teal-800">{formatInline(line.substring(3))}</h2>);
        } else if (line.startsWith('# ')) {
          elements.push(<h1 key={`h1-${i}`} className="text-[20px] font-bold mt-3 mb-2 text-teal-900">{formatInline(line.substring(2))}</h1>);
        } else {
          elements.push(
            <p key={`p-${i}`} className="text-[15px] sm:text-[16px] leading-relaxed my-1">
              {formatInline(line)}
            </p>
          );
        }
      }
    }
  }
  flushList();
  return elements;
}

const GlobalVoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState(null);

  // Dragging State for Avatar
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const hasDraggedRef = useRef(false);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartPos.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos.x,
      baseY: pos.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartPos.current.startX;
      const dy = e.clientY - dragStartPos.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      setPos({
        x: dragStartPos.current.baseX + dx,
        y: dragStartPos.current.baseY + dy
      });
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const transcriptRef = useRef('');
  const [submitTrigger, setSubmitTrigger] = useState(0);
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (submitTrigger > 0 && transcript.trim() && !isLoading) {
      handleSendMessage(transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitTrigger]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);

        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) recognitionRef.current.stop();
        }, 7000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (transcriptRef.current.trim()) {
          setSubmitTrigger(prev => prev + 1);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      if (language === 'Hindi') recognitionRef.current.lang = 'hi-IN';
      else if (language === 'Telugu') recognitionRef.current.lang = 'te-IN';
      else recognitionRef.current.lang = 'en-US';
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported in your browser.");
    
    if (isListening) {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      if (isSpeaking && synthRef.current) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) recognitionRef.current.stop();
        }, 7000);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speak = (text) => {
    if (!voiceEnabled || !text || !synthRef.current) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synthRef.current.getVoices();
    let selectedVoice = null;
    
    if (language === 'Hindi') {
      selectedVoice = voices.find(v => v.lang.includes('hi') && v.name.includes('Female')) || voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi'));
    } else if (language === 'Telugu') {
      selectedVoice = voices.find(v => v.lang.includes('te') && v.name.includes('Female')) || voices.find(v => v.lang.includes('te') || v.name.includes('Telugu'));
    } else {
      selectedVoice = voices.find(v => v.name.includes('Google UK English Female')) ||
                      voices.find(v => v.name.includes('Google US English')) ||
                      voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-AU')) ||
                      voices.find(v => v.name.includes('Samantha') || v.name.includes('Zira')) ||
                      voices.find(v => v.lang.includes('en') || v.name.includes('English'));
    }
    
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.pitch = 1.1; 
    utterance.rate = 0.95;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMsg = messageText.trim();
    setTranscript('');
    setIsListening(false);
    setSuggestedAction(null);
    
    const newChatHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newChatHistory);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/global-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMsg,
          language: language,
          chat_history: chatHistory.slice(-4)
        }),
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      const voiceMsg = data.assistant_voice_response || "I am here to assist you.";
      const textMsg = data.detailed_text_response || voiceMsg;
      
      setChatHistory([...newChatHistory, { role: 'assistant', content: textMsg }]);
      if (data.suggested_action && data.suggested_action !== "None") {
         setSuggestedAction(data.suggested_action);
      }
      
      speak(voiceMsg);
    } catch (error) {
      const errorMsg = "Connections issue. Try again later.";
      setChatHistory([...newChatHistory, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (transcript.trim()) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
      } else {
        handleSendMessage(transcript);
      }
    }
  };

  // 3D Avatar CSS classes
  const avatarMainClass = `relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
    isSpeaking 
      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.6)] scale-[1.02] border border-white/20' 
      : isListening 
        ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-[1.02] border border-white/20' 
        : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-[0_10px_25px_rgba(20,184,166,0.5)] border border-white/10'
  }`;

  return (
    <div 
      className={`fixed bottom-6 left-6 z-[100] font-sans flex flex-col items-start`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      
      {/* Expanded Chat Interface */}
      <div 
         className={`bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-400 ease-out origin-bottom-left flex flex-col mb-4
            ${isOpen ? 'opacity-100 scale-100 w-[400px]' : 'opacity-0 scale-95 w-0 h-0 pointer-events-none'}`}
         style={{ height: isOpen ? (expanded ? '650px' : '450px') : '0px' }}
      >
         {/* Header */}
         <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 shadow-inner flex items-center justify-center p-1.5">
                  <Bot size={16} className="text-white drop-shadow-md" />
               </div>
               <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">AI Voice Doc</h3>
                  <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span> Online
                  </p>
               </div>
            </div>
            <div className="flex items-center gap-1.5">
               <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
               </button>
               <button onClick={() => setIsOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} />
               </button>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
            {chatHistory.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Bot size={40} className="text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">How can I help you today?</p>
                  <p className="text-xs text-gray-400 mt-1">Tap the microphone below to speak</p>
               </div>
            ) : (
               chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] sm:text-[16px] shadow-sm whitespace-pre-wrap ${
                        msg.role === 'user' 
                           ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-br-sm' 
                           : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm leading-relaxed'
                     }`}>
                        {msg.role === 'assistant' ? (
                           <div className="markdown-content space-y-1">
                              {renderMarkdown(msg.content)}
                           </div>
                        ) : (
                           msg.content
                        )}
                     </div>
                  </div>
               ))
            )}
            
            {isLoading && (
               <div className="flex justify-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                     <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                     <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                  </div>
               </div>
            )}

            {suggestedAction && (
                <div className="flex justify-center mt-2 animate-[slideUp_0.3s_ease-out]">
                   <button className="flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-bold px-4 py-2 rounded-full border border-teal-100 hover:bg-teal-100 transition-colors shadow-sm">
                      <Activity size={14} /> {suggestedAction} <ChevronRight size={14} className="ml-1" />
                   </button>
                </div>
            )}
            <div className="h-2"></div>
         </div>

         {/* Controls */}
         <div className="p-3 bg-white border-t border-gray-100 flex flex-col shrink-0 gap-3">
            <div className="flex items-center justify-between px-1">
               <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <Globe size={14} className="text-gray-400 mx-1" />
                  <select 
                     value={language} 
                     onChange={(e) => setLanguage(e.target.value)}
                     className="bg-transparent border-none text-xs font-medium text-gray-600 outline-none cursor-pointer py-0.5 pr-2"
                  >
                     <option value="English">English</option>
                     <option value="Hindi">हिंदी</option>
                     <option value="Telugu">తెలుగు</option>
                  </select>
               </div>
               
               <button 
                  onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) synthRef.current.cancel(); }}
                  className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:bg-gray-100'}`}
               >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
               </button>
            </div>

            <form onSubmit={handleManualSubmit} className="relative w-full flex items-center gap-2">
               <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={isListening ? "Listening deeply..." : "Type or click mic..."}
                  className={`flex-1 bg-gray-50 border transition-colors outline-none px-4 py-2.5 rounded-xl text-sm
                     ${isListening ? 'border-red-200 bg-red-50/50 text-red-900 placeholder-red-300' : 'border-gray-200 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-50'}`}
                  disabled={isLoading || isListening}
               />
               <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-sm
                     ${isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
                        : transcript.trim() 
                           ? 'bg-gray-800 text-white hover:bg-gray-900 focus:scale-95' 
                           : 'bg-teal-500 text-white hover:bg-teal-600 hover:shadow-teal-500/25 focus:scale-95'
                     }`}
               >
                  {isListening ? <MicOff size={20} /> : transcript.trim() ? <ChevronRight size={20} /> : <Mic size={20} />}
               </button>
            </form>
         </div>
      </div>

      {/* 3D Global Avatar Floating Button */}
      <div className="relative group perspective-[1000px]">
         {/* Ping effect behind the avatar */}
         {!isOpen && (
            <div className="absolute inset-0 bg-teal-400 rounded-3xl opacity-30 animate-[ping_3s_ease-out_infinite]"></div>
         )}
         
         <button 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
               if (!hasDraggedRef.current) {
                  setIsOpen(!isOpen);
               }
            }}
            className={`relative flex items-center justify-center outline-none hover:scale-105 transition-transform duration-300 z-10 cursor-grab active:cursor-grabbing 
               ${isOpen ? 'w-16 h-16' : 'w-20 h-20'}`}
            style={{ transformStyle: 'preserve-3d' }}
         >
            {/* The 3D Container */}
            <div className={avatarMainClass}>
               
               {/* 3D Inner Scene Grid Lines */}
               <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:10px_10px]"
                    style={{ transform: 'rotateX(60deg) scale(2.5) translateY(20px)' }}></div>
               
               {/* Stylized Avatar Center */}
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSpeaking ? 'scale-110 -translate-y-1' : ''}`}>
                     {/* Head Layer */}
                     <div className="relative z-20">
                        <div className={`w-8 h-8 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.3)] border-2 transition-colors duration-500
                           ${isSpeaking ? 'bg-purple-100 border-purple-200' : isListening ? 'bg-red-50 border-white' : 'bg-teal-50 border-white'}`}>
                           {/* Eyes */}
                           <div className="absolute top-[10px] left-1.5 w-[6px] h-2 bg-gray-800 rounded-full"></div>
                           <div className="absolute top-[10px] right-1.5 w-[6px] h-2 bg-gray-800 rounded-full"></div>
                           {/* Face display curve/mouth */}
                           <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 h-1 rounded-full bg-gray-800 transition-all duration-150
                              ${isSpeaking ? 'w-3 h-2 animate-[pulse_0.2s_ease-in-out_infinite]' : isListening ? 'w-1.5 h-1.5' : 'w-4'}`}></div>
                        </div>
                        {/* Stethoscope around neck implied */}
                        <div className="absolute -bottom-1 -left-1 w-10 h-6 border-b-2 border-r-2 border-gray-800/80 rounded-full rounded-tl-none rounded-tr-none rotate-12 z-10"></div>
                     </div>
                     
                     {/* Body/Coat */}
                     <div className="relative -mt-1 w-12 h-10 rounded-t-xl bg-white shadow-lg overflow-hidden border-t border-white/50 z-10 flex justify-center">
                        {/* Coat opening line */}
                        <div className="w-px h-full bg-gray-200"></div>
                     </div>
                  </div>
               </div>

               {/* Audio Visualizer Rings when listening/speaking */}
               {(isListening || isSpeaking) && (
                  <div className="absolute inset-0 flex items-center justify-center z-0 perspective-[500px]">
                     <div className={`absolute w-16 h-16 rounded-full border-2 border-white/40 ${isSpeaking ? 'animate-[ping_1.5s_ease-out_infinite]' : 'animate-ping'}`} style={{ transform: 'rotateX(60deg)' }}></div>
                     <div className={`absolute w-20 h-20 rounded-full border border-white/20 ${isSpeaking ? 'animate-[ping_2s_ease-out_infinite]' : 'animate-[ping_1.5s_ease-out_infinite]'}`} style={{ transform: 'rotateX(60deg)' }}></div>
                  </div>
               )}
            </div>
         </button>

         {/* Tooltip prompt when closed */}
         {!isOpen && (
            <div className="absolute left-[90px] top-1/2 -translate-y-1/2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
               <div className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl relative animate-[slideRight_0.3s_ease-out]">
                  Voice Assistant
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[5px] border-transparent border-r-gray-900"></div>
               </div>
            </div>
         )}
      </div>

      <style>{`
         @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
         }
         @keyframes slideRight {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
         }
      `}</style>
    </div>
  );
};

export default GlobalVoiceAssistant;
