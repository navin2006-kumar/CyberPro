const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class ChatbotService {
    constructor() {
        // Load knowledge base
        const kbPath = path.join(__dirname, 'knowledge-base.json');
        this.knowledge = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

        // Conversation history (in-memory, could be moved to database)
        this.conversations = new Map(); // userId -> messages[]

        // AI Configuration
        this.aiProvider = process.env.CHATBOT_AI_PROVIDER || 'none';
        this.temperature = parseFloat(process.env.CHATBOT_TEMPERATURE) || 0.7;
        this.maxTokens = parseInt(process.env.CHATBOT_MAX_TOKENS) || 500;

        // Initialize Gemini if configured
        if (this.aiProvider === 'gemini' && process.env.GEMINI_API_KEY) {
            try {
                this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                this.model = this.genAI.getGenerativeModel({
                    model: process.env.CHATBOT_MODEL || 'gemini-pro',
                    generationConfig: {
                        temperature: this.temperature,
                        maxOutputTokens: this.maxTokens,
                    }
                });
                console.log('✓ Gemini AI chatbot initialized');
            } catch (error) {
                console.warn('⚠️ Gemini AI initialization failed, using fallback:', error.message);
                this.aiProvider = 'none';
            }
        } else {
            console.log('✓ Pattern-based chatbot initialized (no AI API)');
        }

        // Intent patterns for fallback
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

        // System prompt for AI
        this.systemPrompt = this.buildSystemPrompt();
    }

    buildSystemPrompt() {
        return `You are an expert OT/ICS security instructor teaching students about industrial cybersecurity.

Your expertise includes:
- SCADA systems and Modbus protocol
- PLC programming and industrial control
- OT network monitoring and analysis
- ICS penetration testing
- Security best practices for operational technology

Teaching style:
- Patient and encouraging
- Step-by-step explanations
- Use analogies and examples
- Provide hands-on guidance
- Safety-first approach

Platform context:
- Students have access to 4 labs: SCADA, PLC, Network, Pentest
- All labs run in isolated Docker containers
- Real industrial protocols are used
- Login: admin/admin123
- Labs accessible at http://localhost:8080-8083

Available labs:
1. SCADA Lab (port 8080): Modbus TCP, HMI interface, register/coil control
2. PLC Lab (port 8081): OpenPLC runtime, industrial process simulator
3. Network Lab (port 8082): Traffic monitoring, protocol analysis
4. Pentest Lab (port 8083): Vulnerable ICS target for security testing

Always:
✓ Be encouraging and supportive
✓ Explain concepts clearly with examples
✓ Provide actionable steps
✓ Emphasize safety in ICS environments
✓ Link theory to practice
✓ Use emojis to make responses engaging

Never:
✗ Provide dangerous commands without warnings
✗ Assume advanced knowledge
✗ Give up on helping students
✗ Provide overly long responses (keep under 300 words)

Format responses with:
- **Bold** for important terms
- Bullet points for lists
- Step-by-step numbered instructions
- Emojis for visual appeal`;
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

        // Try AI response first, fallback to pattern-based
        let response;
        try {
            if (this.aiProvider === 'gemini' && this.model) {
                response = await this.generateAIResponse(message, context, history);
            } else {
                response = this.generatePatternResponse(message, context, history);
            }
        } catch (error) {
            console.error('AI response error, using fallback:', error.message);
            response = this.generatePatternResponse(message, context, history);
        }

        // Add bot response to history
        history.push({
            role: 'assistant',
            content: response,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            response,
            suggestions: this.getSuggestions(message, context),
            aiProvider: this.aiProvider
        };
    }

    async generateAIResponse(message, context, history) {
        try {
            // Build context-aware prompt
            let contextInfo = '';
            if (context.currentLab) {
                contextInfo = `\n\nCurrent context: User is on the ${context.currentLab} lab page.`;
            }

            // Build conversation history for context
            const conversationContext = history.slice(-6).map(msg =>
                `${msg.role === 'user' ? 'Student' : 'Instructor'}: ${msg.content}`
            ).join('\n');

            const fullPrompt = `${this.systemPrompt}${contextInfo}

Recent conversation:
${conversationContext}

Student: ${message}

Instructor:`;

            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    generatePatternResponse(message, context, history) {
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
