import type { Plugin } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import { generateAudioAction } from './actions/generateAudio';
import { generateImageAction } from './actions/generateImage';
import { ComfyUIService } from './service';
import { handleImageGeneration } from './models/imageHandler';

const comfyuiPlugin: Plugin = {
    name: '@elizaos/plugin-comfyui',
    description: 'ElizaOS plugin for ComfyUI API integration (image/audio generation)',

    actions: [generateAudioAction, generateImageAction],

    services: [ComfyUIService],

    // Register model handler for image generation
    models: {
        [ModelType.IMAGE]: handleImageGeneration,
    },

    init: async (_config: Record<string, string>, runtime) => {
        // Validate required environment variables
        const apiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL;
        if (!apiUrl) {
            console.warn('COMFYUI_API_URL not set. ComfyUI plugin may not work correctly.');
        }

        console.log('ComfyUI plugin initialized with API URL:', apiUrl || 'not set');
    },
};

export default comfyuiPlugin;
