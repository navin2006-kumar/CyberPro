# AI Chatbot Teacher - Feature Guide

## 🤖 Overview

Your Cyber Lab Platform now includes an intelligent AI chatbot teacher powered by **Python and Google Gemini AI** that helps users learn OT/ICS security concepts, navigate labs, and troubleshoot issues.

## ✨ Features

### Intelligent Assistance
- 🎓 **Step-by-step guidance** for all labs
- 💡 **Concept explanations** (SCADA, Modbus, PLC, etc.)
- 🔍 **Troubleshooting help** for common issues
- 🎯 **Context-aware responses** based on current page/lab
- 🤖 **AI-powered** with Google Gemini for intelligent conversations

### Beautiful Interface
- 💬 **Floating chat widget** on all pages
- ⚡ **Real-time typing indicators**
- 🎨 **Premium glassmorphism design**
- 📱 **Fully responsive** (mobile-friendly)
- 🌈 **Smooth animations** and transitions

### Smart Features
- 💾 **Conversation history** persists during session
- 🔄 **Quick suggestions** for common questions
- 🧠 **Pattern matching** for intelligent fallback responses
- 📚 **Comprehensive knowledge base**
- 🔌 **Microservice architecture** for scalability

---

## 🎮 How to Use

### Opening the Chatbot

1. Look for the **glowing robot icon** (🤖) in the bottom-right corner
2. Click it to open the chat window
3. Type your question and press Enter or click Send

### Example Questions

**Getting Started:**
- "How do I start a lab?"
- "What are the login credentials?"
- "I'm stuck, can you help?"

**Learning Concepts:**
- "What is SCADA?"
- "Explain Modbus protocol"
- "Tell me about PLC programming"
- "What's the difference between OT and IT security?"

**Lab-Specific Help:**
- "How do I use the SCADA lab?"
- "What can I do in the PLC lab?"
- "How do I analyze network traffic?"
- "Show me vulnerabilities in the pentest lab"

**Troubleshooting:**
- "My lab won't start"
- "Docker is not running"
- "I'm getting an error"

---

## 📚 Knowledge Base Topics

### General Platform
- Login and authentication
- Starting/stopping labs
- Troubleshooting common issues
- Platform navigation

### SCADA Lab
- SCADA system overview
- Modbus TCP protocol
- HMI interface usage
- Security concerns
- Hands-on exercises

### PLC Lab
- PLC fundamentals
- OpenPLC usage
- Industrial process control
- Programming basics
- Simulator operations

### Network Lab
- OT network monitoring
- Protocol analysis (Modbus, HTTP, ICMP)
- Traffic pattern recognition
- Anomaly detection

### Pentest Lab
- ICS penetration testing
- Common vulnerabilities
- Safe testing methodology
- Exploitation techniques

### Security Concepts
- OT vs IT security
- ICS security fundamentals
- Attack vectors
- Defense strategies

---

## 🎯 Smart Suggestions

The chatbot provides contextual suggestions based on:
- Current page (home, labs, docs)
- Previous conversation
- Common user questions

Click any suggestion chip to quickly ask that question!

---

## 💡 Tips for Best Results

1. **Be specific**: "How do I toggle a coil in SCADA?" vs "Help with SCADA"
2. **Ask follow-ups**: The chatbot remembers your conversation
3. **Use natural language**: Talk like you're asking a teacher
4. **Try suggestions**: Click the suggestion chips for quick help

---

## 🔧 Technical Details

### Architecture

```
User Interface (Floating Widget)
         ↓
   Node.js Server (Proxy)
         ↓
   Python Chatbot Service (Flask)
         ↓
   Google Gemini AI / Pattern Matching
         ↓
   Knowledge Base (JSON)
         ↓
   Intelligent Response
```

**Microservice Design:**
- **Frontend**: Chat widget in browser (JavaScript)
- **Node.js Server**: Proxies requests to Python service
- **Python Service**: Handles AI processing with Gemini API
- **Ports**: Node.js (3000), Python Chatbot (5000)

### API Endpoints

**Send Message:**
```javascript
POST /api/chatbot/message
Body: {
  message: "How do I start a lab?",
  context: { currentLab: "scada" }
}
```

**Get History:**
```javascript
GET /api/chatbot/history?limit=10
```

**Reset Conversation:**
```javascript
POST /api/chatbot/reset
```

### Files Structure

**Python Backend:**
- [`chatbot_service.py`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/chatbot_service.py) - Python Flask chatbot service with Gemini AI
- [`requirements.txt`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/requirements.txt) - Python dependencies
- [`knowledge-base.json`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/knowledge-base.json) - Comprehensive knowledge base
- [`START_CHATBOT.bat`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/START_CHATBOT.bat) - Start Python service
- [`START_ALL.bat`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/START_ALL.bat) - Start both services

