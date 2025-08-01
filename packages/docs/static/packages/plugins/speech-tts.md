# service-speech-tts

TTS transcription service with OpenAI + ElevenLabs + ComfyUI XTTS

## Description

The speech-tts service provides multiple text-to-speech options for ElizaOS:

- **OpenAI TTS**: High-quality speech synthesis using OpenAI's text-to-speech API
- **ElevenLabs**: Advanced voice cloning and natural speech generation
- **ComfyUI XTTS**: Local voice cloning using XTTS_INFER workflows with customizable voice models

## Configuration

### OpenAI TTS
```bash
OPENAI_API_KEY=your_openai_api_key
```

### ElevenLabs
```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### ComfyUI XTTS
```bash
COMFYUI_API_URL=http://localhost:8188
COMFYUI_API_KEY=your_api_key_optional
```

**ComfyUI Requirements:**
- ComfyUI instance running with XTTS custom node installed
- Reference audio files available (default: `en_sample.wav`)
- XTTS_INFER model accessible in ComfyUI

## Usage

### OpenAI TTS
```typescript
// Generate speech using OpenAI TTS
'Generate speech: Hello, how are you today?';
'Create audio from text: Welcome to ElizaOS!';
```

### ElevenLabs
```typescript
// Generate speech using ElevenLabs
'Clone voice and speak: This is a custom voice.';
'Generate natural speech: The quick brown fox jumps.';
```

### ComfyUI XTTS
```typescript
// XTTS voice cloning commands:
'Speak this text aloud: Hello, how are you today?';
'Read aloud: Welcome to ElizaOS!';
'Convert to speech: The quick brown fox jumps over the lazy dog.';
'Speak with voice file custom.wav: This is a custom voice.';
'Read aloud with speed 1.5: This will be faster speech.';
'Speak with language es: Hola, ¿cómo estás?';
```

### XTTS Parameters

The XTTS voice cloning supports the following parameters:

- **Reference Audio**: `voice file filename.wav` - Voice to clone from
- **Language**: `language en/es/fr/de/it/pt/ru/ja/ko/zh` - Speech language
- **Speed**: `speed 1.2` - Speech speed multiplier (0.5-2.0)
- **Temperature**: `temperature 0.7` - Generation randomness (0.0-1.0)

## Features

### OpenAI TTS
- High-quality speech synthesis
- Multiple voice options
- Automatic language detection
- Real-time generation

### ElevenLabs
- Advanced voice cloning
- Natural speech patterns
- Emotion and style control
- Multi-language support

### ComfyUI XTTS
- Local voice cloning
- Multi-language support
- Customizable parameters
- Browser-compatible audio playback
- Persistent user preferences
- Web UI toggle functionality

## Troubleshooting

### OpenAI Issues
- Verify API key is correctly set
- Check network connectivity
- Ensure text input is valid

### ElevenLabs Issues
- Verify API key is correctly set
- Check voice model availability
- Ensure audio format compatibility

### ComfyUI Issues
- Check `COMFYUI_API_URL` is set correctly
- Verify ComfyUI instance is running
- Ensure XTTS custom node is installed
- Check reference audio files are available
- Verify browser console for errors

## Security

- Store API keys securely using environment variables
- Never commit API keys to version control
- Use URL validation for ComfyUI proxy endpoints
- Implement CORS headers for browser compatibility

## Development

For ComfyUI development setup:

1. Install XTTS custom node in ComfyUI
2. Place reference audio files in ComfyUI input directory
3. Configure XTTS_INFER model
4. Set environment variables
5. Test integration with `elizaos test`

## Links

- [OpenAI TTS Documentation](https://platform.openai.com/docs/guides/text-to-speech)
- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [XTTS Documentation](https://github.com/coqui-ai/TTS)
