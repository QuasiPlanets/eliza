# @elizaos/plugin-comfyui

ElizaOS plugin for integrating with the ComfyUI API, enabling agents to generate images and audio using diffusion workflows.

## Features
- Generate images and audio via ComfyUI API
- Actions: GENERATE_IMAGE, GENERATE_AUDIO
- Stores media metadata in ElizaOS memory
- Configurable API endpoint and authentication

## Usage
1. Add the plugin to your ElizaOS agent's plugins list.
2. Set the ComfyUI API endpoint and key in your environment or agent settings:
   - `COMFYUI_API_URL` (e.g., http://comfyui:8188)
   - `COMFYUI_API_KEY` (if required)
3. Use the GENERATE_IMAGE or GENERATE_AUDIO actions to create media.

## Development
- `bun install` or `npm install`
- `bun run build` or `npm run build`
- `bun run test` or `npm test`

## License
MIT
