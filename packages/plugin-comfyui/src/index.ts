import type { Plugin } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import { generateAudioAction } from './actions/generateAudio';
import { generateImageAction } from './actions/generateImage';
import { queueStatusAction } from './actions/queueStatus';
import { interruptGenerationAction } from './actions/interruptGeneration';
import { ComfyUIService } from './service';
import { handleImageGeneration } from './models/imageHandler';

const comfyuiPlugin: Plugin = {
    name: '@elizaos/plugin-comfyui',
    description: 'Enhanced ElizaOS plugin for ComfyUI API integration with full endpoint support, queue management, and universal image display',

    actions: [
        generateImageAction,
        generateAudioAction,
        queueStatusAction,
        interruptGenerationAction
    ],

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
            console.warn('Please set COMFYUI_API_URL to your ComfyUI server URL (e.g., http://localhost:8188)');
        }

        const apiKey = runtime.getSetting('COMFYUI_API_KEY') || process.env.COMFYUI_API_KEY;
        if (apiKey) {
            console.log('ComfyUI plugin initialized with API authentication enabled');
        }

        console.log('✨ ComfyUI plugin initialized successfully!');
        console.log(`🔗 API URL: ${apiUrl || 'not set'}`);
        console.log(`🔑 API Key: ${apiKey ? 'configured' : 'not configured'}`);
        console.log('📋 Available actions:');
        console.log('  • Generate images with enhanced parameters');
        console.log('  • Check queue status and monitor progress');
        console.log('  • Interrupt running generations');
        console.log('  • Generate audio (experimental)');
        console.log('🎨 Universal image display supported for web UI, Discord, and all clients');
    },
};

export default comfyuiPlugin;
