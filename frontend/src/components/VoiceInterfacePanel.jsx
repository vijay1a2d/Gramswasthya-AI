import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Activity, AlertTriangle, CheckCircle, Volume2, ShieldAlert } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceInterfacePanel() {
  const t = {};
  
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Audio recording
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  
  // Results
  const [symptoms, setSymptoms] = useState([]);
  const [emotion, setEmotion] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [triage, setTriage] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Language could be set dynamically, hardcoding en-IN for now
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          alert("Please allow microphone access");
          stopRecording();
        }
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.current.onstop = processAudio;

      mediaRecorder.current.start();
      setIsListening(true);
      setTranscript('');
      
      if (recognitionRef.current) {
        try {
           recognitionRef.current.start();
        } catch(e){}
      }
    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Microphone access is required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch(e){}
    }
    setIsListening(false);
  };

  const toggleRecording = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const processAudio = async () => {
    if (audioChunks.current.length === 0) return;
    setIsProcessing(true);

    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice_input.webm");
    
    // We send the current transcript as the text fallback
    formData.append("text", transcript || "Patient spoke but no text captured");
    formData.append("language", "English"); // Defaulting to English for demo
    formData.append("context", JSON.stringify({
      age: 45, // mock
      duration_days: 2
    }));

    try {
      const res = await fetch('http://localhost:8000/api/voice-assistant/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setSymptoms(data.detected_symptoms || []);
        setEmotion(data.emotion_analysis?.emotion);
        setRiskScore(data.risk_assessment?.risk_score || 0);
        setTriage(data.triage);
        setRecommendation(data.recommendation);
        
        // Speak recommendation
        if (window.speechSynthesis) {
           const utterance = new SpeechSynthesisUtterance(data.recommendation);
           window.speechSynthesis.speak(utterance);
        }
      }
    } catch (error) {
      console.error("Error analyzing voice:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper colors
  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-green-600';
  };

  const getRiskBg = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
       {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 opacity-60" />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Side: Mic & Transcript */}
        <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 pr-0 md:pr-8">
          
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Voice Triage Assistant</h2>
            <p className="text-sm text-gray-500 mt-1">Describe your symptoms naturally.</p>
          </div>

          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`
              w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative
              ${isListening ? 'bg-red-50 hover:bg-red-100 border-2 border-red-200' : 'bg-green-50 hover:bg-green-100 border-2 border-green-200'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20" />
            )}
            {isListening ? (
              <MicOff size={40} className="text-red-500 relative z-10" />
            ) : (
              <Mic size={40} className="text-green-600 relative z-10" />
            )}
          </button>

          <p className="mt-4 font-medium text-gray-700">
            {isProcessing ? 'Analyzing voice patterns...' : isListening ? 'Listening...' : 'Tap to speak'}
          </p>

          <div className="mt-6 w-full h-32 bg-gray-50 rounded-xl p-4 border border-gray-100 overflow-y-auto">
            <p className="text-sm text-gray-600 italic">
              {transcript || "Your speech will appear here..."}
            </p>
          </div>
        </div>

        {/* Right Side: Results Panel */}
        <div className="flex-1 flex flex-col justify-center">
           {!triage ? (
             <div className="flex flex-col items-center justify-center text-gray-400 h-full">
               <Activity size={48} className="mb-3 opacity-20" />
               <p>Results will appear here after analysis</p>
             </div>
           ) : (
             <div className="space-y-6 animate-fade-in">
               
               {/* Triage Banner */}
               <div className={`p-4 rounded-xl flex items-center gap-4 ${
                 triage.level === 'Emergency' ? 'bg-red-50 border border-red-200' :
                 triage.level === 'Urgent' ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'
               }`}>
                 {triage.level === 'Emergency' ? <ShieldAlert size={28} className="text-red-600"/> :
                  triage.level === 'Urgent' ? <AlertTriangle size={28} className="text-orange-600"/> : 
                  <CheckCircle size={28} className="text-green-600"/>}
                 <div>
                   <h3 className={`text-lg font-bold ${getRiskColor(riskScore)}`}>Triage: {triage.level}</h3>
                   <p className="text-sm font-medium text-gray-700">{triage.action}</p>
                 </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Emotion Detected</p>
                   <p className="font-semibold text-gray-900">{emotion || "Normal"}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                   <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk Score</p>
                   <div className="flex items-center gap-2">
                     <p className={`font-bold text-lg ${getRiskColor(riskScore)}`}>{riskScore}/100</p>
                     <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                       <div className={`h-full ${getRiskBg(riskScore)}`} style={{ width: `${riskScore}%` }}></div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Symptoms */}
               <div>
                 <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Extracted Symptoms</p>
                 <div className="flex flex-wrap gap-2">
                   {symptoms.length > 0 ? symptoms.map((sym, idx) => (
                     <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                       {sym}
                     </span>
                   )) : <span className="text-sm text-gray-500">None detected</span>}
                 </div>
               </div>

               {/* Recommendation */}
               <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                 <div className="flex items-center gap-2 mb-2">
                   <Volume2 size={16} className="text-primary" />
                   <p className="text-xs uppercasetracking-wider font-semibold text-primary">AI Recommendation</p>
                 </div>
                 <p className="text-sm text-gray-800 leading-relaxed">
                   {recommendation}
                 </p>
               </div>

             </div>
           )}
        </div>
      </div>
    </div>
  );
}
