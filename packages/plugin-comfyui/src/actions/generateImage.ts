import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { ContentType } from '@elizaos/core';
import { ComfyUIService } from '../service';
import { v4 } from 'uuid';

export const generateImageAction: Action = {
    name: 'GENERATE_IMAGE',
    similes: ['CREATE_IMAGE', 'DRAW_IMAGE', 'MAKE_IMAGE', 'GENERATE_PICTURE', 'DRAW_PICTURE'],
    description: 'Generates an image using ComfyUI based on a text prompt with enhanced parameters support',
    validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
        const text = message.content.text?.toLowerCase() || '';

        // Only proceed if ComfyUI is configured
        const comfyuiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL;
        if (!comfyuiUrl?.trim()) {
            console.log(`[ComfyUI] Validation failed: No COMFYUI_API_URL configured`);
            return false;
        }

        // Check for image generation keywords
        const imageKeywords = [
            'generate image', 'generate an image', 'create image', 'create an image',
            'draw image', 'draw an image', 'make image', 'make an image',
            'generate picture', 'generate a picture', 'create picture', 'create a picture',
            'draw picture', 'draw a picture', 'make picture', 'make a picture',
            'generate art', 'generate some art', 'create art', 'create some art',
            'draw art', 'draw some art', 'make art', 'make some art'
        ];

        const hasImageKeyword = imageKeywords.some(keyword => text.includes(keyword));
        console.log(`[ComfyUI] Validation - Text: "${text}"`);
        console.log(`[ComfyUI] Validation - Has image keyword: ${hasImageKeyword}`);
        console.log(`[ComfyUI] Validation - ComfyUI URL: ${comfyuiUrl}`);
        console.log(`[ComfyUI] Validation - Result: ${hasImageKeyword}`);

        return hasImageKeyword;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: any,
        callback?: HandlerCallback
    ): Promise<void> => {
        try {
            const text = message.content.text || '';

            // Extract the image prompt from the message
            const promptMatch = text.match(/(?:generate|create|make|draw)\s+(?:an?\s+)?(?:image|picture|photo|art)\s+(?:of\s+)?(.+)/i);

            if (!promptMatch) {
                if (callback) {
                    await callback({
                        text: 'Please provide a description of the image you want me to generate.',
                        thought: 'No valid image prompt found in the user message.'
                    });
                }
                return;
            }

            const prompt = promptMatch[1].trim();

            // Extract additional parameters from the message
            const params: Record<string, any> = {};

            // Extract dimensions if specified
            const dimensionMatch = text.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
            if (dimensionMatch) {
                params.width = parseInt(dimensionMatch[1]);
                params.height = parseInt(dimensionMatch[2]);
            } else {
                params.width = 1024;
                params.height = 1024;
            }

            // Extract style/model preferences
            if (text.includes('realistic') || text.includes('photorealistic')) {
                params.model = 'flux1-dev-fp8.safetensors';
                params.guidance = 7.5;
            } else if (text.includes('artistic') || text.includes('stylized')) {
                params.guidance = 3.5;
            }

            // Extract negative prompt if specified
            const negativeMatch = text.match(/(?:avoid|not|without|negative):\s*([^,.\n]+)/i);
            if (negativeMatch) {
                params.negative_prompt = negativeMatch[1].trim();
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
                    text: `I'm generating an image based on your prompt: "${prompt}". This will take 2-3 minutes with the Flux model. Please wait...`,
                    thought: `Starting ComfyUI image generation with prompt: "${prompt}". Using Flux model which requires extended processing time.`,
                    actions: ['GENERATE_IMAGE']
                });
            }

            // Generate the image with enhanced result
            const result = await comfyuiService.generateImage(prompt, params);

            console.log(`[ComfyUI Action] Image generated and accessible via proxy: ${result.url}`);

            // Send the response with the generated image
            if (callback) {
                await callback({
                    text: `I've generated an image based on your prompt: "${prompt}". ${params.width && params.height ? `Dimensions: ${params.width}x${params.height}.` : ''}`,
                    attachments: [{
                        id: v4(),
                        url: result.url, // Use proxy URL for universal access
                        title: `Generated Image: ${prompt.substring(0, 50)}...`,
                        contentType: ContentType.IMAGE,
                        description: prompt
                    }],
                    thought: `Successfully generated image using ComfyUI with prompt: "${prompt}"`,
                    actions: ['GENERATE_IMAGE']
                });
            }

        } catch (error: any) {
            console.error('ComfyUI image generation error:', error);
            if (callback) {
                await callback({
                    text: 'Sorry, I encountered an error while generating the image. Please try again later.',
                    thought: `ComfyUI image generation failed: ${error.message || 'Unknown error'}`
                });
            }
        }
    },

    examples: [
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Can you generate an image of a beautiful sunset over mountains?',
                },
            },
            {
                name: '{{name2}}',
                content: {
                    text: "I'll create a beautiful sunset image for you. Please wait while I generate it...",
                    actions: ['GENERATE_IMAGE'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Create an image of a futuristic city with flying cars',
                },
            },
            {
                name: '{{name2}}',
                content: {
                    text: 'Creating a futuristic cityscape with flying cars for you. This will take a few minutes...',
                    actions: ['GENERATE_IMAGE'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Draw me a picture of a cute cat sitting in a garden',
                },
            },
            {
                name: '{{name2}}',
                content: {
                    text: "I'll draw a cute cat in a garden setting for you. Please wait while I create this image...",
                    actions: ['GENERATE_IMAGE'],
                },
            },
        ],
    ] as any,
};
