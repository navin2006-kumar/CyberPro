import os
import json
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js server

class ChatbotService:
    def __init__(self):
        # Load knowledge base
        kb_path = os.path.join(os.path.dirname(__file__), 'knowledge-base.json')
        with open(kb_path, 'r', encoding='utf-8') as f:
            self.knowledge = json.load(f)
        
        # Conversation history (in-memory)
        self.conversations = {}  # userId -> messages[]
        
        # AI Configuration
        self.ai_provider = os.getenv('CHATBOT_AI_PROVIDER', 'none')
        self.temperature = float(os.getenv('CHATBOT_TEMPERATURE', '0.7'))
        self.max_tokens = int(os.getenv('CHATBOT_MAX_TOKENS', '500'))
        
        # Initialize Gemini if configured
        if self.ai_provider == 'gemini' and os.getenv('GEMINI_API_KEY'):
            try:
                genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
                self.model = genai.GenerativeModel(
                    model_name=os.getenv('CHATBOT_MODEL', 'gemini-pro'),
                    generation_config={
                        'temperature': self.temperature,
                        'max_output_tokens': self.max_tokens,
                    }
                )
                print('✓ Gemini AI chatbot initialized')
            except Exception as e:
                print(f'⚠️ Gemini AI initialization failed, using fallback: {str(e)}')
                self.ai_provider = 'none'
        else:
            print('✓ Pattern-based chatbot initialized (no AI API)')
        
        # Intent patterns for fallback
        self.patterns = {
            'greeting': re.compile(r'^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))', re.IGNORECASE),
            'help': re.compile(r'(help|stuck|don\'t know|confused|how do i|how to)', re.IGNORECASE),
            'scada': re.compile(r'(scada|modbus|hmi|supervisory)', re.IGNORECASE),
            'plc': re.compile(r'(plc|programmable|logic|controller|openplc)', re.IGNORECASE),
            'network': re.compile(r'(network|traffic|monitor|packet|protocol)', re.IGNORECASE),
            'pentest': re.compile(r'(pentest|penetration|test|hack|exploit|vulnerability|vulnerabilities)', re.IGNORECASE),
            'start_lab': re.compile(r'(start|launch|run|begin)\s+(lab|scada|plc|network|pentest)', re.IGNORECASE),
            'stop_lab': re.compile(r'(stop|end|close|shut\s*down)\s+(lab)', re.IGNORECASE),
            'login': re.compile(r'(login|log\s*in|credentials|password|username)', re.IGNORECASE),
            'troubleshoot': re.compile(r'(error|problem|issue|not working|won\'t|doesn\'t|failed|fail)', re.IGNORECASE),
            'concepts': re.compile(r'(what is|explain|tell me about|learn about)', re.IGNORECASE),
            'security': re.compile(r'(security|attack|defend|protect|threat)', re.IGNORECASE),
            'next_steps': re.compile(r'(what next|what should i|where to start|learning path)', re.IGNORECASE)
        }
        
        # System prompt for AI
        self.system_prompt = self.build_system_prompt()
    
    def build_system_prompt(self):
        return """You are an expert OT/ICS security instructor teaching students about industrial cybersecurity.

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
- Emojis for visual appeal"""
    
    def process_message(self, user_id, message, context=None):
        if context is None:
            context = {}
        
        # Get or create conversation history
        if user_id not in self.conversations:
            self.conversations[user_id] = []
        
        history = self.conversations[user_id]
        
        # Add user message to history
        history.append({
            'role': 'user',
            'content': message,
            'timestamp': datetime.now().isoformat()
        })
        
        # Keep only last 10 messages
        if len(history) > 10:
            self.conversations[user_id] = history[-10:]
            history = self.conversations[user_id]
        
        # Try AI response first, fallback to pattern-based
        try:
            if self.ai_provider == 'gemini' and hasattr(self, 'model'):
                response = self.generate_ai_response(message, context, history)
            else:
                response = self.generate_pattern_response(message, context, history)
        except Exception as e:
            print(f'AI response error, using fallback: {str(e)}')
            response = self.generate_pattern_response(message, context, history)
        
        # Add bot response to history
        history.append({
            'role': 'assistant',
            'content': response,
            'timestamp': datetime.now().isoformat()
        })
        
        return {
            'success': True,
            'response': response,
            'suggestions': self.get_suggestions(message, context),
            'aiProvider': self.ai_provider
        }
    
    def generate_ai_response(self, message, context, history):
        try:
            # Build context-aware prompt
            context_info = ''
            if context.get('currentLab'):
                context_info = f"\n\nCurrent context: User is on the {context['currentLab']} lab page."
            
            # Build conversation history for context
            conversation_context = '\n'.join([
                f"{'Student' if msg['role'] == 'user' else 'Instructor'}: {msg['content']}"
                for msg in history[-6:]
            ])
            
            full_prompt = f"""{self.system_prompt}{context_info}

Recent conversation:
{conversation_context}

Student: {message}

Instructor:"""
            
            result = self.model.generate_content(full_prompt)
            return result.text
        
        except Exception as e:
            print(f'Gemini API error: {str(e)}')
            raise
    
    def generate_pattern_response(self, message, context, history):
        lower_message = message.lower()
        
        # Check for greetings
        if self.patterns['greeting'].search(message):
            return self.get_random_item(self.knowledge['general']['greetings'])
        
        # Check for help/stuck
        if self.patterns['help'].search(message) or 'stuck' in lower_message:
            return self.knowledge['help_topics']['stuck']
        
        # Check for next steps
        if self.patterns['next_steps'].search(message):
            return self.knowledge['help_topics']['next_steps']
        
        # Check for login help
        if self.patterns['login'].search(message):
            return self.knowledge['general']['platform_help']['login_help']
        
        # Check for troubleshooting
        if self.patterns['troubleshoot'].search(message):
            return self.knowledge['general']['platform_help']['troubleshooting']
        
        # Check for starting a lab
        if self.patterns['start_lab'].search(message):
            return self.knowledge['general']['platform_help']['how_to_start_lab']
        
        # Lab-specific responses
        if self.patterns['scada'].search(message):
            return self.get_scada_response(message, context)
        
        if self.patterns['plc'].search(message):
            return self.get_plc_response(message, context)
        
        if self.patterns['network'].search(message):
            return self.get_network_response(message, context)
        
        if self.patterns['pentest'].search(message):
            return self.get_pentest_response(message, context)
        
        # Check for security/attack concepts
        if self.patterns['security'].search(message):
            if 'ot' in lower_message or 'it' in lower_message:
                return self.knowledge['concepts']['ot_vs_it']
            if 'attack' in lower_message:
                return self.knowledge['concepts']['attack_vectors']
            return self.knowledge['concepts']['ics_security']
        
        # Check for concept explanations
        if self.patterns['concepts'].search(message):
            if 'modbus' in lower_message:
                return self.knowledge['scada']['modbus']
            if 'scada' in lower_message:
                return self.knowledge['scada']['overview']
            if 'plc' in lower_message:
                return self.knowledge['plc']['overview']
        
        # Context-aware responses
        if context.get('currentLab'):
            return self.get_contextual_response(context['currentLab'], message)
        
        # Default response
        return self.get_default_response(message)
    
    def get_scada_response(self, message, context):
        lower_message = message.lower()
        
        if 'how' in lower_message or 'use' in lower_message:
            return self.knowledge['scada']['how_to_use']
        if 'modbus' in lower_message:
            return self.knowledge['scada']['modbus']
        if 'security' in lower_message:
            return self.knowledge['scada']['security']
        
        return self.knowledge['scada']['overview']
    
    def get_plc_response(self, message, context):
        lower_message = message.lower()
        
        if 'how' in lower_message or 'use' in lower_message:
            return self.knowledge['plc']['how_to_use']
        if 'program' in lower_message:
            return self.knowledge['plc']['programming']
        if 'process' in lower_message or 'control' in lower_message:
            return self.knowledge['plc']['process_control']
        
        return self.knowledge['plc']['overview']
    
    def get_network_response(self, message, context):
        lower_message = message.lower()
        
        if 'how' in lower_message or 'use' in lower_message:
            return self.knowledge['network']['how_to_use']
        if 'protocol' in lower_message:
            return self.knowledge['network']['protocols']
        if 'analyz' in lower_message or 'detect' in lower_message:
            return self.knowledge['network']['analysis']
        
        return self.knowledge['network']['overview']
    
    def get_pentest_response(self, message, context):
        lower_message = message.lower()
        
        if 'how' in lower_message or 'use' in lower_message:
            return self.knowledge['pentest']['how_to_use']
        if 'vulnerabilit' in lower_message:
            return self.knowledge['pentest']['vulnerabilities']
        if 'method' in lower_message or 'approach' in lower_message:
            return self.knowledge['pentest']['methodology']
        
        return self.knowledge['pentest']['overview']
    
    def get_contextual_response(self, lab_type, message):
        responses = {
            'scada': self.knowledge['scada']['how_to_use'],
            'plc': self.knowledge['plc']['how_to_use'],
            'network': self.knowledge['network']['how_to_use'],
            'pentest': self.knowledge['pentest']['how_to_use']
        }
        
        return responses.get(lab_type, self.get_default_response(message))
    
    def get_default_response(self, message):
        return """I'm here to help you learn OT/ICS security! 🎓

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
• "I'm stuck, can you help?" """
    
    def get_suggestions(self, message, context):
        suggestions = []
        
        # Context-based suggestions
        if context.get('currentLab'):
            suggestions.append(f"How do I use the {context['currentLab']} lab?")
            suggestions.append("What can I learn from this lab?")
        else:
            suggestions.append('How do I start a lab?')
            suggestions.append('What should I learn first?')
        
        # General suggestions
        suggestions.append('Explain Modbus protocol')
        suggestions.append('What is SCADA?')
        suggestions.append('I need help troubleshooting')
        
        return suggestions[:3]
    
    def get_conversation_history(self, user_id, limit=10):
        history = self.conversations.get(user_id, [])
        return history[-limit:]
    
    def reset_conversation(self, user_id):
        if user_id in self.conversations:
            del self.conversations[user_id]
        return {'success': True, 'message': 'Conversation reset'}
    
    def get_random_item(self, array):
        import random
        return random.choice(array)

