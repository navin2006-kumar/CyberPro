// Chatbot Widget JavaScript

class ChatbotWidget {
    constructor(context = {}) {
        this.context = context; // Lab context (currentLab, etc.)
        this.isOpen = false;
        this.messages = [];
        this.isTyping = false;

        this.init();
    }

    init() {
        // Create widget HTML
        this.createWidget();

        // Load conversation history
        this.loadHistory();

        // Event listeners
        this.attachEventListeners();
    }

    createWidget() {
        const widgetHTML = `
            <div class="chatbot-widget">
                <button class="chatbot-button" id="chatbotToggle">
                    🤖
                </button>
                
                <div class="chatbot-window" id="chatbotWindow">
                    <div class="chatbot-header">
                        <h3>🎓 AI Teacher</h3>
                        <button class="chatbot-close" id="chatbotClose">×</button>
                    </div>
                    
                    <div class="chatbot-messages" id="chatbotMessages">
                        <div class="chat-message bot">
                            <div class="message-avatar bot">🤖</div>
                            <div class="message-content bot">
                                Hello! I'm your OT/ICS security instructor. How can I help you today?
                            </div>
                        </div>
                    </div>
                    
                    <div class="chatbot-suggestions" id="chatbotSuggestions"></div>
                    
                    <div class="chatbot-input-container">
                        <input 
                            type="text" 
                            class="chatbot-input" 
                            id="chatbotInput" 
                            placeholder="Ask me anything..."
                            autocomplete="off"
                        />
                        <button class="chatbot-send" id="chatbotSend">
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    attachEventListeners() {
        const toggle = document.getElementById('chatbotToggle');
        const close = document.getElementById('chatbotClose');
        const send = document.getElementById('chatbotSend');
        const input = document.getElementById('chatbotInput');

        toggle.addEventListener('click', () => this.toggleChat());
        close.addEventListener('click', () => this.closeChat());
        send.addEventListener('click', () => this.sendMessage());

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbotWindow');

        if (this.isOpen) {
            window.classList.add('open');
            document.getElementById('chatbotInput').focus();
        } else {
            window.classList.remove('open');
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('chatbotWindow').classList.remove('open');
    }

    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();

        if (!message) return;

        // Clear input
        input.value = '';

        // Add user message to UI
        this.addMessage('user', message);

        // Show typing indicator
        this.showTyping();

        try {
            // Send to API
            const response = await fetch('/api/chatbot/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    context: this.context
                })
            });

            const data = await response.json();

            // Hide typing indicator
            this.hideTyping();

            if (data.success) {
                // Add bot response
                this.addMessage('bot', data.response);

                // Update suggestions
                if (data.suggestions && data.suggestions.length > 0) {
                    this.updateSuggestions(data.suggestions);
                }
            } else {
                this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
            }

        } catch (error) {
            console.error('Chatbot error:', error);
            this.hideTyping();
            this.addMessage('bot', 'Sorry, I\'m having trouble connecting. Please check your connection and try again.');
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('chatbotMessages');

        const messageHTML = `
            <div class="chat-message ${role}">
                <div class="message-avatar ${role}">
                    ${role === 'bot' ? '🤖' : '👤'}
                </div>
                <div class="message-content ${role}">
                    ${this.formatMessage(content)}
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(content) {
        // Convert markdown-like formatting
        let formatted = content;

        // Bold text
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Bullet points
        formatted = formatted.replace(/^• (.+)$/gm, '<div style="margin-left: 15px;">• $1</div>');

        // Code blocks
        formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    showTyping() {
        this.isTyping = true;
        const messagesContainer = document.getElementById('chatbotMessages');

        const typingHTML = `
            <div class="chat-message bot" id="typingIndicator">
                <div class="message-avatar bot">🤖</div>
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTyping() {
        this.isTyping = false;
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    updateSuggestions(suggestions) {
        const container = document.getElementById('chatbotSuggestions');

        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-chip" onclick="chatbot.sendSuggestion('${this.escapeHtml(suggestion)}')">
                ${suggestion}
            </div>
        `).join('');
    }

    sendSuggestion(suggestion) {
        const input = document.getElementById('chatbotInput');
        input.value = suggestion;
        this.sendMessage();
    }

    async loadHistory() {
        try {
            const response = await fetch('/api/chatbot/history?limit=10');
            const data = await response.json();

            if (data.success && data.history && data.history.length > 0) {
                const messagesContainer = document.getElementById('chatbotMessages');
                messagesContainer.innerHTML = ''; // Clear welcome message

                data.history.forEach(msg => {
                    this.addMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
                });
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateContext(newContext) {
        this.context = { ...this.context, ...newContext };
    }
}

// Initialize chatbot when DOM is ready
let chatbot;

document.addEventListener('DOMContentLoaded', () => {
    // Determine context based on current page
    const context = {};

    // Check if we're on a lab page
    if (window.location.pathname.includes('/labs')) {
        context.page = 'labs';
    } else if (window.location.pathname === '/') {
        context.page = 'home';
    }

    // Initialize chatbot
    chatbot = new ChatbotWidget(context);
});
