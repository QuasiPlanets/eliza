import axios from 'axios';
import type { IAgentRuntime } from '@elizaos/core';

export class ComfyUIService {
    private apiUrl: string;
    private apiKey?: string;

    constructor(runtime: IAgentRuntime) {
        this.apiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL || 'http://comfyui:8188';
        this.apiKey = runtime.getSetting('COMFYUI_API_KEY') || process.env.COMFYUI_API_KEY;
    }

    async generateImage(prompt: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        try {
            const res = await axios.post(
                `${this.apiUrl}/api/generate/image`,
                { prompt, ...params },
                this.apiKey ? { headers: { 'Authorization': `Bearer ${this.apiKey}` } } : undefined
            );
            if (!res.data || !res.data.url) throw new Error('No image URL returned');
            return { url: res.data.url, metadata: res.data };
        } catch (err: any) {
            throw new Error(`ComfyUI image generation failed: ${err.message}`);
        }
    }

    async generateAudio(prompt: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        try {
            const res = await axios.post(
                `${this.apiUrl}/api/generate/audio`,
                { prompt, ...params },
                this.apiKey ? { headers: { 'Authorization': `Bearer ${this.apiKey}` } } : undefined
            );
            if (!res.data || !res.data.url) throw new Error('No audio URL returned');
            return { url: res.data.url, metadata: res.data };
        } catch (err: any) {
            throw new Error(`ComfyUI audio generation failed: ${err.message}`);
        }
    }
}
