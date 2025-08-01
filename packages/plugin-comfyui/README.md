# ComfyUI Plugin for ElizaOS

Enhanced ElizaOS plugin for ComfyUI API integration with full endpoint support, queue management, and universal image display.

## Features

- **Image Generation**: Generate images using ComfyUI workflows
- **Audio Generation**: Generate music and sound effects using Stable Audio
- **Text-to-Speech**: Convert text to speech using XTTS voice cloning workflows
- **Queue Management**: Monitor and control ComfyUI queue
- **Universal Display**: Works across all ElizaOS clients (web UI, Discord, etc.)

## Installation

1. Install the plugin:
```bash
npm install @elizaos/plugin-comfyui
```

2. Add to your agent's plugins:
```json
{
  "plugins": ["@elizaos/plugin-comfyui"]
}
```

3. Configure environment variables:
```bash
COMFYUI_API_URL=http://localhost:8188
COMFYUI_API_KEY=your_api_key_optional
```

## Usage

### Image Generation
```
"Generate an image of a beautiful sunset over the ocean"
```

### Audio Generation
```
"Generate audio of ocean waves"
"Create music for a peaceful meditation"
```

### Text-to-Speech (XTTS Voice Cloning)
```
"Speak this text aloud: Hello, how are you today?"
"Read aloud: Welcome to ElizaOS!"
"Convert to speech: The quick brown fox jumps over the lazy dog."
"Speak with voice file custom.wav: This is a custom voice."
"Read aloud with speed 1.5: This will be faster speech."
"Speak with language es: Hola, ¿cómo estás?"
```

### XTTS Parameters

The XTTS voice cloning supports the following parameters:

- **Reference Audio**: `voice file filename.wav` - Voice to clone from
- **Language**: `language en/es/fr/de/it/pt/ru/ja/ko/zh` - Speech language
- **Speed**: `speed 1.2` - Speech speed multiplier (0.5-2.0)
- **Temperature**: `temperature 0.7` - Generation randomness (0.0-1.0)

## Web UI TTS Toggle

The web UI includes a TTS toggle button in the chat header that allows users to:

- **Enable TTS**: Shows TTS buttons on agent messages
- **Disable TTS**: Hides TTS buttons (default behavior)
- **Persistent Setting**: Toggle state is saved in localStorage

### TTS Toggle Location
The toggle appears in the chat header next to other controls:
- **Icon**: Volume2 (enabled) / VolumeX (disabled)
- **Switch**: Small toggle switch
- **Tooltip**: "Enable/Disable text-to-speech"

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMFYUI_API_URL` | ComfyUI server URL | `http://comfyui:8188` |
| `COMFYUI_API_KEY` | ComfyUI API key (optional) | None |

### XTTS Requirements

The XTTS functionality requires:
- **XTTS Custom Node**: Must be installed in ComfyUI
- **Reference Audio Files**: Available in ComfyUI input directory (default: `en_sample.wav`)
- **Voice Cloning**: Uses reference audio for consistent voice output
- **Multi-language Support**: English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese

### TTS Settings

The TTS functionality uses the following ComfyUI workflow:
- **Model**: XTTS (Text-to-Speech with Voice Cloning)
- **Output**: Audio files via proxy endpoint
- **Cache**: 30 minutes for TTS audio
- **Timeout**: 30 seconds for TTS generation
- **Voice Cloning**: Uses reference audio files for consistent voice

## Architecture

### Proxy Pattern
```
Browser → ElizaOS Proxy → ComfyUI External Instance
```

### Endpoints
- `/api/media/comfyui/image` - Image proxy
- `/api/media/comfyui/audio` - Audio proxy  
- `/api/media/comfyui/tts` - TTS proxy

### Container Compatibility
- Works with external ComfyUI instances
- No additional container required
- Supports dev containers and port forwarding
- Relative URLs for universal access

## Development

### Running Tests
```bash
cd packages/plugin-comfyui
elizaos test
```

### Building
```bash
cd packages/plugin-comfyui
bun run build
```

## Troubleshooting

### XTTS Not Working
1. Check `COMFYUI_API_URL` is set correctly
2. Verify ComfyUI instance is running
3. Ensure XTTS custom node is installed in ComfyUI
4. Check that reference audio files are available (default: `en_sample.wav`)
5. Check browser console for errors

### Audio Not Playing
1. Verify proxy URL includes `/api/media/comfyui/tts`
2. Check browser console for CORS errors
3. Ensure audio format is supported by browser
4. Try refreshing the page

### TTS Toggle Not Appearing
1. Check if TTS toggle is in chat header
2. Verify localStorage is working
3. Check browser console for errors
4. Ensure plugin is loaded correctly

### Voice Cloning Issues
1. Ensure reference audio file exists in ComfyUI input directory
2. Check audio file format (WAV recommended)
3. Verify XTTS_INFER node is available in ComfyUI
4. Test with different reference audio files
