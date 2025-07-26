import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const generateAudioAction: Action = {
    name: 'GENERATE_AUDIO',
    similes: ['CREATE_AUDIO', 'GENERATE_SOUND', 'MAKE_AUDIO', 'GENERATE_MUSIC'],
    description: 'Generates audio using ComfyUI based on a text prompt',

    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Check for audio generation keywords
        const audioKeywords = [
            'generate audio', 'create audio', 'generate sound', 'create sound',
            'generate music', 'create music', 'make audio', 'make sound', 'make music'
        ];

        return audioKeywords.some(keyword => text.includes(keyword));
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: { [key: string]: unknown }
    ): Promise<ActionResult | void | undefined> => {
        try {
            const text = message.content?.text || '';

            // Extract prompt from the message
            const promptMatch = text.match(/(?:generate|create|make)\s+(?:audio|sound|music)\s+(?:of\s+)?(.+)/i);
            const prompt = promptMatch ? promptMatch[1].trim() : text;

            if (!prompt) {
                return {
                    text: 'Please provide a description of the audio you want me to generate.',
                    success: true
                };
            }

            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                return {
                    text: 'ComfyUI service is not available. Please check your configuration.',
                    success: false,
                    error: 'ComfyUI service not found'
                };
            }

            // Generate the audio
            const result = await comfyuiService.generateAudio(prompt);

            if (result.url) {
                return {
                    text: `I've generated audio based on your prompt: "${prompt}". The audio has been created successfully.`,
                    success: true,
                    data: {
                        url: result.url,
                        metadata: result.metadata,
                        prompt: prompt
                    }
                };
            } else {
                return {
                    text: `Sorry, I couldn't generate the audio. Please try again.`,
                    success: false,
                    error: 'Audio generation failed'
                };
            }
        } catch (error) {
            return {
                text: `An error occurred while generating the audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
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
                content: { text: 'I\'ve generated audio of ocean waves. The audio has been created successfully.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Create music for a peaceful meditation' }
            },
            {
                name: '{{name2}}',
                content: { text: 'I\'ve generated music for a peaceful meditation. The audio has been created successfully.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Make sound effects for a sci-fi movie' }
            },
            {
                name: '{{name2}}',
                content: { text: 'I\'ve generated sound effects for a sci-fi movie. The audio has been created successfully.' }
            }
        ]
    ]
};
