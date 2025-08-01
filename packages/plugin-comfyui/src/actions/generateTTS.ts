import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { ContentType } from '@elizaos/core';
import { ComfyUIService } from '../service';
import { v4 } from 'uuid';

export const generateTTSAction: Action = {
    name: 'GENERATE_TTS',
    similes: ['TEXT_TO_SPEECH', 'CONVERT_TEXT_TO_SPEECH', 'SPEAK_TEXT', 'TTS', 'VOICE_CLONING', 'XTTS'],
    description: 'Converts text to speech using ComfyUI XTTS workflow with voice cloning',

    validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Only proceed if ComfyUI is configured
        const comfyuiUrl = runtime.getSetting('COMFYUI_API_URL') || process.env.COMFYUI_API_URL;
        if (!comfyuiUrl?.trim()) {
            console.log(`[ComfyUI XTTS] Validation failed: No COMFYUI_API_URL configured`);
            return false;
        }

        // Check for TTS keywords including XTTS-specific terms
        const ttsKeywords = [
            'speak', 'say', 'read aloud', 'text to speech', 'tts',
            'voice', 'audio', 'speech', 'narrate', 'voice cloning', 'xtts'
        ];

        const hasTTSKeyword = ttsKeywords.some(keyword => text.includes(keyword));
        console.log(`[ComfyUI XTTS] Validation - Text: "${text}"`);
        console.log(`[ComfyUI XTTS] Validation - Has TTS keyword: ${hasTTSKeyword}`);
        console.log(`[ComfyUI XTTS] Validation - ComfyUI URL: ${comfyuiUrl}`);
        console.log(`[ComfyUI XTTS] Validation - Result: ${hasTTSKeyword}`);

        return hasTTSKeyword;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: any,
        callback?: HandlerCallback
    ): Promise<void> => {
        try {
            const text = message.content?.text || '';

            // Extract text to convert to speech with enhanced pattern matching
            const textMatch = text.match(/(?:speak|say|read aloud|convert to speech|tts|voice cloning)\s+(.+)/i);
            const textToSpeak = textMatch ? textMatch[1].trim() : text;

            if (!textToSpeak) {
                if (callback) {
                    await callback({
                        text: 'Please provide text to convert to speech using XTTS voice cloning.',
                        thought: 'No valid text found for XTTS conversion.'
                    });
                }
                return;
            }

            // Extract XTTS parameters from the message
            const params: Record<string, any> = {};
            
            // Extract reference audio file if specified
            const audioMatch = text.match(/voice\s+(?:file|audio)\s+([^\s]+)/i);
            if (audioMatch) {
                params.reference_audio = audioMatch[1];
            }

            // Extract language if specified
            const languageMatch = text.match(/language\s+(en|es|fr|de|it|pt|ru|ja|ko|zh)/i);
            if (languageMatch) {
                params.language = languageMatch[1];
            }

            // Extract speed if specified
            const speedMatch = text.match(/speed\s+([0-9.]+)/i);
            if (speedMatch) {
                params.speed = parseFloat(speedMatch[1]);
            }

            // Extract temperature if specified
            const tempMatch = text.match(/temperature\s+([0-9.]+)/i);
            if (tempMatch) {
                params.temperature = parseFloat(tempMatch[1]);
            }

            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                if (callback) {
                    await callback({
                        text: 'ComfyUI service is not available. Please check your configuration.',
                        thought: 'ComfyUI service is not registered with the runtime.'
                    });
                }
                return;
            }

            // Send initial response
            const paramInfo = Object.keys(params).length > 0 ? 
                ` with parameters: ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')}` : '';
            
            if (callback) {
                await callback({
                    text: `I'm converting your text to speech using XTTS voice cloning${paramInfo}: "${textToSpeak}". This will take a moment...`,
                    thought: `Starting ComfyUI XTTS generation with text: "${textToSpeak}". Using XTTS workflow for high-quality voice cloning.`,
                    actions: ['GENERATE_TTS']
                });
            }

            // Generate the TTS with XTTS parameters
            const result = await comfyuiService.generateTTS(textToSpeak, params);

            console.log(`[ComfyUI XTTS Action] XTTS generated and accessible via proxy: ${result.url}`);

            // Send the response with the generated TTS audio
            if (callback) {
                await callback({
                    text: `I've converted your text to speech using XTTS voice cloning: "${textToSpeak}". The audio has been generated successfully.`,
                    attachments: [{
                        id: v4(),
                        url: result.url, // Use proxy URL for universal access
                        title: `XTTS Audio: ${textToSpeak.substring(0, 50)}...`,
                        contentType: ContentType.AUDIO,
                        description: textToSpeak
                    }],
                    thought: `Successfully generated XTTS using ComfyUI with text: "${textToSpeak}" and voice cloning parameters`,
                    actions: ['GENERATE_TTS']
                });
            }

        } catch (error: any) {
            console.error('Error in generateTTSAction:', error);

            // Provide specific error messages for XTTS
            let errorMessage = 'Sorry, I couldn\'t convert the text to speech using XTTS. ';
            if (error.message.includes('ComfyUI service')) {
                errorMessage += 'ComfyUI service is not available. Please check the configuration.';
            } else if (error.message.includes('XTTS_INFER')) {
                errorMessage += 'XTTS model is not installed in ComfyUI. Please install the XTTS custom node.';
            } else if (error.message.includes('workflow')) {
                errorMessage += 'There was an issue with the XTTS workflow.';
            } else if (error.message.includes('reference audio')) {
                errorMessage += 'Reference audio file not found. Please ensure en_sample.wav is available.';
            } else {
                errorMessage += 'Please try again with different text or check ComfyUI configuration.';
            }

            if (callback) {
                await callback({
                    text: errorMessage,
                    thought: `ComfyUI XTTS generation failed: ${error.message || 'Unknown error'}`
                });
            }
        }
    },

    examples: [
        [
            {
                name: '{{name1}}',
                content: { text: 'Speak the following text: Hello, how are you today?' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm converting your text to speech using XTTS voice cloning: 'Hello, how are you today?'. This will take a moment..." }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Read aloud this message with voice file en_sample.wav: Welcome to ElizaOS!' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm converting your text to speech using XTTS voice cloning with parameters: reference_audio=en_sample.wav: 'Welcome to ElizaOS!'. This will take a moment..." }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Convert to speech with speed 1.5: The quick brown fox jumps over the lazy dog.' }
            },
            {
                name: '{{name2}}',
                content: { text: "I'm converting your text to speech using XTTS voice cloning with parameters: speed=1.5: 'The quick brown fox jumps over the lazy dog.'. This will take a moment..." }
            }
        ]
    ]
}; 