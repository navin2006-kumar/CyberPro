# 🤖 Gemini AI Chatbot Setup Guide

## Quick Setup (3 Steps)

### Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy your API key (starts with `AIza...`)

> **Free Tier**: 60 requests per minute - perfect for learning!

---

### Step 2: Install Dependencies

```powershell
cd "c:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm install @google/generative-ai
```

---

### Step 3: Configure API Key

Open `.env` file and replace `your-gemini-api-key-here` with your actual API key:

```env
# AI Chatbot Configuration
CHATBOT_AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyC...your-actual-key-here
CHATBOT_MODEL=gemini-pro
CHATBOT_TEMPERATURE=0.7
CHATBOT_MAX_TOKENS=500
```

---

## Start the Platform

```powershell
npm start
```

The chatbot will automatically use Gemini AI! 🚀

---

## How It Works

### With Gemini API Key ✨
- **Intelligent responses** using Google's AI
- **Natural conversations** - ask anything!
- **Context-aware** - remembers your conversation
- **OT/ICS expert** - trained on cybersecurity knowledge

### Without API Key 🔄
- **Pattern-based responses** (fallback mode)
- **Still helpful** - uses knowledge base
- **No external calls** - works offline
- **Privacy-focused** - data stays local

---

## Configuration Options

### Provider Selection
```env
CHATBOT_AI_PROVIDER=gemini  # Use Gemini AI
# OR
CHATBOT_AI_PROVIDER=none    # Use pattern-based (no API)
```

### Model Selection
```env
CHATBOT_MODEL=gemini-pro           # Recommended (free tier)
# OR
CHATBOT_MODEL=gemini-pro-vision    # For image analysis (future)
```

### Response Tuning
```env
CHATBOT_TEMPERATURE=0.7    # Creativity (0.0-1.0)
                          # Lower = more focused
                          # Higher = more creative

CHATBOT_MAX_TOKENS=500    # Response length
                          # 500 = ~300 words
```

---

## Testing Your Setup

1. **Start the server**: `npm start`
2. **Open browser**: http://localhost:3000
3. **Click the chatbot** (🤖 icon bottom-right)
4. **Ask a question**: "What is SCADA?"

### Expected Response (with Gemini):
```
SCADA (Supervisory Control and Data Acquisition) is a system used 
to monitor and control industrial processes! 🏭

**Key Components:**
• HMI (Human-Machine Interface) - The visual dashboard
• RTUs (Remote Terminal Units) - Field devices
• Communication protocols - Like Modbus, DNP3
• Master station - Central control

In our lab, you'll work with a real SCADA system using Modbus TCP...
```

---

## Troubleshooting

### "Pattern-based chatbot initialized"
✅ **Normal** - No API key configured, using fallback mode

### "Gemini AI chatbot initialized"
✅ **Success** - AI is active!

### "Gemini AI initialization failed"
❌ **Check**:
- API key is correct (no spaces)
- Internet connection is working
- API key has not been restricted

### Rate Limit Errors
⚠️ **Free tier**: 60 requests/minute
- Wait a minute and try again
- Or upgrade to paid tier

---

## Cost & Limits

### Free Tier (Gemini)
- ✅ 60 requests per minute
- ✅ Perfect for learning
- ✅ No credit card required

### Typical Usage
- **1 conversation**: ~10 messages
- **1 message**: ~1 API call
- **Daily practice**: ~100 messages
- **Monthly cost**: **FREE** (within limits)

---

## Privacy & Security

✅ **API key stored locally** in `.env` (not committed to git)  
✅ **All API calls server-side** (key never sent to browser)  
✅ **Conversation history** stored in memory (not sent to Google)  
✅ **No data collection** by the platform  

---

## Advanced: Switching Providers

Want to try OpenAI instead?

1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Update `.env`:
```env
CHATBOT_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key
CHATBOT_MODEL=gpt-3.5-turbo
```
3. Install: `npm install openai`
4. Restart server

---

## Example Conversations

### Beginner Questions
**You**: "I'm new to SCADA, where do I start?"

**AI**: "Welcome to OT security! 🎓 Let's start with SCADA basics:

**SCADA** = Supervisory Control and Data Acquisition

Think of it like this: If a factory was a video game, SCADA would be the control panel where you:
• See what's happening (monitoring)
• Control equipment (supervisory)
• Collect data (acquisition)

**Your first steps:**
1. Start the SCADA lab
2. Open the HMI interface
3. Try reading a register
4. Toggle a coil

Ready to start the lab?"

### Advanced Questions
**You**: "How can I detect a Modbus attack?"

**AI**: "Great security question! 🔒 Here's how to detect Modbus attacks:

**Normal Modbus Traffic:**
• Predictable patterns
• Known source/destination
• Expected function codes
• Regular intervals

**Attack Indicators:**
⚠️ Unexpected function codes
⚠️ Traffic from unknown IPs
⚠️ Unusual write operations
⚠️ Rapid-fire requests
⚠️ Off-hours activity

**In the Network Lab:**
You can practice detecting these! The traffic generator creates normal patterns - try to identify what's normal, then we can discuss anomalies.

Want to try it?"

---

## 🎯 Next Steps

1. ✅ Get your Gemini API key
2. ✅ Run `npm install @google/generative-ai`
3. ✅ Update `.env` with your key
4. ✅ Restart the server
5. ✅ Start chatting!

**Your AI teacher is ready to help you master OT/ICS security! 🚀**
