# 🐍 Python Chatbot Setup Guide

This guide will help you set up the Python-based chatbot service for the CyberPro platform.

## Prerequisites

- **Python 3.8 or higher** installed on your system
- **pip** (Python package manager)
- **Node.js** and **npm** (for the main portal)

## Quick Start

### 1. Install Python Dependencies

Open a terminal in the `My Cyber pro` directory and run:

```bash
pip install -r requirements.txt
```

This will install:
- `flask` - Web framework for the chatbot API
- `flask-cors` - CORS support for cross-origin requests
- `google-generativeai` - Google Gemini AI SDK
- `python-dotenv` - Environment variable management

### 2. Install Node.js Dependencies

If you haven't already, install the axios dependency:

```bash
npm install
```

### 3. Configure API Key

The chatbot uses the same `.env` file as the Node.js server. Make sure your Gemini API key is configured:

```env
GEMINI_API_KEY=your_api_key_here
CHATBOT_AI_PROVIDER=gemini
CHATBOT_MODEL=gemini-pro
```

If you don't have an API key:
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to your `.env` file

### 4. Start the Services

**Option A: Start Everything at Once**

Double-click `START_ALL.bat` - This will start both:
- Python Chatbot Service (port 5000)
- Node.js Portal (port 3000)

**Option B: Start Services Separately**

1. Start Python chatbot:
   ```bash
   python chatbot_service.py
   ```
   Or double-click `START_CHATBOT.bat`

2. In another terminal, start the Node.js portal:
   ```bash
   node server.js
   ```
   Or double-click `START_PORTAL.bat`

### 5. Verify It's Working

1. Open your browser to `http://localhost:3000`
2. Login with `admin` / `admin123`
3. Click the chatbot widget (bottom-right corner)
4. Send a test message: "Hello"
5. You should receive a response from the chatbot!

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │         │   Node.js        │
│   (Browser)     │◄───────►│   Server         │
│                 │         │   (Port 3000)    │
└─────────────────┘         └────────┬─────────┘
                                     │
                                     │ HTTP Proxy
                                     ▼
                            ┌──────────────────┐
                            │   Python         │
                            │   Chatbot        │
                            │   (Port 5000)    │
                            └──────────────────┘
```

- **Frontend**: Chatbot widget in browser (unchanged)
- **Node.js Server**: Proxies chatbot requests to Python service
- **Python Service**: Handles AI processing with Gemini API

## Features

✅ **Google Gemini AI Integration** - Intelligent, context-aware responses
✅ **Pattern-Based Fallback** - Works even without API key
✅ **Knowledge Base** - Pre-configured responses for common questions
✅ **Conversation History** - Maintains context across messages
✅ **Lab Context Awareness** - Provides relevant help based on current lab

## Troubleshooting

### "Python is not installed"

- Download Python from: https://www.python.org/downloads/
- During installation, check "Add Python to PATH"
- Restart your terminal after installation

### "Module not found" errors

```bash
pip install -r requirements.txt
```

If that doesn't work, try:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### "Chatbot service is not available"

- Make sure the Python chatbot service is running
- Check that it's running on port 5000
- Look for the message: "✓ Running on http://localhost:5000"

### "Invalid API Key" or AI not working

- Check your `.env` file has the correct `GEMINI_API_KEY`
- The chatbot will still work with pattern-based responses
- Generate a new API key from Google AI Studio if needed

### Port 5000 already in use

Edit `.env` and change:
```env
PYTHON_CHATBOT_URL=http://localhost:5001
```

Then start the Python service with:
```bash
python chatbot_service.py --port 5001
```

## Testing the Chatbot

Try these test messages:

**General Help:**
- "Hello"
- "What can you help me with?"
- "I'm stuck, can you help?"

**Lab-Specific:**
- "How do I start the SCADA lab?"
- "What is Modbus?"
- "Explain PLC programming"

**Concepts:**
- "What is the difference between OT and IT?"
- "Tell me about ICS security"
- "What are common attack vectors?"

## Development

### Running in Debug Mode

For development, you can run the Python service in debug mode:

```bash
# Edit chatbot_service.py, change the last line to:
app.run(host='0.0.0.0', port=5000, debug=True)
```

### Checking Service Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "chatbot",
  "aiProvider": "gemini"
}
```

## Next Steps

- Customize the knowledge base in `knowledge-base.json`
- Adjust AI parameters in `.env` (temperature, max tokens)
- Add more pattern-based responses for common questions
- Integrate with your lab-specific contexts

## Need More Help?

Check the main project documentation:
- `README.md` - Overall platform guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `QUICKSTART.md` - Getting started guide
