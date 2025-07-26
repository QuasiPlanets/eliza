import axios from 'axios';
import { Service, type IAgentRuntime, type Media, ContentType } from '@elizaos/core';

interface ComfyUIQueueStatus {
    queue_running: any[];
    queue_pending: any[];
}



interface ComfyUIImageResult {
    url: string;
    base64?: string;
    filename: string;
    metadata: any;
    media?: Media;
}

export class ComfyUIService extends Service {
    static serviceType = 'comfyui';
    capabilityDescription = 'ComfyUI API integration for image and audio generation with full endpoint support';

    private apiUrl: string;
    private apiKey?: string;

    constructor(runtime: IAgentRuntime) {
        super(runtime);
        this.apiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL || 'http://comfyui:8188';
        this.apiKey = runtime.getSetting('COMFYUI_API_KEY') || process.env.COMFYUI_API_KEY;
    }

    static async start(runtime: IAgentRuntime): Promise<ComfyUIService> {
        return new ComfyUIService(runtime);
    }

    async stop(): Promise<void> {
        // Cleanup if needed
    }

    /**
     * Get queue status from ComfyUI
     */
    async getQueueStatus(): Promise<ComfyUIQueueStatus> {
        try {
            const response = await axios.get(`${this.apiUrl}/queue`, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to get queue status:', error);
            throw new Error(`Failed to get queue status: ${error.message}`);
        }
    }

    /**
     * Get execution history from ComfyUI
     */
    async getHistory(promptId?: string): Promise<any> {
        try {
            const url = promptId ? `${this.apiUrl}/history/${promptId}` : `${this.apiUrl}/history`;
            const response = await axios.get(url, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to get history:', error);
            throw new Error(`Failed to get history: ${error.message}`);
        }
    }

    /**
     * Interrupt current execution
     */
    async interruptExecution(): Promise<void> {
        try {
            await axios.post(`${this.apiUrl}/interrupt`, {}, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });
        } catch (error: any) {
            console.error('Failed to interrupt execution:', error);
            throw new Error(`Failed to interrupt execution: ${error.message}`);
        }
    }

    /**
     * Upload image to ComfyUI
     */
    async uploadImage(imageData: Buffer, filename: string): Promise<string> {
        try {
            const formData = new FormData();
            const blob = new Blob([imageData]);
            formData.append('image', blob, filename);

            const response = await axios.post(`${this.apiUrl}/upload/image`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
                },
            });

            return response.data.name || filename;
        } catch (error: any) {
            console.error('Failed to upload image:', error);
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    /**
     * Fetch image from ComfyUI and convert to base64 for universal access
     */
    private async fetchImageAsBase64(imageUrl: string): Promise<string> {
        try {
            console.log(`[ComfyUI] Fetching image from: ${imageUrl}`);

            // Convert localhost URL back to internal URL for fetching
            const internalUrl = this.convertToInternalUrl(imageUrl);
            console.log(`[ComfyUI] Using internal URL for fetch: ${internalUrl}`);

            const response = await axios.get(internalUrl, {
                responseType: 'arraybuffer',
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
                timeout: 30000
            });

            const buffer = Buffer.from(response.data);
            const base64 = buffer.toString('base64');
            const mimeType = response.headers['content-type'] || 'image/png';

            console.log(`[ComfyUI] Successfully converted image to base64 (${base64.length} chars)`);
            return `data:${mimeType};base64,${base64}`;
        } catch (error: any) {
            console.error('Failed to fetch image:', error);
            throw new Error(`Failed to fetch image: ${error.message}`);
        }
    }

    /**
     * Generate image with enhanced response handling
     */
    async generateImage(prompt: string, params: Record<string, any> = {}): Promise<ComfyUIImageResult> {
        try {
            // Create a workflow for image generation
            const workflow = this.createImageWorkflow(prompt, params);

            // Submit the workflow to ComfyUI
            const response = await axios.post(`${this.apiUrl}/prompt`, {
                prompt: workflow
            }, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });

            if (!response.data || !response.data.prompt_id) {
                throw new Error('Invalid response from ComfyUI API');
            }

            const promptId = response.data.prompt_id;
            console.log(`ComfyUI workflow submitted with prompt ID: ${promptId}`);

            // Wait for the image to be generated
            const imageInfo = await this.waitForImage(promptId);

            // Fetch the image and convert to base64 for universal access
            console.log(`[ComfyUI] Fetching image from: ${imageInfo.url}`);
            const base64Image = await this.fetchImageAsBase64(imageInfo.url);
            console.log(`[ComfyUI] Base64 conversion successful: ${base64Image.substring(0, 50)}...`);

            // Create Media object for ElizaOS
            const media: Media = {
                id: `comfyui-${promptId}-${Date.now()}`,
                url: base64Image, // Use base64 data URL for universal access
                title: `Generated image: ${prompt.substring(0, 50)}...`,
                source: 'comfyui',
                contentType: ContentType.IMAGE,
                description: prompt,
            };

            return {
                url: imageInfo.url, // Original ComfyUI URL
                base64: base64Image, // Base64 for universal access
                filename: imageInfo.filename,
                metadata: {
                    promptId,
                    prompt,
                    params,
                    comfyui_url: imageInfo.url,
                    generated_at: new Date().toISOString()
                },
                media: media
            };
        } catch (err: any) {
            throw new Error(`ComfyUI image generation failed: ${err.message}`);
        }
    }

