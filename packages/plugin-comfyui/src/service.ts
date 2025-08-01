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

            console.log(`[ComfyUI] Image generated and available via proxy: ${imageInfo.url}`);

            // Create Media object for ElizaOS using the proxy URL
            const media: Media = {
                id: `comfyui-${promptId}-${Date.now()}`,
                url: imageInfo.url, // Use proxy URL for universal access
                title: `Generated image: ${prompt.substring(0, 50)}...`,
                source: 'comfyui',
                contentType: ContentType.IMAGE,
                description: prompt,
            };

            return {
                url: imageInfo.url, // Proxy URL for web UI access
                filename: imageInfo.filename,
                metadata: {
                    promptId,
                    prompt,
                    params,
                    generated_at: new Date().toISOString()
                },
                media: media
            };
        } catch (err: any) {
            throw new Error(`ComfyUI image generation failed: ${err.message}`);
        }
    }

    async generateAudio(prompt: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        try {
            // Create a workflow for audio generation
            const workflow = this.createAudioWorkflow(prompt, params);

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
            console.log(`ComfyUI audio workflow submitted with prompt ID: ${promptId}`);

            // Wait for the audio to be generated
            const audioInfo = await this.waitForAudio(promptId);

            console.log(`[ComfyUI] Audio generated and available via proxy: ${audioInfo.url}`);

            return {
                url: audioInfo.url, // Proxy URL for web UI access
                metadata: {
                    promptId,
                    prompt,
                    params,
                    filename: audioInfo.filename,
                    generated_at: new Date().toISOString()
                }
            };
        } catch (err: any) {
            throw new Error(`ComfyUI audio generation failed: ${err.message}`);
        }
    }

    async generateTTS(text: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        try {
            // Validate XTTS model availability first
            await this.validateXTTSModel();

            // Create a workflow for XTTS generation with voice cloning
            const workflow = this.createXTTSWorkflow(text, params);

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
            console.log(`ComfyUI XTTS workflow submitted with prompt ID: ${promptId}`);

            // Wait for the XTTS to be generated
            const ttsInfo = await this.waitForTTS(promptId);

            console.log(`[ComfyUI] XTTS generated and available via proxy: ${ttsInfo.url}`);

            return {
                url: ttsInfo.url, // Proxy URL for web UI access
                metadata: {
                    promptId,
                    text,
                    params,
                    filename: ttsInfo.filename,
                    generated_at: new Date().toISOString(),
                    model: 'XTTS',
                    voice_cloning: true,
                    reference_audio: params.reference_audio || 'en_sample.wav'
                }
            };
        } catch (err: any) {
            throw new Error(`ComfyUI XTTS generation failed: ${err.message}`);
        }
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

    private createAudioWorkflow(prompt: string, params: Record<string, any> = {}): any {
        const seed = params.seed || Math.floor(Math.random() * 1000000);
        const steps = params.steps || 50;
        const cfg = params.cfg || 4.98;
        const seconds = params.seconds || 47.6;
        const model = params.model || "stable-audio-open-1.0.safetensors";
        const clipModel = params.clipModel || "t5-base.safetensors";
        const samplerName = params.samplerName || "dpmpp_3m_sde_gpu";
        const scheduler = params.scheduler || "exponential";

        return {
            "3": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": samplerName,
                    "scheduler": scheduler,
                    "denoise": 1,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["11", 0]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "4": {
                "inputs": {
                    "ckpt_name": model
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {
                    "title": "Load Checkpoint"
                }
            },
            "6": {
                "inputs": {
                    "text": prompt,
                    "clip": ["10", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Prompt)"
                }
            },
            "7": {
                "inputs": {
                    "text": params.negative_prompt || "",
                    "clip": ["10", 0]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Prompt)"
                }
            },
            "10": {
                "inputs": {
                    "clip_name": clipModel,
                    "type": "stable_audio",
                    "device": "default"
                },
                "class_type": "CLIPLoader",
                "_meta": {
                    "title": "Load CLIP"
                }
            },
            "11": {
                "inputs": {
                    "seconds": seconds,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentAudio",
                "_meta": {
                    "title": "EmptyLatentAudio"
                }
            },
            "12": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecodeAudio",
                "_meta": {
                    "title": "VAEDecodeAudio"
                }
            },
            "13": {
                "inputs": {
                    "filename_prefix": "audio/ElizaOS",
                    "audioUI": "",
                    "audio": ["12", 0]
                },
                "class_type": "SaveAudio",
                "_meta": {
                    "title": "SaveAudio"
                }
            }
        };
    }

    private createXTTSWorkflow(text: string, params: Record<string, any> = {}): any {
        // XTTS parameters with defaults from the guide
        const referenceAudio = params.reference_audio || "en_sample.wav";
        const language = params.language || "en";
        const temperature = params.temperature || 0.68;
        const lengthPenalty = params.length_penalty || 1;
        const repetitionPenalty = params.repetition_penalty || 4;
        const topK = params.top_k || 50;
        const topP = params.top_p || 0.85;
        const speed = params.speed || 1.2;

        return {
            "1": {
                "inputs": {
                    "audio": ["3", 0]
                },
                "class_type": "PreViewAudio"
            },
            "2": {
                "inputs": {
                    "audio": referenceAudio,
                    "choose audio file to upload": "Audio"
                },
                "class_type": "LoadAudioPath"
            },
            "3": {
                "inputs": {
                    "text": text,
                    "language": language,
                    "temperature": temperature,
                    "length_penalty": lengthPenalty,
                    "repetition_penalty": repetitionPenalty,
                    "top_k": topK,
                    "top_p": topP,
                    "speed": speed,
                    "audio": ["2", 0]
                },
                "class_type": "XTTS_INFER"
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

                        // Create internal URL for fetching image data
                        const internalImageUrl = `${this.apiUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;

                        // Create proxy URL that the web UI can access
                        const proxyImageUrl = this.createProxyUrl(internalImageUrl);

                        console.log(`[ComfyUI] Internal URL: ${internalImageUrl}`);
                        console.log(`[ComfyUI] Proxy URL: ${proxyImageUrl}`);

                        return {
                            url: proxyImageUrl,
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

    private async waitForAudio(promptId: string, maxWaitTime: number = 300000): Promise<{ url: string; filename: string }> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check history for the completed audio
                const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`, {
                    headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
                });
                const history = historyResponse.data;

                if (history[promptId] && history[promptId].outputs) {
                    const outputs = history[promptId].outputs;
                    const nodeOutput = outputs['13']; // SaveAudio node

                    if (nodeOutput && nodeOutput.audio && nodeOutput.audio.length > 0) {
                        const audio = nodeOutput.audio[0];

                        // Create internal URL for fetching audio data
                        const internalAudioUrl = `${this.apiUrl}/view?filename=${audio.filename}&subfolder=${audio.subfolder}&type=${audio.type}`;

                        // Create proxy URL that the web UI can access
                        const proxyAudioUrl = this.createAudioProxyUrl(internalAudioUrl);

                        console.log(`[ComfyUI] Internal Audio URL: ${internalAudioUrl}`);
                        console.log(`[ComfyUI] Proxy Audio URL: ${proxyAudioUrl}`);

                        return {
                            url: proxyAudioUrl,
                            filename: audio.filename
                        };
                    }
                }

                // Check if the job failed
                if (history[promptId] && history[promptId].status) {
                    const status = history[promptId].status;
                    if (status.status_str === 'error') {
                        throw new Error('ComfyUI audio workflow execution failed');
                    }
                }

                // Wait a bit before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.warn('Error checking audio status:', error);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('Audio generation timed out');
    }

    private async waitForTTS(promptId: string, maxWaitTime: number = 300000): Promise<{ url: string; filename: string }> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check history for the completed TTS
                const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`, {
                    headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
                });
                const history = historyResponse.data;

                console.log(`[ComfyUI TTS Debug] Checking history for prompt ${promptId}:`, JSON.stringify(history, null, 2));

                if (history[promptId] && history[promptId].outputs) {
                    const outputs = history[promptId].outputs;
                    // XTTS workflow: PreViewAudio node (node 1) outputs the audio file
                    const nodeOutput = outputs['1']; // PreViewAudio node

                    console.log(`[ComfyUI TTS Debug] Node 1 (PreViewAudio) output:`, JSON.stringify(nodeOutput, null, 2));

                    if (nodeOutput && nodeOutput.audio && nodeOutput.audio.length > 0) {
                        const audio = nodeOutput.audio[0];

                        // Create internal URL for fetching audio data
                        // Files are saved in the root output directory, not in a subfolder
                        const internalAudioUrl = `${this.apiUrl}/view?filename=${audio}`;

                        // Create proxy URL that the web UI can access
                        const proxyAudioUrl = this.createTTSProxyUrl(internalAudioUrl);

                        console.log(`[ComfyUI] Internal TTS URL: ${internalAudioUrl}`);
                        console.log(`[ComfyUI] Proxy TTS URL: ${proxyAudioUrl}`);

                        return {
                            url: proxyAudioUrl,
                            filename: audio
                        };
                    } else {
                        console.log(`[ComfyUI TTS Debug] No audio found in node 1 output`);
                    }
                }

                // Check if the job failed
                if (history[promptId] && history[promptId].status) {
                    const status = history[promptId].status;
                    if (status.status_str === 'error') {
                        throw new Error('ComfyUI XTTS workflow execution failed');
                    }
                }

                // Wait a bit before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.warn('Error checking TTS status:', error);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('XTTS generation timed out');
    }

    /**
     * Create a proxy URL that routes through the ElizaOS server
     * This allows the web UI to access ComfyUI images via the proxy endpoint
     */
    private createProxyUrl(internalUrl: string): string {
        // Encode the internal ComfyUI URL as a query parameter
        const encodedUrl = encodeURIComponent(internalUrl);

        // Use relative URL to work with dev containers, port forwarding, and any proxy setup
        // This will automatically use the same host:port that the browser is using to access the UI
        return `/api/media/comfyui/image?url=${encodedUrl}`;
    }

    /**
     * Create a proxy URL for audio files that routes through the ElizaOS server
     * This allows the web UI to access ComfyUI audio via the proxy endpoint
     */
    private createAudioProxyUrl(internalUrl: string): string {
        // Encode the internal ComfyUI URL as a query parameter
        const encodedUrl = encodeURIComponent(internalUrl);

        // Use relative URL to work with dev containers, port forwarding, and any proxy setup
        // This will automatically use the same host:port that the browser is using to access the UI
        return `/api/media/comfyui/audio?url=${encodedUrl}`;
    }

    /**
     * Create a proxy URL for TTS files that routes through the ElizaOS server
     * This allows the web UI to access ComfyUI TTS via the proxy endpoint
     */
    private createTTSProxyUrl(internalUrl: string): string {
        // Encode the internal ComfyUI URL as a query parameter
        const encodedUrl = encodeURIComponent(internalUrl);

        // Use relative URL to work with dev containers, port forwarding, and any proxy setup
        // This will automatically use the same host:port that the browser is using to access the UI
        return `/api/media/comfyui/tts?url=${encodedUrl}`;
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

    private async validateXTTSModel(): Promise<void> {
        try {
            const response = await axios.get(`${this.apiUrl}/object_info`, {
                headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
            });
            const objectInfo = response.data;

            // Check if XTTS_INFER node is available
            if (!objectInfo.XTTS_INFER) {
                throw new Error('XTTS_INFER node not found in ComfyUI. Please ensure XTTS custom node is installed.');
            }

            console.log('XTTS_INFER node found and available');
        } catch (error: any) {
            console.error('Failed to validate XTTS model:', error);
            throw new Error(`Failed to validate XTTS model: ${error.message}`);
        }
    }
}
