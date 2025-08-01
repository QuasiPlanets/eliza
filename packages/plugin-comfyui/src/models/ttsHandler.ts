import type { IAgentRuntime } from '@elizaos/core';
import { ComfyUIService } from '../service';

/**
 * Model handler for ModelType.TEXT_TO_SPEECH that uses ComfyUI for TTS generation
 */
export async function handleTTSGeneration(
    runtime: IAgentRuntime,
    params: string | Record<string, any>
): Promise<Buffer> {
    const comfyuiService = runtime.getService<ComfyUIService>('comfyui');

    if (!comfyuiService) {
        throw new Error('ComfyUI service not available');
    }

    // Extract text from params
    const text = typeof params === 'string' ? params : params.text || params.prompt || '';

    if (!text) {
        throw new Error('No text provided for TTS generation');
    }

    try {
        // Generate TTS using ComfyUI XTTS workflow
        const result = await comfyuiService.generateTTS(text);

        // Use the proxy URL directly instead of trying to fetch from ComfyUI
        const proxyUrl = result.url;
        console.log(`[TTS Handler] Using proxy URL: ${proxyUrl}`);
        
        // The proxy URL is already a browser-accessible URL
        // We need to construct the full URL for the ElizaOS server
        const baseUrl = 'http://localhost:3000'; // ElizaOS server URL
        const fullUrl = `${baseUrl}${proxyUrl}`;
        console.log(`[TTS Handler] Full proxy URL: ${fullUrl}`);

        // Fetch the audio file from the proxy endpoint
        const response = await fetch(fullUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch TTS audio from proxy: ${response.status} ${response.statusText}`);
        }

        // Convert to Buffer
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);

    } catch (error) {
        console.error('Error in TTS model handler:', error);
        throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
} 