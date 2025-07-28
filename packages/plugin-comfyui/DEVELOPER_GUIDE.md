# ComfyUI Plugin Developer Guide

## Overview

The `@elizaos/plugin-comfyui` is a comprehensive integration plugin that enables ElizaOS agents to generate images and audio using ComfyUI workflows. This plugin provides a complete end-to-end solution for AI image generation with robust proxy support, container compatibility, and full web UI integration.

## 🚨 Critical Architecture Notes

### **NEVER MODIFY THESE CORE PATTERNS WITHOUT UNDERSTANDING THE IMPLICATIONS**

## 1. URL Generation Pattern (CRITICAL)

### ⚠️ **ABSOLUTE CRITICAL: Relative URL Pattern**

The plugin uses **relative URLs** for image proxying, not absolute URLs. This is essential for container environments and dev containers.

```typescript
// ✅ CORRECT - Relative URL (NEVER CHANGE THIS)
private createProxyUrl(internalUrl: string): string {
    const encodedUrl = encodeURIComponent(internalUrl);
    return `/api/media/comfyui/image?url=${encodedUrl}`;
}

// ❌ WRONG - Absolute URL (BREAKS IN CONTAINERS)
private createProxyUrl(internalUrl: string): string {
    return `http://localhost:3000/api/media/comfyui/image?url=${encodedUrl}`;
}
```

**Why:** In dev containers, the browser accesses the UI via port forwarding (e.g., `localhost:40165`), but the server runs on `localhost:3000` internally. Absolute URLs break this mapping.

## 2. Client-Side Image Detection (CRITICAL)

### ⚠️ **ABSOLUTE CRITICAL: ComfyUI URL Detection**

The web UI **must** recognize ComfyUI proxy URLs as images, even though they don't end with file extensions.

```typescript
// ✅ CORRECT - ComfyUI-aware detection (NEVER REMOVE THIS)
const isImageUrl = (url: string): boolean => {
  // Check for ComfyUI proxy URLs first
  if (url.includes('/api/media/comfyui/image')) {
    return true;
  }
  // Check for standard image file extensions
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
};

// ❌ WRONG - Standard detection only (BREAKS COMFYUI)
const isImageUrl = (url: string): boolean => {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url);
};
```

**Why:** ComfyUI proxy URLs end with query parameters like `...type%3Doutput`, not `.png`. Without special detection, they're treated as text links.

## 3. CORS Configuration (CRITICAL)

### ⚠️ **ABSOLUTE CRITICAL: Complete CORS Headers**

The server proxy **must** include comprehensive CORS headers for browser compatibility.

```typescript
// ✅ CORRECT - Complete CORS setup (NEVER REMOVE THESE)
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Max-Age', '86400');

// Handle OPTIONS preflight requests
router.options('/image', (req, res) => {
    // Set CORS headers and return 204
});
```

**Why:** Browsers perform CORS checks when loading images from different origins. Missing headers cause silent failures.

---

## Plugin Architecture

### Directory Structure

```
packages/plugin-comfyui/
├── src/
│   ├── index.ts              # Plugin definition and initialization
│   ├── service.ts            # Core ComfyUI service (URL generation, API calls)
│   ├── actions/
│   │   ├── generateImage.ts  # Main image generation action
│   │   ├── generateAudio.ts  # Audio generation (experimental)
│   │   ├── queueStatus.ts    # Queue monitoring
│   │   └── interruptGeneration.ts # Workflow interruption
│   └── models/
│       └── imageHandler.ts   # Model handler for IMAGE type
├── __tests__/
│   └── plugin.test.ts        # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

### Core Components

#### 1. **ComfyUIService** (`src/service.ts`)
- **Purpose**: Central service for all ComfyUI API interactions
- **Key Features**:
  - Workflow creation and submission
  - Image generation with proxy URL creation
  - Queue status monitoring
  - Execution interruption
  - History retrieval

#### 2. **Actions** (`src/actions/`)
- **generateImage.ts**: Primary image generation with validation and response handling
- **generateAudio.ts**: Audio generation (placeholder implementation)
- **queueStatus.ts**: Queue monitoring and reporting
- **interruptGeneration.ts**: Workflow interruption and cleanup