**Node.js Integration:**
- [`server.js`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/server.js) - API proxy endpoints (modified)
- [`.env`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/.env) - Configuration with Python service URL

**Frontend:**
- [`public/css/chatbot-widget.css`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/public/css/chatbot-widget.css) - Beautiful widget styling
- [`public/js/chatbot-widget.js`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/public/js/chatbot-widget.js) - Chat widget logic
- [`public/dashboard.html`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/public/dashboard.html) - Integrated (modified)
- [`public/labs.html`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/public/labs.html) - Integrated (modified)

---

## 🚀 Setup & Running

### Prerequisites
- Python 3.8+ installed
- Node.js and npm installed
- Docker Desktop running (for labs)

### Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Configure API key** (optional, works without it):
   - Edit `.env` file
   - Add your Gemini API key: `GEMINI_API_KEY=your_key_here`
   - Get free key from: https://makersuite.google.com/app/apikey

### Starting the Services

**Option A - Start Everything:**
```bash
START_ALL.bat
```

**Option B - Start Separately:**
```bash
# Terminal 1: Start Python chatbot
START_CHATBOT.bat

# Terminal 2: Start Node.js portal
START_PORTAL.bat
```

### Verification

1. Python service health: http://localhost:5000/health
2. Portal: http://localhost:3000
3. Login and test chatbot widget

For detailed setup instructions, see [PYTHON_CHATBOT_SETUP.md](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/PYTHON_CHATBOT_SETUP.md)

---

## 🎨 Customization

### Adding New Knowledge

Edit [`knowledge-base.json`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/knowledge-base.json) to add new topics:

```json
{
  "new_topic": {
    "overview": "Topic overview...",
    "how_to_use": "Usage instructions...",
    "advanced": "Advanced concepts..."
  }
}
```

### Adjusting AI Behavior

Edit `.env` to configure:
```env
CHATBOT_AI_PROVIDER=gemini
CHATBOT_MODEL=gemini-pro
CHATBOT_TEMPERATURE=0.7      # 0.0-1.0 (creativity)
CHATBOT_MAX_TOKENS=500       # Response length
```

### Styling

Modify [`public/css/chatbot-widget.css`](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/public/css/chatbot-widget.css) to change:
- Colors and gradients
- Widget size and position
- Animations and effects
- Mobile responsiveness

---

## 🚀 Future Enhancements

Potential upgrades:
- 🤖 Multi-AI provider support (OpenAI, Claude, etc.)
- 📊 Analytics on common questions
- 🎯 Personalized learning paths
- 🏆 Achievement tracking
- 🗣️ Voice input/output
- 🌍 Multi-language support
- 💾 Persistent conversation history (database)
- 🔍 RAG (Retrieval Augmented Generation) for better context

---

## ✅ Testing Checklist

- [x] Chatbot appears on home page
- [x] Chatbot appears on labs page
- [x] Widget opens/closes smoothly
- [x] Messages send and receive
- [x] Typing indicator works
- [x] Suggestions display correctly
- [x] Conversation history persists
- [x] Context awareness functions
- [x] Mobile responsive
- [x] Beautiful animations
- [x] Python service integration
- [x] AI responses working
- [x] Fallback patterns working

---

## 🎓 Example Conversation

**User**: Hi!

**Bot**: Hello! I'm your OT/ICS security instructor. How can I help you today?

**User**: How do I start the SCADA lab?

**Bot**: To start a lab:
1. Click 'Labs' in the navigation
2. Find the lab you want
3. Click 'Start Lab' button
4. Wait ~30 seconds for initialization
5. Access via the provided port

Which lab are you interested in?

**User**: What is Modbus?

**Bot**: **Modbus Protocol** 📡

Modbus is a serial communication protocol developed in 1979 for PLCs.

**Key Concepts:**
• **Master-Slave**: One master, multiple slaves
• **Registers**: Hold data (16-bit values)
• **Coils**: Digital outputs (ON/OFF)
• **Function Codes**: Commands (read, write, etc.)

**In our lab:**
• Registers 0-9: Holding registers
• Coils 0-7: Digital outputs
• Port 502: Standard Modbus TCP port

Try reading a register or toggling a coil!

---

## 🔍 Troubleshooting

### "Chatbot service is not available"
- Make sure Python chatbot service is running
- Check http://localhost:5000/health
- Restart with `START_CHATBOT.bat`

### "Module not found" errors
```bash
pip install -r requirements.txt
```

### AI not responding intelligently
- Check `.env` has valid `GEMINI_API_KEY`
- Chatbot will use pattern-based fallback without API key
- Generate new key from Google AI Studio if needed

For more troubleshooting, see [PYTHON_CHATBOT_SETUP.md](file:///c:/Users/navin/OneDrive/문서/MY%20cyber/CyberPro/My%20Cyber%20pro/PYTHON_CHATBOT_SETUP.md)

---

**Your AI teacher is ready to help you learn! 🚀**