# Initialize chatbot service
chatbot = ChatbotService()

# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'chatbot',
        'aiProvider': chatbot.ai_provider
    })

@app.route('/api/chatbot/message', methods=['POST'])
def process_message():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        message = data.get('message')
        context = data.get('context', {})
        
        if not message:
            return jsonify({'success': False, 'message': 'Message is required'}), 400
        
        result = chatbot.process_message(user_id, message, context)
        return jsonify(result)
    
    except Exception as e:
        print(f'Error processing message: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/chatbot/history', methods=['GET'])
def get_history():
    try:
        user_id = request.args.get('userId')
        limit = int(request.args.get('limit', 10))
        
        history = chatbot.get_conversation_history(user_id, limit)
        return jsonify({'success': True, 'history': history})
    
    except Exception as e:
        print(f'Error getting history: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

@app.route('/api/chatbot/reset', methods=['POST'])
def reset_conversation():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        
        result = chatbot.reset_conversation(user_id)
        return jsonify(result)
    
    except Exception as e:
        print(f'Error resetting conversation: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

if __name__ == '__main__':
    print('\n╔════════════════════════════════════════════════╗')
    print('║     🤖 Python Chatbot Service Starting       ║')
    print('╚════════════════════════════════════════════════╝\n')
    print(f'✓ AI Provider: {chatbot.ai_provider}')
    print(f'✓ Knowledge base loaded')
    print(f'✓ Running on http://localhost:5000\n')
    
    app.run(host='0.0.0.0', port=5000, debug=False)