#### 3. **Model Handler** (`src/models/imageHandler.ts`)
- **Purpose**: Integrates with ElizaOS model system for `ModelType.IMAGE`
- **Usage**: Allows other plugins to use `runtime.useModel(ModelType.IMAGE, params)`

---

## Critical Implementation Details

### 1. Action Registration Pattern

The plugin uses a **manual override pattern** for the `GENERATE_IMAGE` action to ensure priority over other image generation plugins.

```typescript
// In src/index.ts - CRITICAL PATTERN
init: async (_config, runtime) => {
    // Defer action replacement to ensure all plugins are loaded
    setTimeout(() => {
        // Force-replace any existing GENERATE_IMAGE action
        const existingActionIndex = runtime.actions.findIndex(action => action.name === 'GENERATE_IMAGE');
        if (existingActionIndex !== -1) {
            runtime.actions.splice(existingActionIndex, 1);
        }
        // Register ComfyUI version as the final authority
        runtime.actions.push(generateImageAction);
    }, 100);
}
```

**Why:** Multiple plugins may provide image generation. This ensures ComfyUI takes precedence when available.

### 2. Workflow Generation

The plugin generates **Flux model workflows** dynamically based on user parameters:

```typescript
private createImageWorkflow(prompt: string, params: Record<string, any> = {}): any {
    const seed = params.seed || Math.floor(Math.random() * 1000000);
    const steps = params.steps || 35;
    const cfg = params.cfg || 1.0;
    const width = params.width || 1024;
    const height = params.height || 1024;
    const model = params.model || "flux1-dev-fp8.safetensors";
    
    // Returns complete ComfyUI workflow JSON
}
```

**Critical:** The workflow structure is **ComfyUI-specific JSON** that defines node connections and parameters.

### 3. Image Waiting Pattern

The service implements a **polling pattern** to wait for image generation completion:

```typescript
private async waitForImage(promptId: string, maxWaitTime: number = 300000): Promise<{ url: string; filename: string }> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        // Check history for completed image
        const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`);
        
        if (historyResponse.data[promptId]?.outputs?.['9']?.images?.[0]) {
            // Image ready - create proxy URL
            return { url: proxyUrl, filename: image.filename };
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Image generation timed out');
}
```

**Why:** ComfyUI generation is asynchronous. We must poll the `/history` endpoint to detect completion.

---

## Container Environment Considerations

### Dev Container Specifics

1. **Port Forwarding**: Dev containers expose internal ports via forwarding
   - Internal: `localhost:3000`
   - External: `localhost:40165` (or random port)
   - **Solution**: Use relative URLs that inherit the browser's host:port

2. **Network Isolation**: ComfyUI container uses internal Docker IPs
   - ComfyUI runs at `172.19.0.4:8188` (internal Docker network)
   - ElizaOS proxy bridges this gap for browser access

3. **CORS Requirements**: Stricter in containerized environments
   - Browsers enforce CORS more strictly with port forwarding
   - **Solution**: Comprehensive CORS headers on proxy endpoints

### Docker Compose Configuration

```yaml
# Example docker-compose.yml fragment
services:
  comfyui:
    image: comfyui-image
    ports:
      - "8188:8188"
    networks:
      - eliza-network
    
  eliza:
    depends_on:
      - comfyui
    environment:
      - COMFYUI_API_URL=http://comfyui:8188
    networks:
      - eliza-network
```

**Critical:** Use service names (`comfyui:8188`) not localhost in container environments.

---

## Server-Side Proxy Implementation

### Location: `packages/server/src/api/media/comfyui.ts`

The server provides a **proxy endpoint** that bridges ComfyUI's internal network with the browser:

```typescript
// Proxy endpoint: /api/media/comfyui/image?url=encoded_comfyui_url
router.get('/image', async (req, res) => {
    const imageUrl = req.query.url as string;
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Security: Validate ComfyUI URL format
    if (!decodedUrl.includes('/view?') || !decodedUrl.includes('filename=')) {
        return res.status(400).json({ error: 'Invalid ComfyUI image URL format' });
    }
    
    // Fetch from ComfyUI and stream to browser
    const response = await axios.get(decodedUrl, { responseType: 'stream' });
    
    // Set proper headers for browser compatibility
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    response.data.pipe(res);
});
```

**Security Note:** URL validation prevents proxy abuse by ensuring only ComfyUI image URLs are proxied.

---

## Client-Side Integration

### Location: `packages/client/src/components/media-content.tsx`

The web UI includes **ComfyUI-specific handling**:

```typescript
// Special handling for ComfyUI images with retry mechanism
const isComfyUIImage = url && url.includes('/api/media/comfyui/image');
const [retryCount, setRetryCount] = useState(0);

