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
    // Remove bootstrap dependency to avoid loading order issues
    dependencies: [],

    actions: [
        // Don't include generateImageAction here since we manually register it in init
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
        // Log current actions for debugging
        console.log(`🔍 Current actions before ComfyUI plugin init: ${runtime.actions.map(a => a.name).join(', ')}`);

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

        // Defer the action replacement to ensure it happens after all plugins are loaded
        setTimeout(() => {
            console.log(`🔍 Final actions before ComfyUI override: ${runtime.actions.map(a => a.name).join(', ')}`);

            // Force-replace any existing GENERATE_IMAGE action 
            const existingActionIndex = runtime.actions.findIndex(action => action.name === 'GENERATE_IMAGE');
            if (existingActionIndex !== -1) {
                console.log('🔄 Force-replacing existing GENERATE_IMAGE action with enhanced ComfyUI version');
                runtime.actions.splice(existingActionIndex, 1);
                console.log(`✅ Removed existing GENERATE_IMAGE action at index ${existingActionIndex}`);
            } else {
                console.log('ℹ️ No existing GENERATE_IMAGE action found to remove');
            }

            // Manually register the ComfyUI GENERATE_IMAGE action to ensure it's the final one
            runtime.actions.push(generateImageAction);
            console.log('✅ Manually registered ComfyUI GENERATE_IMAGE action (final override)');
            console.log(`🔍 Final actions after ComfyUI override: ${runtime.actions.map(a => a.name).join(', ')}`);
        }, 100); // Short delay to ensure all plugins are loaded

        console.log('✨ ComfyUI plugin initialized successfully!');
        console.log(`🔗 API URL: ${apiUrl || 'not set'}`);
        console.log(`🔑 API Key: ${apiKey ? 'configured' : 'not configured'}`);
        console.log('📋 Available actions:');
        console.log('  • Generate images with enhanced parameters and base64 conversion');
        console.log('  • Check queue status and monitor progress');
        console.log('  • Interrupt running generations');
        console.log('  • Generate audio (experimental)');
        console.log('🎨 Universal image display supported for web UI, Discord, and all clients');
    },
};

export default comfyuiPlugin;
