/**
 * Chatbot Widget - Floating AI Assistant for CyberPro Portal
 * Provides context-aware help for OT/ICS security learning
 */

class ChatbotWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;
        this.currentContext = this.detectContext();

        this.init();
    }

    detectContext() {
        const path = window.location.pathname;
        if (path.includes('scada')) return { currentLab: 'scada' };
        if (path.includes('plc')) return { currentLab: 'plc' };
        if (path.includes('network')) return { currentLab: 'network' };
        if (path.includes('pentest')) return { currentLab: 'pentest' };
        return {};
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadHistory();
    }

    createWidget() {
        const widgetHTML = `
            <div id="chatbot-widget" class="chatbot-widget">
                <!-- Floating Button -->
                <button id="chatbot-toggle" class="chatbot-toggle" aria-label="Toggle AI Assistant">
                    <svg class="chatbot-icon" viewBox="0 0 24 24" fill="currentColor">
                        <!-- Main star -->
                        <path d="M12 2L14.09 8.26L20 9.27L15.45 13.14L16.91 19L12 15.77L7.09 19L8.55 13.14L4 9.27L9.91 8.26L12 2Z" fill="currentColor"/>
                        <!-- Small sparkles -->
                        <circle cx="5" cy="5" r="1" fill="currentColor"/>
                        <circle cx="19" cy="5" r="1" fill="currentColor"/>
                        <circle cx="5" cy="19" r="1" fill="currentColor"/>
                        <circle cx="19" cy="19" r="1" fill="currentColor"/>
                        <!-- Sparkle rays -->
                        <path d="M5 5L6 6M19 5L18 6M5 19L6 18M19 19L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span class="chatbot-badge" id="chatbot-badge">1</span>
                </button>

                <!-- Chat Window -->
                <div id="chatbot-window" class="chatbot-window">
                    <!-- Header -->
                    <div class="chatbot-header">
                        <div class="chatbot-header-info">
                            <div class="chatbot-avatar">🤖</div>
                            <div>
                                <div class="chatbot-title">AI Learning Assistant</div>
                                <div class="chatbot-status">
                                    <span class="status-dot"></span>
                                    <span id="chatbot-status-text">Online</span>
                                </div>
                            </div>
                        </div>
                        <button id="chatbot-minimize" class="chatbot-header-btn" aria-label="Minimize">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>

                    <!-- Messages -->
                    <div id="chatbot-messages" class="chatbot-messages">
                        <div class="chatbot-welcome">
                            <div class="welcome-icon">👋</div>
                            <h3>Hi! I'm your AI Learning Assistant</h3>
                            <p>I can help you with OT/ICS security concepts, lab guidance, and troubleshooting.</p>
                        </div>
                    </div>

                    <!-- Suggestions -->
                    <div id="chatbot-suggestions" class="chatbot-suggestions"></div>

                    <!-- Input -->
                    <div class="chatbot-input-container">
                        <textarea 
                            id="chatbot-input" 
                            class="chatbot-input" 
                            placeholder="Ask me anything about cybersecurity..."
                            rows="1"
                        ></textarea>
                        <button id="chatbot-send" class="chatbot-send-btn" aria-label="Send message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    attachEventListeners() {
        // Toggle button
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggle();
        });

        // Minimize button
        document.getElementById('chatbot-minimize').addEventListener('click', () => {
            this.close();
        });

        // Send button
        document.getElementById('chatbot-send').addEventListener('click', () => {
            this.sendMessage();
        });

        // Input field
        const input = document.getElementById('chatbot-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        // Keyboard shortcut (Escape to close)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        document.getElementById('chatbot-toggle').classList.add('active');
        document.getElementById('chatbot-window').classList.add('open');
        document.getElementById('chatbot-badge').style.display = 'none';
        document.getElementById('chatbot-input').focus();

        // Show initial suggestions if no messages
        if (this.messages.length === 0) {
            this.showSuggestions([
                'How do I start a lab?',
                'What is SCADA?',
                'Explain Modbus protocol'
            ]);
        }
    }

    close() {
        this.isOpen = false;
        document.getElementById('chatbot-toggle').classList.remove('active');
        document.getElementById('chatbot-window').classList.remove('open');
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();

        if (!message) return;

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Add user message to UI
        this.addMessage('user', message);

        // Clear suggestions
        this.clearSuggestions();

        // Show typing indicator
        this.showTyping();

        try {
            // Send to backend
            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    context: this.currentContext
                })
            });

            const data = await response.json();

            // Hide typing indicator
            this.hideTyping();

            if (data.success) {
                // Add bot response
                this.addMessage('bot', data.response);

                // Show suggestions
                if (data.suggestions && data.suggestions.length > 0) {
                    this.showSuggestions(data.suggestions);
                }

                // Update status text if using AI
                if (data.aiProvider === 'gemini') {
                    document.getElementById('chatbot-status-text').textContent = 'AI Powered';
                }
            } else {
                this.addMessage('bot', '❌ Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            this.hideTyping();
            this.addMessage('bot', '❌ Connection error. Please check your internet connection.');
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('chatbot-messages');

        // Remove welcome message if exists
        const welcome = messagesContainer.querySelector('.chatbot-welcome');
        if (welcome) {
            welcome.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${role}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = this.formatMessage(content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        this.messages.push({ role, content, timestamp: new Date().toISOString() });
    }

    formatMessage(text) {
        // Convert markdown-like formatting to HTML
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>') // Code
            .replace(/\n/g, '<br>'); // Line breaks

        return formatted;
    }

    showTyping() {
        this.isTyping = true;
        const messagesContainer = document.getElementById('chatbot-messages');

        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'chatbot-message bot-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showSuggestions(suggestions) {
        const container = document.getElementById('chatbot-suggestions');
        container.innerHTML = '';

        suggestions.forEach(suggestion => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.addEventListener('click', () => {
                document.getElementById('chatbot-input').value = suggestion;
                this.sendMessage();
            });
            container.appendChild(chip);
        });
    }

    clearSuggestions() {
        document.getElementById('chatbot-suggestions').innerHTML = '';
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/chatbot/history?limit=10');
            const data = await response.json();

            if (data.success && data.history.length > 0) {
                // Show badge if there's history
                document.getElementById('chatbot-badge').style.display = 'flex';

                // Load messages
                data.history.forEach(msg => {
                    this.messages.push(msg);
                });
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatbotWidget();
    });
} else {
    new ChatbotWidget();
}
