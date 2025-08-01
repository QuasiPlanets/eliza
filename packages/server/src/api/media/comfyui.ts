import express from 'express';
import axios from 'axios';
import { logger } from '@elizaos/core';

/**
 * Creates a router for proxying ComfyUI media content
 * This allows the web UI to access ComfyUI images through the ElizaOS server
 */
export function createComfyUIMediaRouter(): express.Router {
    const router = express.Router();

    // Handle CORS preflight requests for images
    router.options('/image', (req: express.Request, res: express.Response) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).send();
    });

    // Handle CORS preflight requests for audio
    router.options('/audio', (req: express.Request, res: express.Response) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).send();
    });

    // Proxy ComfyUI images: /api/media/comfyui/image?url=encoded_url
    router.get('/image', async (req: express.Request, res: express.Response) => {
        try {
            const imageUrl = req.query.url as string;

            if (!imageUrl) {
                res.status(400).json({ error: 'Missing image URL parameter' });
                return;
            }

            // Decode the URL
            const decodedUrl = decodeURIComponent(imageUrl);

            // Validate that it's a ComfyUI URL to prevent abuse
            if (!decodedUrl.includes('/view?') || !decodedUrl.includes('filename=')) {
                res.status(400).json({ error: 'Invalid ComfyUI image URL format' });
                return;
            }

            logger.debug(`[ComfyUI Proxy] Fetching image: ${decodedUrl}`);

            // Fetch the image from ComfyUI
            const response = await axios.get(decodedUrl, {
                responseType: 'stream',
                timeout: 30000,
                headers: {
                    'User-Agent': 'ElizaOS-ComfyUI-Proxy/1.0'
                }
            });

            // Set appropriate headers for browser compatibility
            const contentType = response.headers['content-type'] || 'image/png';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

            // Add explicit CORS headers for browser requests
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Max-Age', '86400');

            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }

            // Pipe the image data
            response.data.pipe(res);

            logger.debug(`[ComfyUI Proxy] Successfully served image`);

        } catch (error: any) {
            logger.error(`[ComfyUI Proxy] Error serving image:`, error.message);

            if (error.code === 'ECONNREFUSED') {
                res.status(503).json({ error: 'ComfyUI service unavailable' });
            } else if (error.code === 'ETIMEDOUT') {
                res.status(504).json({ error: 'ComfyUI request timeout' });
            } else {
                res.status(500).json({ error: 'Failed to fetch image from ComfyUI' });
            }
        }
    });

    // Proxy ComfyUI audio: /api/media/comfyui/audio?url=encoded_url
    router.get('/audio', async (req: express.Request, res: express.Response) => {
        try {
            const audioUrl = req.query.url as string;

            if (!audioUrl) {
                res.status(400).json({ error: 'Missing audio URL parameter' });
                return;
            }

            // Decode the URL
            const decodedUrl = decodeURIComponent(audioUrl);

            // Validate that it's a ComfyUI URL to prevent abuse
            if (!decodedUrl.includes('/view?') || !decodedUrl.includes('filename=')) {
                res.status(400).json({ error: 'Invalid ComfyUI audio URL format' });
                return;
            }

            logger.debug(`[ComfyUI Audio Proxy] Fetching audio: ${decodedUrl}`);

            // Fetch the audio from ComfyUI
            const response = await axios.get(decodedUrl, {
                responseType: 'stream',
                timeout: 60000, // Longer timeout for audio files
                headers: {
                    'User-Agent': 'ElizaOS-ComfyUI-Proxy/1.0'
                }
            });

            // Set appropriate headers for browser compatibility
            const contentType = response.headers['content-type'] || 'audio/wav';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

            // Add explicit CORS headers for browser requests
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Max-Age', '86400');

            if (response.headers['content-length']) {
                res.setHeader('Content-Length', response.headers['content-length']);
            }

            // Allow range requests for audio seeking
            if (response.headers['accept-ranges']) {
                res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
            }

            // Pipe the audio data
            response.data.pipe(res);

            logger.debug(`[ComfyUI Audio Proxy] Successfully served audio`);

        } catch (error: any) {
            logger.error(`[ComfyUI Audio Proxy] Error serving audio:`, error.message);

            if (error.code === 'ECONNREFUSED') {
                res.status(503).json({ error: 'ComfyUI service unavailable' });
            } else if (error.code === 'ETIMEDOUT') {
                res.status(504).json({ error: 'ComfyUI request timeout' });
            } else {
                res.status(500).json({ error: 'Failed to fetch audio from ComfyUI' });
            }
        }
    });

    // Health check endpoint for ComfyUI proxy
    router.get('/health', async (req: express.Request, res: express.Response) => {
        try {
            // Try to reach ComfyUI queue endpoint to check if it's accessible
            const comfyuiUrl = process.env.COMFYUI_API_URL || 'http://comfyui:8188';

            await axios.get(`${comfyuiUrl}/queue`, {
                timeout: 5000
            });

            res.json({
                status: 'healthy',
                comfyui_url: comfyuiUrl,
                proxy_endpoint: '/api/media/comfyui/image'
            });
        } catch (error: any) {
            logger.warn(`[ComfyUI Proxy] Health check failed:`, error.message);
            res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                comfyui_url: process.env.COMFYUI_API_URL || 'http://172.19.0.3:8188'
            });
        }
    });

    return router;
} 