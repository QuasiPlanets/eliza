# ComfyUI Audio Integration for ElizaOS

## Overview

This document provides a comprehensive guide to modify the `@elizaos/plugin-comfyui` plugin in the ElizaOS project to enable audio responses in the web UI. The goal is to have ElizaOS send its text replies to a ComfyUI text-to-speech workflow (using the `XTTS_INFER` node) and return the generated audio as a reply in the ElizaOS web UI, instead of displaying text. This implementation follows the ElizaOS Standard Development Workflow and adheres to the architectural constraints outlined in the `@elizaos/plugin-comfyui` developer guide.

**Repository**: https://github.com/QuasiPlanets/eliza/tree/develop

**Current Date**: July 31, 2025

---

## Problem Statement

**User Requirement**: When a user sends a message to ElizaOS via the web UI, instead of responding with text, ElizaOS should:
1. Send its generated text response to the `text` field of the `XTTS_INFER` node in a provided ComfyUI workflow.
2. Trigger the ComfyUI workflow to generate audio.
3. Retrieve the generated audio from ComfyUI and send it as an audio attachment in the ElizaOS web UI.

**Current Setup**:
- The `@elizaos/plugin-comfyui` plugin supports image and audio generation using ComfyUI workflows.
- A ComfyUI workflow JSON is provided for text-to-speech using `XTTS_INFER`:
  ```json
  {
    "1": {
      "inputs": { "audio": ["3", 0] },
      "class_type": "PreViewAudio",
      "_meta": { "title": "PreView Audio" }
    },
    "2": {
      "inputs": {
        "audio": "en_sample.wav",
        "choose audio file to upload": "Audio"
      },
      "class_type": "LoadAudioPath",
      "_meta": { "title": "LoadAudioPath" }
    },
    "3": {
      "inputs": {
        "text": "The Hitchhiker's Guide to the Galaxy is, without question, the most wholly remarkable book ever to grace the cosmos...",
        "language": "en",
        "temperature": 0.6800000000000002,
        "length_penalty": 1,
        "repetition_penalty": 4,
        "top_k": 50,
        "top_p": 0.85,
        "speed": 1.2000000000000002,
        "audio": ["2", 0]
      },
      "class_type": "XTTS_INFER",
      "_meta": { "title": "XTTS Inference" }
    }
  }
  ```
- The repository (`https://github.com/QuasiPlanets/eliza/tree/develop`) contains the ElizaOS codebase, including the `@elizaos/plugin-comfyui` plugin.
- The plugin already supports audio generation via `generateAudio.ts`, but the default `REPLY` action in `character.ts` sends text responses to the web UI.

**Desired Behavior**:
- User sends a message in the ElizaOS web UI.
- ElizaOS generates a text response internally.
- The text is sent to the `text` field of the `XTTS_INFER` node in the ComfyUI workflow.
- ComfyUI generates audio, which is retrieved and sent to the web UI as an audio attachment.
- No text response is displayed; only the audio player appears.

---

## Architectural Constraints (From ComfyUI Plugin Developer Guide)

The `@elizaos/plugin-comfyui` plugin has strict architectural requirements that must be preserved:
1. **Relative URLs**: Always use relative URLs (e.g., `/api/media/comfyui/audio`) for proxying to support dev containers and port forwarding.
2. **CORS Headers**: Include complete CORS headers in proxy endpoints for browser compatibility.
3. **Container Compatibility**: Use service names (e.g., `comfyui:8188`) in Docker Compose, not `localhost`.
4. **Two-Stage Build Process**: Client changes require building `packages/client`, then `packages/server`, followed by a hard refresh (`Ctrl+Shift+F5`).
5. **Action Override Pattern**: Actions like `GENERATE_IMAGE` use deferred registration to ensure priority; we’ll apply a similar pattern for `REPLY`.
6. **Asynchronous Polling**: ComfyUI workflows are asynchronous, requiring polling of the `/history` endpoint to detect completion.

