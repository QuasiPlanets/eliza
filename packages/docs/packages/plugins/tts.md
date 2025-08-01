# @elizaos/plugin-tts

A plugin for text-to-speech(TTS) generation using the FAL.ai API and ComfyUI XTTS workflows within the ElizaOS ecosystem.

## Description

The text-to-speech(TTS) plugin enables AI-powered creation of speech through multiple services:
- **FAL.ai services**: Cloud-based TTS with automatic language detection and voice selection
- **ComfyUI XTTS**: Local voice cloning using XTTS_INFER workflows with customizable voice models

## Installation

```bash
bun install @elizaos/plugin-tts
```

## Configuration

### FAL.ai Configuration

The plugin requires the following environment variable or runtime setting to be set:

```typescript
FAL_API_KEY=<Your FAL.ai API key>
```

### ComfyUI Configuration

For ComfyUI XTTS functionality, configure the following environment variables:

```bash
COMFYUI_API_URL=http://localhost:8188
COMFYUI_API_KEY=your_api_key_optional
```

**Requirements:**
- ComfyUI instance running with XTTS custom node installed
- Reference audio files available (default: `en_sample.wav`)
- XTTS_INFER model accessible in ComfyUI

## Usage

### Basic Integration

```typescript
import { TTSGenerationPlugin } from '@elizaos/plugin-tts';
```

### FAL.ai Voice Generation Examples

```typescript
// The plugin responds to natural language commands like:

'Generate TTS of Hello World';
'Create a TTS for Welcome to ElizaOS';
'Make a TTS saying [your text]';
```

### ComfyUI XTTS Voice Generation Examples

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

## API Reference

### Actions

#### GENERATE_TTS

Generates speech audio based on text input using either FAL.ai or ComfyUI XTTS.

**Aliases:**

- TTS_GENERATION
- CREATE_TTS
- TEXT2SPEECH
- T2S
- TEXT_TO_SPEECH
- AUDIO_CREATE

**Features:**

- **FAL.ai**: Automatic language detection, voice selection based on detected language, local file caching, progress tracking, error handling
- **ComfyUI XTTS**: Voice cloning, multi-language support, customizable parameters, browser-compatible audio playback, persistent user preferences

## Common Issues & Troubleshooting

### FAL.ai Issues

1. **Generation Failures**

   - Verify FAL API key is correctly set
   - Ensure text input is at least 3 characters long
   - Check network connectivity to FAL.ai services

2. **Storage Issues**
   - Verify write permissions to content_cache directory
   - Ensure sufficient disk space
   - Check if content_cache directory exists

### ComfyUI Issues

1. **XTTS Not Working**
   - Check `COMFYUI_API_URL` is set correctly
   - Verify ComfyUI instance is running
   - Ensure XTTS custom node is installed in ComfyUI
   - Check that reference audio files are available (default: `en_sample.wav`)
   - Check browser console for errors

2. **Audio Not Playing**
   - Verify proxy URL includes `/api/media/comfyui/tts`
   - Check browser console for CORS errors
   - Ensure audio format is supported by browser
   - Try refreshing the page

3. **TTS Toggle Not Appearing**
   - Check if TTS toggle is in chat header
   - Verify localStorage is working
   - Check browser console for errors
   - Ensure plugin is loaded correctly

## Security Best Practices

1. **API Key Management**
   - Store API keys securely using runtime settings or environment variables
   - Never commit API keys to version control
   - Monitor API usage

2. **ComfyUI Security**
   - Use URL validation to prevent proxy abuse
   - Implement CORS headers for browser compatibility
   - Sanitize input text prompts
   - Use error boundaries for graceful failures

## Development Guide

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Build the plugin:

```bash
bun run build
```

4. Run the plugin:

```bash
bun run dev
```

### ComfyUI Development Setup

1. **Install ComfyUI with XTTS**
   - Install XTTS custom node in ComfyUI
   - Place reference audio files in ComfyUI input directory
   - Configure XTTS_INFER model

2. **Configure Environment**
   ```bash
   COMFYUI_API_URL=http://localhost:8188
   ```

3. **Test Integration**
   ```bash
   cd packages/plugin-comfyui
   elizaos test
   ```

## Future Enhancements

1. **Advanced Voice Features**

   - Custom voice model support
   - Voice style transfer
   - Emotion control
   - Speech rate adjustment
   - Pitch modification
   - Multiple speaker support

2. **Audio Processing**

   - Background noise reduction
   - Audio quality enhancement
   - Format conversion options
   - Volume normalization
   - Audio effects processing
   - Batch processing support

3. **Language Support**

   - Expanded language detection
   - Regional accent support
   - Dialect customization
   - Pronunciation improvements
   - Multi-language mixing
   - Custom pronunciation rules

4. **Integration Features**

   - Streaming audio support
   - Real-time generation
   - Caching optimization
   - Batch generation
   - Queue management
   - Progress monitoring

5. **Developer Tools**
   - Extended API options
   - Testing framework
   - Performance profiling
   - Debug logging
   - Integration examples
   - Documentation generator

We welcome community feedback and contributions to help prioritize these enhancements.

## Contributing

Contributions are welcome! Please see the CONTRIBUTING.md file for more information.

## Credits

This plugin integrates with and builds upon several key technologies:

- [FAL.ai](https://fal.ai/): AI model deployment platform
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI): Modular AI workflow interface
- [XTTS](https://github.com/coqui-ai/TTS): Text-to-speech with voice cloning
- [langdetect](https://github.com/wooorm/franc): Language detection library
- [ElizaOS](https://elizaos.com): Core framework

Special thanks to:

- The FAL.ai team for AI infrastructure
- The ComfyUI community for workflow integration
- The XTTS development team for voice cloning technology
- The langdetect development community
- The Eliza community for their contributions and feedback

For more information about TTS capabilities:

- [FAL.ai Documentation](https://fal.ai/docs)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [XTTS Documentation](https://github.com/coqui-ai/TTS)
- [ElizaOS Documentation](https://elizaos.github.io/eliza/)

## License

This plugin is part of the Eliza project. See the main project repository for license information.
