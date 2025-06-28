# VoiceAgent

A real-time AI voice assistant built with FastRTC, SenseVoice speech recognition, and multiple AI models (DeepSeek & Qwen-Plus). Features voice-to-voice conversation with streaming audio processing.

![Demo](https://img.shields.io/badge/demo-live-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.8+-blue)
![Node](https://img.shields.io/badge/node-16+-green)

## 🎯 Project Background

In today's digital landscape, we frequently encounter AI-powered robocalls that deliver poor user experiences with mechanical, scripted interactions. These automated systems often ask repetitive questions in a rigid manner, creating frustrating experiences for users. It became clear that this process could be significantly enhanced using Large Language Models (LLM) to create more natural and intelligent conversations.

After researching various solutions, I discovered the [FastRTC project](https://github.com/gradio-app/fastrtc), which includes impressive demos of real-time voice conversation agents. However, the project lacked comprehensive documentation on how to integrate custom frontends with FastRTC (which comes with a basic built-in frontend). This gap motivated me to create a custom integration to explore the possibilities of building a more sophisticated voice interaction system.

**VoiceAgent** represents this exploration - a modern, React-based frontend that seamlessly integrates with FastRTC's powerful real-time voice processing capabilities, enhanced with state-of-the-art AI models for natural language understanding and generation.

> 💡 **Note**: If you've found better integration approaches for FastRTC, I'd love to hear about them! Please feel free to share your insights via issues or discussions.

## ✨ Features

- **🎤 Real-time Speech Recognition**: Configurable STT models - choose between SenseVoice (accurate Chinese/English) or Whisper (multilingual support)
- **🤖 Two Built-in LLM Integrations**: Configurable AI backends - supports DeepSeek and Qwen-Plus with easy model switching
- **🔊 Text-to-Speech**: macOS native TTS with customizable voices
- **⚡ Streaming Audio**: Low-latency voice processing with FastRTC
- **🎵 Audio Visualization**: Real-time voice activity visualization
- **🔧 Advanced Audio Processing**: Noise suppression, echo cancellation, and voice frequency filtering
- **🏗️ Frontend-Backend Separation**: Decoupled architecture that serves as a reference implementation for quickly integrating FastRTC into your own applications

## 🏗️ Architecture

- **Backend**: FastAPI + FastRTC + SenseVoice/Whisper + AI Models + macOS TTS
- **Frontend**: React + TypeScript + styled-components
- **Audio Processing**: WebRTC + Audio Context API
- **AI Integration**: DeepSeek API & Qwen-Plus API

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 23+
- macOS (for TTS functionality)
- API keys for DeepSeek and/or Qwen-Plus

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voiceagent.git
   cd voiceagent
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp env_example.txt .env
   # Edit .env with your DeepSeek and/or Qwen-Plus API keys
   ```

4. **Start the backend server**
   ```bash
   python fastrtc_server.py
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend-react
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Open your browser**
   ```
   http://localhost:3000
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend` directory by copying from the template:

```bash
cp env_example.txt .env
```

Then edit the `.env` file with your API keys and customize the configuration as needed. The template includes settings for:

- **AI Models**: DeepSeek and Qwen-Plus API configuration
- **STT Models**: SenseVoice and Whisper configuration  
- **TTS Settings**: macOS voice selection and speech parameters
- **Audio Processing**: Sample rates, VAD thresholds, and WebRTC settings
- **Server & Logging**: Host, port, and debug configurations

### Audio Configuration

The system uses optimized settings for real-time voice processing:

- **Sample Rate**: 24kHz (FastRTC optimized)
- **VAD Threshold**: 0.3 (voice activity detection)
- **Silence Detection**: 4000ms
- **Min Speech Duration**: 300ms

## 🎯 API Endpoints

- **GET** `/` - Web interface and status page
- **POST** `/webrtc/offer` - WebRTC connection endpoint
- **GET** `/api/health` - Health check and system status

## 🔧 Advanced Usage

### Switching AI Models

Change the AI model provider by setting the environment variable:

```bash
# Use DeepSeek
export AI_MODEL_PROVIDER=deepseek

# Use Qwen-Plus  
export AI_MODEL_PROVIDER=qwen-plus
```



## 📊 Performance Metrics

The system tracks key performance indicators:

- **Time to First Token**: Latency from speech end to AI response start
- **First Audio Ready**: End-to-end latency from speech to playback
- **STT Processing**: SenseVoice transcription time
- **AI Streaming**: Token generation and streaming time

## 🛠️ Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
python fastrtc_server.py
```

### Frontend Development

```bash
cd frontend-react
npm install
npm start
```

### Audio Debug

Enable audio debugging to save processed audio files:

```python
DEBUG_AUDIO = True  # in fastrtc_server.py
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🆘 Troubleshooting

### Common Issues

1. **"Backend service unavailable"**
   - Ensure the backend server is running on port 8000
   - Check firewall settings

2. **"No audio input detected"**
   - Grant microphone permissions in your browser
   - Check audio device settings

3. **"AI model not configured"**
   - Verify API keys in environment variables
   - Check network connectivity

4. **Audio processing issues**
   - Enable DEBUG logging to see detailed audio processing info
   - Check browser console for WebRTC errors



## 🚀 Future Optimizations

While the current implementation provides a solid foundation for real-time voice interaction, there are several areas identified for potential improvements:

### 1. **Instant Response Interruption**
Currently, when a user speaks while the AI is responding, the interruption is handled on the backend - user audio is sent to the server, which then stops TTS generation. This creates a noticeable delay before the AI response actually stops playing. Moving the interruption logic to the frontend would provide immediate response cutoff, creating a more natural conversational flow.

### 2. **Advanced Noise Handling**
The current noise suppression has room for significant enhancement. Background noise occasionally triggers false interruptions, cutting off AI responses prematurely. Implementing more sophisticated audio processing algorithms, adaptive noise thresholds, and better voice activity detection could greatly improve the robustness of the system in noisy environments.

### 3. **Ultra-Low Latency Architecture**
The system has already achieved substantial latency improvements (reduced from ~10s to ~2s for first response), but further optimizations are possible. For example, utilizing multimodal AI models that handle speech-to-speech directly could eliminate separate STT/TTS processing steps and further reduce latency.

### 4. **Enhanced Audio Source Discrimination**
Background noise differentiation offers significant optimization opportunities. Advanced audio processing could include selecting the loudest audio track when multiple sources are present, filtering audio to focus on human vocal frequency ranges, and implementing more sophisticated algorithms to distinguish between intentional speech and environmental noise.

These optimizations would push the system toward truly seamless, real-time conversational AI experiences.

## 📧 Support

For questions and support, please open an issue on GitHub.

---

**Built with ❤️ using FastRTC, SenseVoice, and modern web technologies.** 