**Key Files** (from plugin directory structure):
- `packages/plugin-comfyui/src/index.ts`: Plugin initialization and action registration.
- `packages/plugin-comfyui/src/service.ts`: Core ComfyUI service for API interactions.
- `packages/plugin-comfyui/src/actions/generateAudio.ts`: Audio generation action.
- `packages/server/src/api/media/comfyui.ts`: Proxy endpoints for image and audio.
- `packages/client/src/components/media-content.tsx`: Client-side media rendering.
- `packages/core/src/character.ts`: Core character actions, including `REPLY`.

**Environment Variables**:
```bash
COMFYUI_API_URL=http://comfyui:8188
SERVER_PORT=3000
```

---

## Implementation Plan

Following the ElizaOS Standard Development Workflow, we’ll modify the plugin to achieve the desired audio response behavior.

### Step 1: Understand the Requirement
- **Goal**: Override the default `REPLY` action to trigger audio generation via the provided ComfyUI workflow and display the audio in the web UI.
- **Assumptions**:
  - `en_sample.wav` is available in the ComfyUI container’s filesystem.
  - The `XTTS_INFER` model is installed in ComfyUI.
  - The audio output from `PreViewAudio` (node 1) is accessible via ComfyUI’s `/view` endpoint.
- **Risks**:
  - Missing `en_sample.wav` could break the workflow.
  - Incorrect workflow JSON may cause execution failures.
  - Overriding `REPLY` could affect other plugins.
  - Audio rendering may fail if `ContentType.AUDIO` is not handled correctly.

### Step 2: Plan the Implementation
- **Modified Files**:
  1. `packages/core/src/character.ts`: Override `REPLY` to trigger `GENERATE_AUDIO`.
  2. `packages/plugin-comfyui/src/service.ts`: Add support for the `XTTS_INFER` workflow and audio polling.
  3. `packages/plugin-comfyui/src/actions/generateAudio.ts`: Update to use the new workflow logic.
  4. `packages/server/src/api/media/comfyui.ts`: Ensure the audio proxy endpoint supports `audio/wav`.
  5. `packages/client/src/components/media-content.tsx`: Verify audio rendering.
  6. `docker-compose.yml`: Ensure `en_sample.wav` is accessible.
  7. `packages/plugin-comfyui/__tests__/plugin.test.ts`: Add unit tests.
- **Impact Analysis**:
  - **Core**: Modifying `REPLY` affects all text responses, so include a fallback to text if audio fails.
  - **Plugin**: The `ComfyUIService` must handle the provided workflow JSON and poll for `PreViewAudio` output.
  - **Server**: The audio proxy must support streaming and correct content types.
  - **Client**: Must render audio URLs with retry logic, similar to image handling.
  - **Docker**: Must mount `en_sample.wav` to the ComfyUI container.
- **Dependencies**:
  - ComfyUI container running at `comfyui:8188`.
  - `axios` for API calls.
  - ElizaOS `ContentType.AUDIO` for response handling.

### Step 3: Project and Feature Scaffolding
- No new plugin is needed; we’ll modify the existing `@elizaos/plugin-comfyui`.
- Update existing actions and services to support the new workflow.

### Step 4: Test-Driven Development
- **Unit Tests**:
  - Verify `loadXTTSWorkflow` injects the correct text prompt.
  - Test `GENERATE_AUDIO` action registration and validation.
- **E2E Tests**:
  - Test the full pipeline: user input → audio generation → web UI playback.
- **Run Tests**:
  ```bash
  cd packages/plugin-comfyui
  elizaos test
  ```

### Step 5: Implement the Solution
- Apply the code changes below.
- Build and test locally and in a dev container.

### Step 6: Final Review and Verification
- **Edge Cases**:
  - Empty text response → Fallback to text.
  - Missing `en_sample.wav` → Log error and fallback.
  - ComfyUI unavailable → Handle connection errors.
  - Long audio generation → Ensure 60-second timeout is sufficient.
- **Manual Testing**:
  - Send messages via the web UI and verify audio playback.
  - Test on mobile and desktop browsers.
  - Check console for errors.
- **Full Test Suite**:
  ```bash
  elizaos test
  ```

### Step 7: Commit and Create Pull Request
- **Commit Message**:
  ```
  feat(plugin-comfyui): Override REPLY action to generate audio via XTTS_INFER workflow
  ```
- **PR Description**:
  - Summarize changes and link to this document.
  - Ensure CI/CD pipeline passes.

---

## Code Changes

