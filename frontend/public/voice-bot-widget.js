class GramSwasthyaVoiceBot {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'http://localhost:8000/api/global-assistant/chat';
        this.language = config.language || 'en-US';
        this.botLanguageName = config.botLanguageName || 'English';
        this.isListening = false;
        this.recognition = null;
        this.synth = window.speechSynthesis;
        
        this.init();
    }

    init() {
        // Inject HTML
        const container = document.createElement('div');
        container.id = 'gramswasthya-voice-bot-container';
        container.innerHTML = `
            <div id="gramswasthya-chat-window">
                <div id="gramswasthya-bot-header">
                    <h3>GramSwasthya AI Voice</h3>
                    <button id="gramswasthya-bot-close">&times;</button>
                </div>
                <div id="gramswasthya-bot-messages">
                    <div class="bot-msg">Hello! I am your AI health assistant. Tap the microphone and tell me how you are feeling today.</div>
                </div>
                <div id="gramswasthya-bot-input-area">
                    <button id="gramswasthya-bot-mic" class="gramswasthya-icon-btn" title="Hold to Speak">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                    </button>
                    <input type="text" id="gramswasthya-bot-input" placeholder="Type a message..." />
                    <button id="gramswasthya-bot-send" class="gramswasthya-icon-btn" title="Send">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
            <button id="gramswasthya-bot-toggle" title="Open Voice Assistant">
                <svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            </button>
        `;
        document.body.appendChild(container);

        // Load CSS if not already loaded
        if (!document.querySelector('link[href*="voice-bot-widget.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            // User will need to host this CSS file, assuming it's in the same directory for this script
            link.href = config.cssUrl || 'voice-bot-widget.css'; 
            document.head.appendChild(link);
        }

        this.bindEvents();
        this.setupSpeechRecognition();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('gramswasthya-bot-toggle');
        const closeBtn = document.getElementById('gramswasthya-bot-close');
        const chatWindow = document.getElementById('gramswasthya-chat-window');
        const sendBtn = document.getElementById('gramswasthya-bot-send');
        const inputField = document.getElementById('gramswasthya-bot-input');
        const micBtn = document.getElementById('gramswasthya-bot-mic');

        toggleBtn.addEventListener('click', () => {
            chatWindow.classList.add('active');
            toggleBtn.style.display = 'none';
        });

        closeBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
            toggleBtn.style.display = 'flex';
        });

        sendBtn.addEventListener('click', () => this.handleSendText());
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendText();
        });

        micBtn.addEventListener('click', () => this.toggleListening());
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition API is not supported in this browser.");
            document.getElementById('gramswasthya-bot-mic').style.display = 'none';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = this.language;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('gramswasthya-bot-mic').classList.add('listening');
            this.addMessage('Listening...', 'user-msg', true); // Temporary message
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            
            // Remove temporary listening message
            const tempMsg = document.querySelector('.temp-listening');
            if (tempMsg) tempMsg.remove();
            
            this.addMessage(transcript, 'user-msg');
            this.sendMessageToAPI(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            const tempMsg = document.querySelector('.temp-listening');
            if (tempMsg) tempMsg.remove();
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    toggleListening() {
        if (!this.recognition) return alert('Speech recognition not supported.');
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            // Stop any ongoing speech synthesis
            this.synth.cancel();
            this.recognition.start();
        }
    }

    stopListening() {
        this.isListening = false;
        const micBtn = document.getElementById('gramswasthya-bot-mic');
        if (micBtn) micBtn.classList.remove('listening');
    }

    handleSendText() {
        const inputField = document.getElementById('gramswasthya-bot-input');
        const text = inputField.value.trim();
        if (!text) return;
        
        inputField.value = '';
        this.addMessage(text, 'user-msg');
        this.sendMessageToAPI(text);
    }

    addMessage(text, className, isTemp = false) {
        const messagesContainer = document.getElementById('gramswasthya-bot-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = className + (isTemp ? ' temp-listening' : '');
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessageToAPI(text) {
        // Show loading state
        const loadingId = 'loading-' + Date.now();
        const messagesContainer = document.getElementById('gramswasthya-bot-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'bot-msg';
        loadingDiv.id = loadingId;
        loadingDiv.textContent = 'Thinking...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_message: text,
                    language: this.botLanguageName,
                })
            });

            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const voiceResponse = data.assistant_voice_response || data.detailed_text_response || "I am unable to assist you at this moment.";
            
            this.addMessage(voiceResponse, 'bot-msg');
            this.speak(voiceResponse);

        } catch (error) {
            console.error('API call failed:', error);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();
            
            this.addMessage("I'm sorry, I couldn't reach the server. Please try again.", 'bot-msg');
        }
    }

    speak(text) {
        if (!this.synth) return;
        this.synth.cancel(); // Stop current speech
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.language;
        // Adjust speed/pitch if desired
        utterance.rate = 1.0;
        
        this.synth.speak(utterance);
    }
}

// Attach to window so users can call it
window.GramSwasthyaVoiceBot = GramSwasthyaVoiceBot;
