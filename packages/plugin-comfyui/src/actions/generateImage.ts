import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const generateImageAction: Action = {
    name: 'GENERATE_IMAGE',
    similes: ['CREATE_IMAGE', 'DRAW_IMAGE', 'MAKE_IMAGE', 'GENERATE_PICTURE'],
    description: 'Generates an image using ComfyUI based on a text prompt',
    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State) => {
        const text = message.content.text?.toLowerCase() || '';
        
        // Check for image generation keywords
        const imageKeywords = [
            'generate image', 'create image', 'draw', 'picture', 'photo', 'image of',
            'generate picture', 'create picture', 'make an image', 'make a picture'
        ];
        
        return imageKeywords.some(keyword => text.includes(keyword));
    },
    handler: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<ActionResult> => {
        try {
            const text = message.content.text || '';
            
            // Extract the image prompt from the message
            const promptMatch = text.match(/(?:generate|create|make|draw)\s+(?:an?\s+)?(?:image|picture|photo)\s+(?:of\s+)?(.+)/i);
            
            if (!promptMatch) {
                return {
                    success: false,
                    text: 'Please provide a description of the image you want me to generate.',
                    error: 'No image prompt found in message'
                };
            }
            
            const prompt = promptMatch[1].trim();
            
            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                return {
                    success: false,
                    text: 'ComfyUI service is not available.',
                    error: 'ComfyUI service not found'
                };
            }
            
            // Generate the image
            const result = await comfyuiService.generateImage(prompt);
            
            return {
                success: true,
                text: `I've generated an image based on your prompt: "${prompt}". The image has been created successfully.`,
                data: {
                    imageUrl: result.url,
                    prompt: prompt,
                    metadata: result.metadata
                }
            };
            
        } catch (error) {
            console.error('Error in generateImageAction:', error);
            
            return {
                success: false,
                text: `Sorry, I couldn't generate the image. Please try again.`,
                error: 'Image generation failed'
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
                content: { text: 'I\'ve generated an image of a beautiful sunset over the ocean. The image has been created successfully.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Create a picture of a cute cat playing with yarn' }
            },
            {
                name: 'Eliza',
                content: { text: 'I\'ve generated an image of a cute cat playing with yarn. The image has been created successfully.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Draw a futuristic cityscape at night' }
            },
            {
                name: 'Eliza',
                content: { text: 'I\'ve generated an image of a futuristic cityscape at night. The image has been created successfully.' }
            }
        ]
    ]
};