Below are the specific code changes required to implement the audio integration.

### 1. Modify `character.ts` to Override `REPLY` Action
**File**: `packages/core/src/character.ts`
**Purpose**: Redirect text responses to trigger `GENERATE_AUDIO` instead of sending text.
```typescript
import { Action, ContentType } from '@elizaos/core';
import { runtime } from '@elizaos/core';

export const character = {
  // ... existing character config ...
  actions: [
    {
      name: 'REPLY',
      validator: () => true, // Always trigger for text responses
      handler: async (context) => {
        const textResponse = context.text; // ElizaOS-generated text
        try {
          // Trigger generateAudio action from ComfyUI plugin
          const audioResult = await runtime.actions.find(
            (action) => action.name === 'GENERATE_AUDIO'
          )?.handler({
            ...context,
            text: textResponse,
            params: { workflow: 'xtts_workflow' } // Identify the workflow
          });

          if (!audioResult) {
            throw new Error('Audio generation failed');
          }

          return {
            content: audioResult.url,
            contentType: ContentType.AUDIO,
            metadata: audioResult.metadata
          };
        } catch (error) {
          console.error('Audio reply error:', error);
          // Fallback to text response if audio fails
          return {
            content: textResponse,
            contentType: ContentType.TEXT
          };
        }
      }
    }
  ]
};
```

### 2. Update `ComfyUIService` in `service.ts`
**File**: `packages/plugin-comfyui/src/service.ts`
**Purpose**: Add support for the `XTTS_INFER` workflow and audio output retrieval.
```typescript
import axios from 'axios';
import { ComfyUIImageResult, ComfyUIQueueStatus } from './types';

export class ComfyUIService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.COMFYUI_API_URL || 'http://comfyui:8188';
  }

  async generateAudio(prompt: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
    const workflowId = params.workflow || 'default';
    let workflow;

    if (workflowId === 'xtts_workflow') {
      workflow = this.loadXTTSWorkflow(prompt);
    } else {
      workflow = this.createAudioWorkflow(prompt, params);
    }

    const promptId = await this.submitWorkflow(workflow);
    const audioResult = await this.waitForAudio(promptId);

    const proxyUrl = this.createProxyUrl(audioResult.url, 'audio');
    return { url: proxyUrl, metadata: audioResult.metadata };
  }

  private loadXTTSWorkflow(prompt: string): any {
    const workflow = {
      "1": {
        "inputs": { "audio": ["3", 0] },
        "class_type": "PreViewAudio",
        "_meta": { "title": "PreView Audio" }
      },
      "2": {
        "inputs": {
          "audio": "en_sample.wav",
          "choose audio file to upload": "Audio"
        },
        "class_type": "LoadAudioPath",
        "_meta": { "title": "LoadAudioPath" }
      },
      "3": {
        "inputs": {
          "text": prompt, // Inject ElizaOS text here
          "language": "en",
          "temperature": 0.68,
          "length_penalty": 1,
          "repetition_penalty": 4,
          "top_k": 50,
          "top_p": 0.85,
          "speed": 1.2,
          "audio": ["2", 0]
        },
        "class_type": "XTTS_INFER",
        "_meta": { "title": "XTTS Inference" }
      }
    };
    return workflow;
  }

  private async submitWorkflow(workflow: any): Promise<string> {
    const response = await axios.post(`${this.apiUrl}/prompt`, { prompt: workflow });
    return response.data.prompt_id;
  }

  private async waitForAudio(promptId: string, maxWaitTime: number = 60000): Promise<{ url: string; metadata: any }> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`);
      const output = historyResponse.data[promptId]?.outputs?.['1']?.audio?.[0];

      if (output) {
        const audioUrl = `${this.apiUrl}/view?filename=${output.filename}&type=output`;
        return { url: audioUrl, metadata: output };
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Audio generation timed out');
  }

  private createProxyUrl(internalUrl: string, type: 'image' | 'audio'): string {
    const encodedUrl = encodeURIComponent(internalUrl);
    return `/api/media/comfyui/${type}?url=${encodedUrl}`;
  }

  // Existing methods (generateImage, getQueueStatus, etc.) remain unchanged
}
```

### 3. Update `generateAudio` Action
**File**: `packages/plugin-comfyui/src/actions/generateAudio.ts`
**Purpose**: Ensure the action supports the `xtts_workflow` parameter.
```typescript
import { ComfyUIService } from '../service';
import { IAction, IAgentRuntime, ContentType } from '@elizaos/core';

