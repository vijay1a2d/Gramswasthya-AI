import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader, Send, Globe } from 'lucide-react';

const VoiceDietAssistant = ({ patientId, currentPlan, onPlanUpdate }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // If we have a final transcript when it ends, process it
        if (transcript.trim() && !isLoading) {
          handleSendMessage(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [transcript, isLoading]);

  // Update language for recognition
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
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      // Stop speaking if currently speaking
      if (isSpeaking && synthRef.current) {
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speak = (text) => {
    if (!voiceEnabled || !text || !synthRef.current) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to set voice based on language
    const voices = synthRef.current.getVoices();
    let selectedVoice = null;
    
    if (language === 'Hindi') {
      selectedVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi'));
    } else if (language === 'Telugu') {
      selectedVoice = voices.find(v => v.lang.includes('te') || v.name.includes('Telugu'));
    } else {
      selectedVoice = voices.find(v => v.lang.includes('en') || v.name.includes('English'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !patientId || !currentPlan) return;

    const userMsg = messageText.trim();
    setTranscript('');
    setIsListening(false);
    
    const newChatHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newChatHistory);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/diet-plan/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          current_plan: currentPlan,
          user_message: userMsg,
          language: language,
          chat_history: chatHistory.slice(-4) // Send last 4 msgs for context
        }),
      });

      if (!response.ok) throw new Error('Failed to reach AI Backend');

      const data = await response.json();
      
      const assistantMsg = data.assistant_voice_response || "I have updated the plan.";
      setChatHistory([...newChatHistory, { role: 'assistant', content: assistantMsg }]);
      
      speak(assistantMsg);

      if (data.updated_plan_needed && data.updated_plan && onPlanUpdate) {
        onPlanUpdate(data.updated_plan);
      }
    } catch (error) {
      console.error(error);
      const errorMsg = "Sorry, I am having trouble connecting to the medical core. Please try again.";
      setChatHistory([...newChatHistory, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (transcript.trim()) {
      handleSendMessage(transcript);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full">
      
      {/* Header & Controls */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          Voice Diet Assistant
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 border border-gray-100">
            <Globe size={14} className="text-gray-400" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent border-none outline-none text-gray-700 cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Telugu">తెలుగు</option>
            </select>
          </div>
          <button 
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled && isSpeaking) synthRef.current.cancel();
            }}
            className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'bg-primary-light/30 text-primary' : 'bg-gray-100 text-gray-500'}`}
            title={voiceEnabled ? "Mute TTS" : "Enable TTS"}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[150px] max-h-[300px] pr-2 custom-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 bg-primary-light/30 rounded-full flex items-center justify-center mb-3">
              <Mic size={20} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-600">Ask the dietitian to modify the plan.</p>
            <p className="text-xs text-gray-400 mt-1">Tap the microphone and say "I am allergic to dairy" or "Make it fully vegetarian".</p>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none shadow-sm' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
        
        {isSpeaking && !isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-3">
               <div className="flex items-end gap-1 h-3 h-full">
                  <span className="w-1 bg-primary/40 h-2 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></span>
                  <span className="w-1 bg-primary/60 h-4 rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]"></span>
                  <span className="w-1 bg-primary h-3 rounded-full animate-[pulse_1s_ease-in-out_infinite_0.4s]"></span>
                  <span className="w-1 bg-primary/60 h-4 rounded-full animate-[pulse_1s_ease-in-out_infinite_0.2s]"></span>
                  <span className="w-1 bg-primary/40 h-2 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></span>
               </div>
               <span className="text-[10px] text-gray-400 uppercase font-semibold">Speaking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleManualSubmit} className="relative mt-auto">
        <div className={`overflow-hidden rounded-xl border transition-all ${isListening ? 'border-primary ring-2 ring-primary/20 bg-primary-light/5' : 'border-gray-200 bg-gray-50'}`}>
          <div className="relative">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={isListening ? "Listening..." : "Type or speak your request..."}
              className="w-full bg-transparent px-4 py-3 pr-[80px] text-sm focus:outline-none placeholder-gray-400"
              disabled={isLoading || isListening}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {transcript.trim() && !isListening ? (
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Send size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                      : 'bg-primary-light/50 text-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VoiceDietAssistant;
