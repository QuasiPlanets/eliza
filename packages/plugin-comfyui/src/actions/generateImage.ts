import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const generateImageAction: Action = {
    name: 'GENERATE_IMAGE',
    similes: ['CREATE_IMAGE', 'DRAW_IMAGE', 'MAKE_IMAGE', 'GENERATE_PICTURE', 'DRAW_PICTURE'],
    description: 'Generates an image using ComfyUI based on a text prompt with enhanced parameters support',
    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
        const text = message.content.text?.toLowerCase() || '';

        // Check for image generation keywords
        const imageKeywords = [
            'generate image', 'create image', 'draw', 'picture', 'photo', 'image of',
            'generate picture', 'create picture', 'make an image', 'make a picture',
            'draw an image', 'draw a picture', 'generate art', 'create art'
        ];

        return imageKeywords.some(keyword => text.includes(keyword));
    },
    handler: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<ActionResult> => {
        try {
            const text = message.content.text || '';

            // Extract the image prompt from the message
            const promptMatch = text.match(/(?:generate|create|make|draw)\s+(?:an?\s+)?(?:image|picture|photo|art)\s+(?:of\s+)?(.+)/i);

            if (!promptMatch) {
                return {
                    success: false,
                    text: 'Please provide a description of the image you want me to generate.',
                    error: 'No image prompt found in message'
                };
            }

            const prompt = promptMatch[1].trim();

            // Extract additional parameters from the message
            const params: Record<string, any> = {};

            // Extract dimensions if specified
            const dimensionMatch = text.match(/(\d+)x(\d+)/i);
            if (dimensionMatch) {
                params.width = parseInt(dimensionMatch[1]);
                params.height = parseInt(dimensionMatch[2]);
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
                return {
                    success: false,
                    text: 'ComfyUI service is not available. Please check your configuration.',
                    error: 'ComfyUI service not found'
                };
            }

            // Generate the image with enhanced result
            const result = await comfyuiService.generateImage(prompt, params);

            return {
                success: true,
                text: `I've generated an image based on your prompt: "${prompt}". ${params.width && params.height ? `Dimensions: ${params.width}x${params.height}. ` : ''}The image has been created successfully and should be displayed above.`,
                data: {
                    imageUrl: result.base64, // Base64 data URL for universal access
                    originalUrl: result.url, // Original ComfyUI URL
                    prompt: prompt,
                    parameters: params,
                    metadata: result.metadata,
                    filename: result.filename,
                    attachments: result.media ? [result.media] : [], // Include media in data
                    media: result.media // Also include as media for compatibility
                }
            };

        } catch (error: any) {
            console.error('Error in generateImageAction:', error);

            // Provide more specific error messages
            let errorMessage = 'Sorry, I couldn\'t generate the image. ';
            if (error.message.includes('timed out')) {
                errorMessage += 'The image generation took too long. Please try again.';
            } else if (error.message.includes('ComfyUI service')) {
                errorMessage += 'ComfyUI service is not available. Please check the configuration.';
            } else if (error.message.includes('workflow')) {
                errorMessage += 'There was an issue with the image generation workflow.';
            } else {
                errorMessage += 'Please try again with a different prompt.';
            }

            return {
                success: false,
                text: errorMessage,
                error: `Image generation failed: ${error.message}`
            };
        }
    },
    examples: [
        [
            {
                name: '{{name1}}',
                content: { text: 'Generate an image of a beautiful sunset over the ocean' }
            },
            {
                name: 'Eliza',
                content: {
                    text: 'I\'ve generated an image of a beautiful sunset over the ocean. The image has been created successfully and should be displayed above.',
                    attachments: []
                }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Create a 1024x1024 picture of a cute cat playing with yarn' }
            },
            {
                name: 'Eliza',
                content: {
                    text: 'I\'ve generated an image of a cute cat playing with yarn. Dimensions: 1024x1024. The image has been created successfully and should be displayed above.',
                    attachments: []
                }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Draw a futuristic cityscape at night, avoid: cars, people' }
            },
            {
                name: 'Eliza',
                content: {
                    text: 'I\'ve generated an image of a futuristic cityscape at night. The image has been created successfully and should be displayed above.',
                    attachments: []
                }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Generate realistic art of a mountain landscape' }
            },
            {
                name: 'Eliza',
                content: {
                    text: 'I\'ve generated a realistic image of a mountain landscape. The image has been created successfully and should be displayed above.',
                    attachments: []
                }
            }
        ]
    ]
};
