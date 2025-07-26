import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const generateAudioAction: Action = {
    name: 'GENERATE_AUDIO',
    similes: ['CREATE_AUDIO', 'GENERATE_SOUND', 'MAKE_AUDIO', 'GENERATE_MUSIC', 'CREATE_MUSIC'],
    description: 'Generates audio using ComfyUI based on a text prompt (experimental feature)',

    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Check for audio generation keywords
        const audioKeywords = [
            'generate audio', 'create audio', 'generate sound', 'create sound',
            'generate music', 'create music', 'make audio', 'make sound', 'make music',
            'compose music', 'create song', 'generate song'
        ];

        return audioKeywords.some(keyword => text.includes(keyword));
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: { [key: string]: unknown }
    ): Promise<ActionResult> => {
        try {
            const text = message.content?.text || '';

            // Extract prompt from the message
            const promptMatch = text.match(/(?:generate|create|make|compose)\s+(?:audio|sound|music|song)\s+(?:of\s+)?(.+)/i);
            const prompt = promptMatch ? promptMatch[1].trim() : text;

            if (!prompt) {
                return {
                    success: false,
                    text: 'Please provide a description of the audio you want me to generate.',
                    error: 'No audio prompt found in message'
                };
            }

            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                return {
                    success: false,
                    text: 'ComfyUI service is not available. Please check your configuration.',
                    error: 'ComfyUI service not found'
                };
            }

            // Check if audio generation is implemented
            try {
                const result = await comfyuiService.generateAudio(prompt);

                return {
                    success: true,
                    text: `I've generated audio based on your prompt: "${prompt}". The audio has been created successfully.`,
                    data: {
                        audioUrl: result.url,
                        prompt: prompt,
                        metadata: result.metadata
                    }
                };
            } catch (error: any) {
                if (error.message.includes('not yet implemented')) {
                    return {
                        success: false,
                        text: `Audio generation is not yet implemented in the ComfyUI plugin. Currently, I can only generate images. Please try asking me to generate an image instead.`,
                        error: 'Audio generation feature not implemented'
                    };
                }
                throw error; // Re-throw other errors to be handled by outer catch
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

            return {
                success: false,
                text: errorMessage,
                error: `Audio generation failed: ${error.message}`
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
                content: { text: 'Audio generation is not yet implemented in the ComfyUI plugin. Currently, I can only generate images. Please try asking me to generate an image instead.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Create music for a peaceful meditation' }
            },
            {
                name: '{{name2}}',
                content: { text: 'Audio generation is not yet implemented in the ComfyUI plugin. Currently, I can only generate images. Please try asking me to generate an image instead.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Make sound effects for a sci-fi movie' }
            },
            {
                name: '{{name2}}',
                content: { text: 'Audio generation is not yet implemented in the ComfyUI plugin. Currently, I can only generate images. Please try asking me to generate an image instead.' }
            }
        ]
    ]
};
