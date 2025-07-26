import type { Handler, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

const generateImage: Handler = async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown }
) => {
    // Extract prompt from message content
    const prompt = message.content?.text;
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('Missing or invalid prompt for image generation');
    }
    const service = new ComfyUIService(runtime);
    const { url, metadata } = await service.generateImage(prompt);
    // Build memory object
    const memory: Memory = {
        entityId: message.entityId,
        agentId: runtime.agentId,
        roomId: message.roomId,
        content: {
            text: prompt,
            imageUrl: url,
            ...metadata,
        },
        metadata: {
            type: 'media',
            subtype: 'image',
            url,
            prompt,
            timestamp: Date.now(),
        },
    };
    await runtime.createMemory(memory, 'memories');
    const result: ActionResult = {
        text: url,
        data: { url, metadata },
        success: true,
    };
    return result;
};

export default generateImage;
