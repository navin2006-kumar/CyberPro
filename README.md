# 🤖 AI Learning Chatbot

An intelligent educational assistant powered by Google's Gemini AI to help learners solve problems, clear doubts, and understand concepts across various subjects.

## ✨ Features

- 💡 **Intelligent Assistance**: Powered by Google's advanced Gemini AI model
- 📚 **Multi-Subject Support**: Help with math, science, programming, and more
- 🎯 **Step-by-Step Explanations**: Breaks down complex problems into understandable steps
- 💬 **Interactive Conversations**: Maintains context throughout your learning session
- 🎨 **User-Friendly Interface**: Clean, colorful CLI with easy-to-read formatting
- 🔒 **Safe & Secure**: Built-in safety settings and secure API key management
- 📝 **Conversation History**: Review past questions and answers anytime

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- A Google AI Studio API key (free to obtain)

### Installation

1. **Clone or download this project**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Get your API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Click "Create API Key"
   - Copy your API key

4. **Configure the API key**:
   - Copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Open `.env` and replace `your_api_key_here` with your actual API key:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

5. **Run the chatbot**:
   ```bash
   python chatbot.py
   ```

## 📖 Usage

### Starting a Conversation

Simply run the chatbot and start asking questions:

```bash
python chatbot.py
```

### Example Interactions

**Math Help**:
```
You: Can you help me solve this equation: 2x + 5 = 15?
Bot: Of course! Let's solve this step by step...
```

**Programming Assistance**:
```
You: How do I create a list in Python?
Bot: Great question! In Python, you can create a list using square brackets...
```

**Concept Explanation**:
```
You: What is photosynthesis?
Bot: Photosynthesis is the process by which plants convert light energy...
```

### Commands

- **`quit`**, **`exit`**, or **`bye`**: End the conversation
- **`clear`**: Clear conversation history and start fresh
- **`history`**: View all previous questions and answers

## 🎓 What Can It Help With?

- **Mathematics**: Algebra, calculus, geometry, statistics
- **Science**: Physics, chemistry, biology, earth science
- **Programming**: Python, JavaScript, Java, C++, and more
- **Computer Science**: Algorithms, data structures, databases
- **General Learning**: Concept explanations, study tips, problem-solving strategies
- **Homework Help**: Guided assistance (teaches rather than just giving answers)

## 🔧 Troubleshooting

### "API Key Not Found" Error

Make sure you have:
1. Created a `.env` file (not `.env.example`)
2. Added your API key to the `.env` file
3. Saved the file

### "Invalid API Key" Error

- Verify your API key is correct
- Check that there are no extra spaces in the `.env` file
- Try generating a new API key from Google AI Studio

### "Quota Exceeded" Error

- You may have reached the free tier limit
- Wait a few minutes and try again
- Check your quota at [Google AI Studio](https://makersuite.google.com/)

## 🛡️ Privacy & Security

- Your API key is stored locally in the `.env` file
- Never share your `.env` file or commit it to version control
- The `.gitignore` file is configured to protect your API key
- All conversations are processed through Google's secure API

## 🤝 Contributing

Feel free to enhance this chatbot! Some ideas:
- Add voice input/output
- Create a web interface
- Add support for image-based questions
- Implement conversation saving/loading
- Add specialized modes (math tutor, coding mentor, etc.)

## 📝 License

This project is open source and available for educational purposes.

## 🙏 Acknowledgments

- Powered by [Google Gemini AI](https://deepmind.google/technologies/gemini/)
- Built with the [Google Generative AI Python SDK](https://github.com/google/generative-ai-python)

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the [Google AI Studio documentation](https://ai.google.dev/)
3. Ensure you're using the latest version of the dependencies

---

**Happy Learning! 🎓✨**

---

## CyberPro Platform

A Solution of the Simulation based Cyber Security Lab with Some of Attacks and Defense Practices.
