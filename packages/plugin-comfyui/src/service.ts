import axios from 'axios';
import { Service, type IAgentRuntime } from '@elizaos/core';

export class ComfyUIService extends Service {
    static serviceType = 'comfyui';
    capabilityDescription = 'ComfyUI API integration for image and audio generation';

    private apiUrl: string;

    constructor(runtime: IAgentRuntime) {
        super(runtime);
        this.apiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL || 'http://comfyui:8188';
    }

    static async start(runtime: IAgentRuntime): Promise<ComfyUIService> {
        return new ComfyUIService(runtime);
    }

    async stop(): Promise<void> {
        // Cleanup if needed
    }

    async generateImage(prompt: string, params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        try {
            // Create a simple ComfyUI workflow for image generation
            const workflow = this.createImageWorkflow(prompt, params);
            
            // Submit the workflow to ComfyUI
            const response = await axios.post(`${this.apiUrl}/prompt`, {
                prompt: workflow
            });

            if (!response.data || !response.data.prompt_id) {
                throw new Error('Invalid response from ComfyUI API');
            }

            const promptId = response.data.prompt_id;
            console.log(`ComfyUI workflow submitted with prompt ID: ${promptId}`);

            // Wait for the image to be generated
            const imageUrl = await this.waitForImage(promptId);

            return {
                url: imageUrl,
                metadata: { promptId, prompt, params }
            };
        } catch (err: any) {
            throw new Error(`ComfyUI image generation failed: ${err.message}`);
        }
    }

    async generateAudio(_prompt: string, _params: Record<string, any> = {}): Promise<{ url: string; metadata: any }> {
        // TODO: Implement audio generation
        throw new Error('Audio generation not yet implemented');
    }

    private createImageWorkflow(prompt: string, params: Record<string, any> = {}): any {
        const seed = params.seed || Math.floor(Math.random() * 1000000);
        const steps = params.steps || 35;
        const cfg = params.cfg || 1.0;
        const width = params.width || 1024;
        const height = params.height || 1024;

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
                    "ckpt_name": "flux1-dev-fp8.safetensors"
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
                    "text": "",
                    "clip": ["30", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "35": {
                "inputs": {
                    "guidance": 3.5,
                    "conditioning": ["6", 0]
                },
                "class_type": "FluxGuidance"
            }
        };
    }

    private async waitForImage(promptId: string, maxWaitTime: number = 60000): Promise<string> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check history for the completed image
                const historyResponse = await axios.get(`${this.apiUrl}/history/${promptId}`);
                const history = historyResponse.data;
                
                if (history[promptId] && history[promptId].outputs) {
                    const outputs = history[promptId].outputs;
                    const nodeOutput = outputs['9']; // SaveImage node
                    
                    if (nodeOutput && nodeOutput.images && nodeOutput.images.length > 0) {
                        const image = nodeOutput.images[0];
                        return `${this.apiUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;
                    }
                }
                
                // Wait a bit before checking again
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.warn('Error checking image status:', error);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error('Image generation timed out');
    }
}
