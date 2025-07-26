import type { IAgentRuntime, ImageGenerationParams } from '@elizaos/core';
import { ComfyUIService } from '../service';

/**
 * Model handler for ModelType.IMAGE that uses ComfyUI for image generation
 */
export async function handleImageGeneration(
    runtime: IAgentRuntime,
    params: ImageGenerationParams
): Promise<{ url: string }[]> {
    const { prompt, ...otherParams } = params;
    
    if (!prompt) {
        throw new Error('Image generation requires a prompt');
    }
    
    // Get the ComfyUI service
    const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
    if (!comfyuiService) {
        throw new Error('ComfyUI service is not available');
    }
    
    try {
        // Generate the image using ComfyUI
        const result = await comfyuiService.generateImage(prompt, otherParams);
        
        // Return in the format expected by ModelResultMap[ModelType.IMAGE]
        return [{ url: result.url }];
    } catch (error) {
        console.error('ComfyUI image generation failed:', error);
        throw new Error(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 