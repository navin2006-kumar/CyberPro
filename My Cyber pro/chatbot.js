const fs = require('fs');
const path = require('path');

class ChatbotService {
    constructor() {
        // Load knowledge base
        const kbPath = path.join(__dirname, 'knowledge-base.json');
        this.knowledge = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

        // Conversation history (in-memory, could be moved to database)
        this.conversations = new Map(); // userId -> messages[]

        // Intent patterns
        this.patterns = {
            greeting: /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/i,
            help: /(help|stuck|don't know|confused|how do i|how to)/i,
            scada: /(scada|modbus|hmi|supervisory)/i,
            plc: /(plc|programmable|logic|controller|openplc)/i,
            network: /(network|traffic|monitor|packet|protocol)/i,
            pentest: /(pentest|penetration|test|hack|exploit|vulnerability|vulnerabilities)/i,
            start_lab: /(start|launch|run|begin)\s+(lab|scada|plc|network|pentest)/i,
            stop_lab: /(stop|end|close|shut\s*down)\s+(lab)/i,
            login: /(login|log\s*in|credentials|password|username)/i,
            troubleshoot: /(error|problem|issue|not working|won't|doesn't|failed|fail)/i,
            concepts: /(what is|explain|tell me about|learn about)/i,
            security: /(security|attack|defend|protect|threat)/i,
            next_steps: /(what next|what should i|where to start|learning path)/i
        };
    }

    async processMessage(userId, message, context = {}) {
        // Get or create conversation history
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }

        const history = this.conversations.get(userId);

        // Add user message to history
        history.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 messages
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }

        // Generate response
        const response = this.generateResponse(message, context, history);

        // Add bot response to history
        history.push({
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            response,
            suggestions: this.getSuggestions(message, context)
        };
    }

    generateResponse(message, context, history) {
        const lowerMessage = message.toLowerCase();

        // Check for greetings
        if (this.patterns.greeting.test(message)) {
            return this.getRandomItem(this.knowledge.general.greetings);
        }

        // Check for help/stuck
        if (this.patterns.help.test(message) || lowerMessage.includes('stuck')) {
            return this.knowledge.help_topics.stuck;
        }

        // Check for next steps
        if (this.patterns.next_steps.test(message)) {
            return this.knowledge.help_topics.next_steps;
        }

        // Check for login help
        if (this.patterns.login.test(message)) {
            return this.knowledge.general.platform_help.login_help;
        }

        // Check for troubleshooting
        if (this.patterns.troubleshoot.test(message)) {
            return this.knowledge.general.platform_help.troubleshooting;
        }

        // Check for starting a lab
        if (this.patterns.start_lab.test(message)) {
            return this.knowledge.general.platform_help.how_to_start_lab;
        }

        // Lab-specific responses
        if (this.patterns.scada.test(message)) {
            return this.getSCADAResponse(message, context);
        }

        if (this.patterns.plc.test(message)) {
            return this.getPLCResponse(message, context);
        }

        if (this.patterns.network.test(message)) {
            return this.getNetworkResponse(message, context);
        }

        if (this.patterns.pentest.test(message)) {
            return this.getPentestResponse(message, context);
        }

        // Check for security/attack concepts
        if (this.patterns.security.test(message)) {
            if (lowerMessage.includes('ot') || lowerMessage.includes('it')) {
                return this.knowledge.concepts.ot_vs_it;
            }
            if (lowerMessage.includes('attack')) {
                return this.knowledge.concepts.attack_vectors;
            }
            return this.knowledge.concepts.ics_security;
        }

        // Check for concept explanations
        if (this.patterns.concepts.test(message)) {
            if (lowerMessage.includes('modbus')) {
                return this.knowledge.scada.modbus;
            }
            if (lowerMessage.includes('scada')) {
                return this.knowledge.scada.overview;
            }
            if (lowerMessage.includes('plc')) {
                return this.knowledge.plc.overview;
            }
        }

        // Context-aware responses
        if (context.currentLab) {
            return this.getContextualResponse(context.currentLab, message);
        }

        // Default response
        return this.getDefaultResponse(message);
    }

    getSCADAResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('how') || lowerMessage.includes('use')) {
            return this.knowledge.scada.how_to_use;
        }
        if (lowerMessage.includes('modbus')) {
            return this.knowledge.scada.modbus;
        }
        if (lowerMessage.includes('security')) {
            return this.knowledge.scada.security;
        }

        return this.knowledge.scada.overview;
    }

    getPLCResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('how') || lowerMessage.includes('use')) {
            return this.knowledge.plc.how_to_use;
        }
        if (lowerMessage.includes('program')) {
            return this.knowledge.plc.programming;
        }
        if (lowerMessage.includes('process') || lowerMessage.includes('control')) {
            return this.knowledge.plc.process_control;
        }

        return this.knowledge.plc.overview;
    }

    getNetworkResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('how') || lowerMessage.includes('use')) {
            return this.knowledge.network.how_to_use;
        }
        if (lowerMessage.includes('protocol')) {
            return this.knowledge.network.protocols;
        }
        if (lowerMessage.includes('analyz') || lowerMessage.includes('detect')) {
            return this.knowledge.network.analysis;
        }

        return this.knowledge.network.overview;
    }

    getPentestResponse(message, context) {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('how') || lowerMessage.includes('use')) {
            return this.knowledge.pentest.how_to_use;
        }
        if (lowerMessage.includes('vulnerabilit')) {
            return this.knowledge.pentest.vulnerabilities;
        }
        if (lowerMessage.includes('method') || lowerMessage.includes('approach')) {
            return this.knowledge.pentest.methodology;
        }

        return this.knowledge.pentest.overview;
    }

    getContextualResponse(labType, message) {
        const responses = {
            'scada': this.knowledge.scada.how_to_use,
            'plc': this.knowledge.plc.how_to_use,
            'network': this.knowledge.network.how_to_use,
            'pentest': this.knowledge.pentest.how_to_use
        };

        return responses[labType] || this.getDefaultResponse(message);
    }

    getDefaultResponse(message) {
        return `I'm here to help you learn OT/ICS security! 🎓

I can help with:
• **SCADA systems** and Modbus protocol
• **PLC programming** and industrial control
• **Network monitoring** and traffic analysis
• **Penetration testing** ICS systems
• **Platform help** (starting labs, troubleshooting)

What would you like to learn about? Or ask me:
• "How do I start the SCADA lab?"
• "What is Modbus?"
• "Explain PLC programming"
• "I'm stuck, can you help?"`;
    }

    getSuggestions(message, context) {
        const suggestions = [];

        // Context-based suggestions
        if (context.currentLab) {
            suggestions.push(`How do I use the ${context.currentLab} lab?`);
            suggestions.push(`What can I learn from this lab?`);
        } else {
            suggestions.push('How do I start a lab?');
            suggestions.push('What should I learn first?');
        }

        // General suggestions
        suggestions.push('Explain Modbus protocol');
        suggestions.push('What is SCADA?');
        suggestions.push('I need help troubleshooting');

        return suggestions.slice(0, 3);
    }

    getConversationHistory(userId, limit = 10) {
        const history = this.conversations.get(userId) || [];
        return history.slice(-limit);
    }

    resetConversation(userId) {
        this.conversations.delete(userId);
        return { success: true, message: 'Conversation reset' };
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

module.exports = ChatbotService;