export const generateAudio: IAction = {
  name: 'GENERATE_AUDIO',
  validator: (context: { text: string; runtime: IAgentRuntime }) => {
    const isConfigured = !!context.runtime.getSetting('COMFYUI_API_URL');
    return !!context.text && isConfigured;
  },
  handler: async (context: { text: string; params?: Record<string, any>; runtime: IAgentRuntime }) => {
    const service = new ComfyUIService();
    try {
      const result = await service.generateAudio(context.text, context.params);
      return {
        content: result.url,
        contentType: ContentType.AUDIO,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Audio generation error:', error);
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  }
};
```

### 4. Enhance Audio Proxy Endpoint
**File**: `packages/server/src/api/media/comfyui.ts`
**Purpose**: Ensure the audio proxy supports streaming and correct content types.
```typescript
import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/audio', async (req, res) => {
  const audioUrl = req.query.url as string;
  const decodedUrl = decodeURIComponent(audioUrl);

  // Security: Validate ComfyUI URL format
  if (!decodedUrl.includes('/view?') || !decodedUrl.includes('filename=')) {
    return res.status(400).json({ error: 'Invalid ComfyUI audio URL format' });
  }

  try {
    const response = await axios.get(decodedUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', response.headers['content-type'] || 'audio/wav');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    response.data.pipe(res);
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy audio' });
  }
});

router.options('/audio', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// Existing image proxy endpoint remains unchanged
export default router;
```

### 5. Update Client-Side Audio Rendering
**File**: `packages/client/src/components/media-content.tsx`
**Purpose**: Ensure audio URLs are rendered correctly with retry logic.
```typescript
import React, { useState, useMemo } from 'react';
import { ContentType } from '@elizaos/core';

const MediaContent: React.FC<{ content: string; contentType: ContentType }> = ({ content, contentType }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isComfyUIAudio = content.includes('/api/media/comfyui/audio');
  const isComfyUIImage = content.includes('/api/media/comfyui/image');

  const handleError = (event: any) => {
    console.error(`${isComfyUIAudio ? 'Audio' : 'Image'} failed to load (attempt ${retryCount + 1}):`, { content, error: event });
    if (retryCount === 0) {
      setRetryCount(1);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    setIsLoading(false);
    setHasError(true);
  };

  const mediaUrl = (isComfyUIAudio || isComfyUIImage) && retryCount > 0
    ? `${content}&cb=${Date.now()}`
    : content;

  if (contentType === ContentType.AUDIO) {
    return (
      <div>
        {isLoading && <div>Loading audio...</div>}
        {hasError && <div>Error loading audio</div>}
        {!hasError && (
          <audio
            controls
            src={mediaUrl}
            onError={handleError}
            onLoadedData={() => setIsLoading(false)}
          />
        )}
      </div>
    );
  }

  // Existing image and other content type rendering
  if (contentType === ContentType.IMAGE) {
    // ... existing image rendering code ...
  }

  return <div>{content}</div>;
};

export default MediaContent;
```

### 6. Update Docker Compose Configuration
**File**: `docker-compose.yml`
**Purpose**: Ensure `en_sample.wav` is accessible in the ComfyUI container.
```yaml
services:
  comfyui:
    image: comfyui-image
    ports:
      - "8188:8188"
    volumes:
      - ./comfyui-data:/comfyui/data  # Mount directory containing en_sample.wav
    networks:
      - eliza-network
    environment:
      - XTTS_MODEL_PATH=/comfyui/data/models/stable-audio-open-1.0.safetensors  # Adjust as needed

  eliza:
    depends_on:
      - comfyui
    environment:
      - COMFYUI_API_URL=http://comfyui:8188
    networks:
      - eliza-network
networks:
  eliza-network:
    driver: bridge
```

### 7. Add Unit Tests
**File**: `packages/plugin-comfyui/__tests__/plugin.test.ts`
**Purpose**: Verify the new audio workflow logic.
```typescript
import { ComfyUIService } from '../src/service';
import { generateAudio } from '../src/actions/generateAudio';

describe('ComfyUI Plugin Audio Generation', () => {
  let service: ComfyUIService;

  beforeEach(() => {
    service = new ComfyUIService();
    process.env.COMFYUI_API_URL = 'http://comfyui:8188';
  });

  it('should generate valid XTTS workflow', () => {
    const workflow = service['loadXTTSWorkflow']('Test prompt');
    expect(workflow['3'].inputs.text).toBe('Test prompt');
    expect(workflow['3'].class_type).toBe('XTTS_INFER');
  });

  it('should register GENERATE_AUDIO action', () => {
    expect(generateAudio.name).toBe('GENERATE_AUDIO');
    expect(generateAudio.validator({ text: 'Test', runtime: { getSetting: () => 'http://comfyui:8188' } })).toBe(true);
  });
});
```

### 8. Add E2E Tests
**File**: `packages/plugin-comfyui/test/e2e.ts`
**Purpose**: Test the full audio generation pipeline.
```typescript
import { IAgentRuntime } from '@elizaos/core';
import { generateAudio } from '../src/actions/generateAudio';

describe('ComfyUI Audio E2E', () => {
  it('should generate audio from text and return proxy URL', async () => {
    const runtime = { /* mock IAgentRuntime with COMFYUI_API_URL */ } as IAgentRuntime;
    const result = await generateAudio.handler({
      text: 'Hello, world!',
      params: { workflow: 'xtts_workflow' },
      runtime
    });
    expect(result.url).toContain('/api/media/comfyui/audio');
    expect(result.metadata).toBeDefined();
  });
});
```

---

## Build and Test Instructions

1. **Apply Changes**: Save the above code to the respective files in the repository.
2. **Build**:
   ```bash
   cd packages/client && bun run build
   cd packages/server && bun run build
   cd packages/plugin-comfyui && bun run build
   elizaos start
   ```
3. **Run Tests**:
   ```bash
   cd packages/plugin-comfyui
   elizaos test
   ```
4. **Manual Testing**:
   - Send a message via the ElizaOS web UI.
   - Verify that an audio player appears with the generated audio, and no text response is shown.
   - Check browser console for errors.
   - Test in a dev container environment (ensure `en_sample.wav` is in `./comfyui-data`).

---

## Troubleshooting Checklist

- **Audio Not Playing**:
  - Verify the proxy URL includes `/api/media/comfyui/audio`.
  - Check browser console for CORS or loading errors.
  - Ensure `en_sample.wav` exists in the ComfyUI container’s `/comfyui/data` directory.
- **Workflow Errors**:
  - Test the workflow JSON directly in the ComfyUI web UI (`http://localhost:8188`).
  - Verify the `XTTS_INFER` model is installed.
- **Client Rendering Issues**:
  - Perform a hard refresh (`Ctrl+Shift+F5`) after building.
  - Confirm the two-stage build process was followed.
- **ComfyUI Unavailable**:
  - Check `COMFYUI_API_URL` is set to `http://comfyui:8188`.
  - Run `curl http://comfyui:8188/queue` to verify ComfyUI is running.

---

## Additional Notes for Cursor

- **Context**: The ElizaOS project uses a plugin-based architecture with a client-server model. The `@elizaos/plugin-comfyui` plugin integrates with ComfyUI for image and audio generation, running in a Docker container. The provided workflow JSON is for text-to-speech using `XTTS_INFER`.
- **Goal**: Ensure all user messages in the web UI trigger audio generation via the ComfyUI workflow, with the audio displayed in an `<audio>` element in the UI.
- **Constraints**:
  - Use relative URLs (`/api/media/comfyui/audio`) for proxying.
  - Maintain CORS headers for browser compatibility.
  - Ensure `en_sample.wav` is accessible in the ComfyUI container.
  - Follow the two-stage build process for client changes.
- **Testing**: Verify the implementation in both local and dev container environments. Test audio playback on mobile and desktop browsers.
- **Fallback**: If audio generation fails, revert to text responses to maintain functionality.

This implementation ensures a robust, container-native solution that integrates seamlessly with ElizaOS’s architecture while meeting the user’s requirement for audio responses.