const handleComfyUIError = (event) => {
    console.error('ComfyUI image failed to load (attempt ' + (retryCount + 1) + '):', {
        url,
        error: event
    });
    
    // Retry once with cache-busting timestamp
    if (retryCount === 0) {
        setRetryCount(1);
        setHasError(false);
        setIsLoading(true);
        return;
    }
    
    setIsLoading(false);
    setHasError(true);
};

// Add cache-busting parameter for ComfyUI images on retry
const imageUrl = isComfyUIImage && retryCount > 0 
    ? `${url}&cb=${Date.now()}` 
    : url;
```

**Features:**
- **Automatic retry** with cache-busting for failed loads
- **Enhanced debugging** with console logging
- **ComfyUI-specific error messages** in the UI

---

## Testing Strategy

### Unit Tests (`__tests__/plugin.test.ts`)

The tests verify:
- Plugin structure and exports
- Action registration (accounting for manual override)
- Action validation and handler functions

**Critical Test Pattern:**
```typescript
it('should export a valid plugin', () => {
    expect(comfyuiPlugin.actions).toHaveLength(3); // 3 actions in array, GENERATE_IMAGE is manually registered
});
```

**Why:** The static `actions` array doesn't include `GENERATE_IMAGE` because it's manually registered in `init()`.

### E2E Testing Considerations

For full integration testing:
1. **ComfyUI Service Availability**: Ensure ComfyUI is running and accessible
2. **Workflow Execution**: Test complete image generation pipeline
3. **Proxy Functionality**: Verify browser can load generated images
4. **Container Networks**: Test in Docker Compose environment

---

## Environment Configuration

### Required Environment Variables

```bash
# ComfyUI API endpoint (internal container address)
COMFYUI_API_URL=http://comfyui:8188

# Optional: ComfyUI API key (if authentication enabled)
COMFYUI_API_KEY=your_api_key_here

# ElizaOS server port (used for logging, proxy uses relative URLs)
SERVER_PORT=3000
```

### Container-Specific Configuration

```bash
# For Docker Compose
COMFYUI_API_URL=http://comfyui:8188

# For local development
COMFYUI_API_URL=http://localhost:8188

# For external ComfyUI instance
COMFYUI_API_URL=http://external-comfyui-server:8188
```

---

## Common Issues and Solutions

### Issue 1: "Failed to load image (ComfyUI)"

**Symptoms:**
- Images generate successfully but don't display in web UI
- Console shows image load errors
- Proxy URLs return 200 OK when tested with curl

**Root Causes & Solutions:**
1. **Browser cache issues**
   - **Solution**: Hard refresh (`Ctrl+Shift+F5`) or clear browser cache
   
2. **Missing CORS headers**
   - **Solution**: Verify all CORS headers are present in proxy response
   
3. **Port forwarding in dev containers**
   - **Solution**: Ensure relative URLs are used (never absolute `localhost:3000`)

4. **Client-side URL detection failure**
   - **Solution**: Verify `isImageUrl()` includes ComfyUI URL check

### Issue 2: ComfyUI Service Unavailable

**Symptoms:**
- `COMFYUI_API_URL not set` warnings
- Connection refused errors
- Queue status checks fail

**Solutions:**
1. **Verify ComfyUI is running**: `curl http://comfyui:8188/queue`
2. **Check container networking**: Ensure services can communicate
3. **Validate environment variables**: Confirm `COMFYUI_API_URL` is set correctly

### Issue 3: Workflow Execution Failures

**Symptoms:**
- Image generation times out
- ComfyUI returns workflow errors
- Invalid model or node errors

**Solutions:**
1. **Check model availability**: Ensure `flux1-dev-fp8.safetensors` is installed
2. **Verify workflow JSON**: Test workflow in ComfyUI web interface
3. **Update node structure**: ComfyUI node IDs may change between versions