    async generateAudio(_prompt: string, _params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        // TODO: Implement audio generation workflow
        throw new Error('Audio generation not yet implemented');
    }

    private createImageWorkflow(prompt: string, params: Record<string, any> = {}): any {
        const seed = params.seed || Math.floor(Math.random() * 1000000);
        const steps = params.steps || 35;
        const cfg = params.cfg || 1.0;
        const width = params.width || 1024;
        const height = params.height || 1024;
        const model = params.model || "flux1-dev-fp8.safetensors";

        return {
            "6": {
                "inputs": {
                    "text": prompt,
                    "clip": ["30", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["31", 0],
                    "vae": ["30", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ElizaOS",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "27": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptySD3LatentImage"
            },
            "30": {
                "inputs": {
                    "ckpt_name": model
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "31": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "denoise": 1.0,
                    "model": ["30", 0],
                    "positive": ["35", 0],
                    "negative": ["33", 0],
                    "latent_image": ["27", 0]
                },
                "class_type": "KSampler"
            },
            "33": {
                "inputs": {
                    "text": params.negative_prompt || "",
                    "clip": ["30", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "35": {
                "inputs": {
                    "guidance": params.guidance || 3.5,
                    "conditioning": ["6", 0]
                },
                "class_type": "FluxGuidance"
            }
        };
    }

    private async waitForImage(promptId: string, maxWaitTime: number = 300000): Promise<{ url: string; filename: string }> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check history for the completed image
                const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`, {
                    headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
                });
                const history = historyResponse.data;

                if (history[promptId] && history[promptId].outputs) {
                    const outputs = history[promptId].outputs;
                    const nodeOutput = outputs['9']; // SaveImage node

                    if (nodeOutput && nodeOutput.images && nodeOutput.images.length > 0) {
                        const image = nodeOutput.images[0];

                        // Convert internal Docker URLs to localhost for universal access
                        const internalImageUrl = `${this.apiUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;
                        const localhostImageUrl = this.convertToLocalhostUrl(internalImageUrl);

                        console.log(`[ComfyUI] Internal URL: ${internalImageUrl}`);
                        console.log(`[ComfyUI] Localhost URL: ${localhostImageUrl}`);

                        return {
                            url: localhostImageUrl,
                            filename: image.filename
                        };
                    }
                }

                // Check if the job failed
                if (history[promptId] && history[promptId].status) {
                    const status = history[promptId].status;
                    if (status.status_str === 'error') {
                        throw new Error('ComfyUI workflow execution failed');
                    }
                }

                // Wait a bit before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.warn('Error checking image status:', error);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('Image generation timed out');
    }

    /**
     * Convert internal Docker URLs to localhost for universal access
     */
    private convertToLocalhostUrl(url: string): string {
        // Replace internal Docker IP addresses with localhost
        // This handles cases like 172.19.0.4:8188 -> 127.0.0.1:8188
        return url.replace(/https?:\/\/172\.\d+\.\d+\.\d+:\d+/, 'http://127.0.0.1:8188');
    }

    /**
     * Convert localhost URLs back to internal Docker URLs for fetching
     */
    private convertToInternalUrl(url: string): string {
        // Convert localhost URLs back to internal Docker URLs for fetching
        // This handles cases like 127.0.0.1:8188 -> 172.19.0.4:8188
        return url.replace(/https?:\/\/127\.0\.0\.1:8188/, this.apiUrl);
    }

    /**
     * Get available ComfyUI nodes/models
     */
    async getObjectInfo(): Promise<any> {
        try {
            const response = await axios.get(`${this.apiUrl}/object_info`, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });
            return response.data;
        } catch (error: any) {
            console.error('Failed to get object info:', error);
            throw new Error(`Failed to get object info: ${error.message}`);
        }
    }
}
