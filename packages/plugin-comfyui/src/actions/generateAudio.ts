import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { ContentType } from '@elizaos/core';
import { ComfyUIService } from '../service';
import { v4 } from 'uuid';

export const generateAudioAction: Action = {
    name: 'GENERATE_AUDIO',
    similes: ['CREATE_AUDIO', 'GENERATE_SOUND', 'MAKE_AUDIO', 'GENERATE_MUSIC', 'CREATE_MUSIC'],
    description: 'Generates audio using ComfyUI based on a text prompt (experimental feature)',

    validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Only proceed if ComfyUI is configured
        const comfyuiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL;
        if (!comfyuiUrl?.trim()) {
            console.log(`[ComfyUI Audio] Validation failed: No COMFYUI_API_URL configured`);
            return false;
        }

        // Check for audio generation keywords
        const audioKeywords = [
            'generate audio', 'create audio', 'generate sound', 'create sound',
            'generate music', 'create music', 'make audio', 'make sound', 'make music',
            'compose music', 'create song', 'generate song'
        ];

        const hasAudioKeyword = audioKeywords.some(keyword => text.includes(keyword));
        console.log(`[ComfyUI Audio] Validation - Text: "${text}"`);
        console.log(`[ComfyUI Audio] Validation - Has audio keyword: ${hasAudioKeyword}`);
        console.log(`[ComfyUI Audio] Validation - ComfyUI URL: ${comfyuiUrl}`);
        console.log(`[ComfyUI Audio] Validation - Result: ${hasAudioKeyword}`);

        return hasAudioKeyword;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: any,
        callback?: HandlerCallback
    ): Promise<void> => {
        try {
            const text = message.content?.text || '';

            // Extract prompt from the message
            const promptMatch = text.match(/(?:generate|create|make|compose)\s+(?:audio|sound|music|song)\s+(?:of\s+)?(.+)/i);
            const prompt = promptMatch ? promptMatch[1].trim() : text;

            if (!prompt) {
                if (callback) {
                    await callback({
                        text: 'Please provide a description of the audio you want me to generate.',
                        thought: 'No valid audio prompt found in the user message.'
                    });
                }
                return;
            }

            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                if (callback) {
                    await callback({
                        text: 'ComfyUI service is not available. Please check your configuration.',
                        thought: 'ComfyUI service is not registered with the runtime.'
                    });
                }
                return;
            }

            // Send initial response
            if (callback) {
                await callback({
                    text: `I'm generating audio based on your prompt: "${prompt}". This will take 2-3 minutes with the Stable Audio model. Please wait...`,
                    thought: `Starting ComfyUI audio generation with prompt: "${prompt}". Using Stable Audio model which requires extended processing time.`,
                    actions: ['GENERATE_AUDIO']
                });
            }

            // Generate the audio
            const result = await comfyuiService.generateAudio(prompt);

            console.log(`[ComfyUI Action] Audio generated and accessible via proxy: ${result.url}`);

            // Send the response with the generated audio
            if (callback) {
                await callback({
                    text: `I've generated audio based on your prompt: "${prompt}". The audio has been created successfully.`,
                    attachments: [{
                        id: v4(),
                        url: result.url, // Use proxy URL for universal access
                        title: `Generated Audio: ${prompt.substring(0, 50)}...`,
                        contentType: ContentType.AUDIO,
                        description: prompt
                    }],
                    thought: `Successfully generated audio using ComfyUI with prompt: "${prompt}"`,
                    actions: ['GENERATE_AUDIO']
                });
            }

        } catch (error: any) {
            console.error('Error in generateAudioAction:', error);

            // Provide specific error messages
            let errorMessage = 'Sorry, I couldn\'t generate the audio. ';
            if (error.message.includes('ComfyUI service')) {
                errorMessage += 'ComfyUI service is not available. Please check the configuration.';
            } else if (error.message.includes('workflow')) {
                errorMessage += 'There was an issue with the audio generation workflow.';
            } else {
                errorMessage += 'Please try again with a different prompt.';
            }

            if (callback) {
                await callback({
                    text: errorMessage,
                    thought: `ComfyUI audio generation failed: ${error.message || 'Unknown error'}`
                });
            }
        }
    },

    examples: [
        [
            {
                name: '{{name1}}',
                content: { text: 'Generate audio of ocean waves' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm generating audio of ocean waves for you. This will take 2-3 minutes with the Stable Audio model. Please wait..." }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Create music for a peaceful meditation' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm generating peaceful meditation music for you. This will take 2-3 minutes with the Stable Audio model. Please wait..." }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Make sound effects for a sci-fi movie' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm generating sci-fi movie sound effects for you. This will take 2-3 minutes with the Stable Audio model. Please wait..." }
            }
        ]
    ]
};