---

## Development Best Practices

### 1. Never Hardcode URLs

```typescript
// ❌ BAD - Breaks in containers
const url = `http://localhost:3000/api/...`;

// ✅ GOOD - Works everywhere
const url = `/api/...`;
```

### 2. Always Include CORS Headers

```typescript
// ✅ GOOD - Complete CORS setup
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Max-Age', '86400');
```

### 3. Validate Proxy URLs

```typescript
// ✅ GOOD - Prevent proxy abuse
if (!decodedUrl.includes('/view?') || !decodedUrl.includes('filename=')) {
    return res.status(400).json({ error: 'Invalid ComfyUI image URL format' });
}
```

### 4. Handle Container Networks

```typescript
// ✅ GOOD - Dynamic API URL
this.apiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL || 'http://comfyui:8188';

// ❌ BAD - Hardcoded localhost
this.apiUrl = 'http://localhost:8188';
```

### 5. Implement Proper Error Handling

```typescript
// ✅ GOOD - Detailed error information
catch (error: any) {
    console.error('ComfyUI image generation error:', {
        error: error.message,
        promptId,
        apiUrl: this.apiUrl
    });
    throw new Error(`ComfyUI image generation failed: ${error.message}`);
}
```

---

## Migration and Upgrade Notes

### From Previous Versions

If upgrading from an older ComfyUI integration:

1. **Update URL Generation**: Ensure relative URLs are used
2. **Add CORS Headers**: Include complete CORS setup in proxy
3. **Update Client Detection**: Add ComfyUI URL recognition
4. **Container Configuration**: Update Docker Compose for internal networking

### Future Development

When extending the plugin:

1. **Maintain Proxy Pattern**: Always use the proxy for browser access
2. **Preserve CORS Setup**: Don't remove or modify CORS headers
3. **Test in Containers**: Verify functionality in Docker environments
4. **Document Breaking Changes**: Update this guide for any architectural changes

---

## Troubleshooting Checklist

### Before Making Changes

- [ ] Understand the container networking implications
- [ ] Verify you're not hardcoding URLs
- [ ] Ensure CORS headers remain complete
- [ ] Test in both local and container environments

### After Making Changes

- [ ] Test image generation end-to-end
- [ ] Verify images display in web UI
- [ ] Check browser console for errors
- [ ] Test with hard refresh to bypass cache
- [ ] Validate in dev container environment

### Performance Considerations

- [ ] Monitor ComfyUI queue length
- [ ] Implement proper timeout handling
- [ ] Cache workflow templates where appropriate
- [ ] Consider rate limiting for heavy usage

---

## API Reference

### ComfyUIService Methods

```typescript
// Image generation
async generateImage(prompt: string, params?: Record<string, any>): Promise<ComfyUIImageResult>

// Queue management
async getQueueStatus(): Promise<ComfyUIQueueStatus>
async interruptExecution(): Promise<void>

// History and monitoring
async getHistory(promptId?: string): Promise<any>

// Utility
async getObjectInfo(): Promise<any>
```

### Action Validation Patterns

```typescript
// Image generation validation
const hasImageKeyword = imageKeywords.some(keyword => text.includes(keyword));
const isConfigured = !!runtime.getSetting('COMFYUI_API_URL');
return hasImageKeyword && isConfigured;
```

### Proxy URL Pattern

```typescript
// Always use this pattern for image URLs
const proxyUrl = `/api/media/comfyui/image?url=${encodeURIComponent(internalUrl)}`;
```

---

## Conclusion

This ComfyUI plugin represents a complete, production-ready integration that handles the complexities of container environments, browser compatibility, and asynchronous workflow execution. The architecture is designed to be robust, secure, and maintainable.

**Key Success Factors:**
1. **Relative URLs** for container compatibility
2. **Comprehensive CORS** for browser support  
3. **Proxy architecture** for network isolation
4. **Retry mechanisms** for reliability
5. **Detailed logging** for debugging

**Remember:** This plugin has been battle-tested in dev container environments. Any changes should preserve these core architectural decisions to maintain compatibility and functionality.

For questions or issues, refer to this guide first, then examine the specific implementation files for detailed patterns and examples. 