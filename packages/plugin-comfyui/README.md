# @elizaos/plugin-comfyui

**Production-ready ElizaOS plugin for ComfyUI API integration with full endpoint support, queue management, and universal image display.**

## Features

✅ **Complete Image Generation** - Full Flux model support with customizable parameters  
✅ **Container Compatible** - Works seamlessly in Docker and dev containers  
✅ **Universal Display** - Images work in web UI, Discord, and all platforms  
✅ **Dynamic Responsive Sizing** - Perfect image display across all screen sizes  
✅ **Queue Management** - Monitor, interrupt, and manage ComfyUI workflows  
✅ **Proxy Architecture** - Secure proxy for browser access across networks  
✅ **Auto-retry Logic** - Robust error handling with cache-busting  
✅ **CORS Complete** - Full cross-origin support for all environments  

## Quick Start

### 1. Environment Setup
```bash
# Required: ComfyUI API endpoint
COMFYUI_API_URL=http://comfyui:8188

# Optional: Authentication
COMFYUI_API_KEY=your_api_key_here
```

### 2. Usage
```typescript
// In your ElizaOS agent configuration
import comfyuiPlugin from '@elizaos/plugin-comfyui';

export default {
    plugins: [comfyuiPlugin],
    // ... other config
};
```

### 3. Generate Images
```
User: generate an image of a cat
Agent: I'll create that image for you using ComfyUI...
[Image displays directly in chat]
```

## Container Compatibility

This plugin is **specifically designed** for container environments:

- ✅ **Dev Containers** - Works with port forwarding (`localhost:40165` → `localhost:3000`)
- ✅ **Docker Compose** - Internal service networking (`comfyui:8188`)
- ✅ **Kubernetes** - Service discovery and ingress compatible
- ✅ **Local Development** - Standard localhost operation

## Actions Available

- **`GENERATE_IMAGE`** - Create images with Flux model
- **`GENERATE_AUDIO`** - Audio generation (experimental)  
- **`CHECK_COMFYUI_QUEUE`** - Monitor generation queue
- **`INTERRUPT_COMFYUI`** - Stop running workflows

## Architecture Highlights

### Proxy Design
- **Browser ← ElizaOS Proxy ← ComfyUI Container**
- Solves network isolation and CORS issues
- Secure URL validation prevents abuse

### Relative URLs
- Uses `/api/media/comfyui/image?url=...` (relative)
- **Never** hardcodes `localhost:3000` 
- Works with any port forwarding setup

### Action Override
- Automatically takes precedence over other image plugins
- Manual registration ensures ComfyUI is the primary generator

## Dynamic Responsive Image Sizing

This plugin features **advanced responsive image sizing** that automatically adapts to screen size:

- **Mobile** (< 768px): Conservative 400px max width with 3:4 aspect ratio
- **Desktop** (≥ 768px): Dynamic 600-800px width with 1:1 aspect ratio for perfect squares
- **Automatic scaling**: Based on window width using ElizaOS responsive conventions
- **ComfyUI optimized**: Specifically designed for 1024x1024 square AI-generated images

### Perfect Display Results
- **Small screens**: Optimized mobile experience without overflow
- **Large screens**: Full utilization of available space with proper aspect ratios  
- **All devices**: Maintains image quality and proportions

## Development

```bash
# Install dependencies
bun install

# Build plugin
bun run build

# Run tests
bun run test
```

### 🚨 **Critical: ElizaOS Build Process for Client Changes**

If you modify client-side display behavior, you **MUST** follow this sequence:

```bash
# 1. Build client assets
cd packages/client && bun run build

# 2. Copy client files to server (ESSENTIAL STEP)
cd packages/server && bun run build  

# 3. Restart ElizaOS to serve updated files
elizaos start

# 4. Hard refresh browser to clear cache
# Press Ctrl+Shift+F5 in your browser
```

**Why this matters**: ElizaOS serves client files from `packages/server/dist/client`, not directly from `packages/client/dist`. The server build step copies updated client assets.

## 📚 **IMPORTANT: Developer Guide**

**Before making ANY changes to this plugin, read the comprehensive developer guide:**

👉 **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** 👈

This guide contains **critical information** about:
- Container networking patterns that MUST be preserved
- CORS configurations that CANNOT be modified  
- URL generation patterns that are REQUIRED for dev containers
- All the fixes and architectural decisions documented in detail

**Failure to follow the developer guide may break the plugin in container environments.**

## Troubleshooting

### Images not displaying?
1. **Hard refresh** browser (`Ctrl+Shift+F5`)
2. **Check browser console** for error messages
3. **Verify ComfyUI is running**: `curl http://comfyui:8188/queue`
4. **Test proxy directly**: `curl -I http://localhost:3000/api/media/comfyui/health`

### Common Issues
- **"Failed to load image"** → Usually browser cache, try hard refresh
- **Connection refused** → Check `COMFYUI_API_URL` environment variable
- **Timeout errors** → Verify ComfyUI model is loaded (`flux1-dev-fp8.safetensors`)

## License

MIT

---

**This plugin has been battle-tested in dev container environments. All architectural decisions are documented in the developer guide for maintainability and future development.**
