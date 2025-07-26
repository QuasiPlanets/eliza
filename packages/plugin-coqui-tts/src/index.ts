import { Plugin, ModelType } from '@elizaos/core';

/**
 * Coqui TTS Plugin - Local high-quality text-to-speech alternative to ElevenLabs
 * 
 * Features:
 * - Voice cloning from 3 seconds of audio
 * - Multilingual support (13+ languages)
 * - High quality comparable to ElevenLabs
 * - Runs entirely locally
 * - No API costs or rate limits
 */
const coquiTtsPlugin: Plugin = {
    name: '@elizaos/plugin-coqui-tts',
    description: 'Local high-quality text-to-speech using Coqui XTTS-v2',
    dependencies: [],

    models: {
        [ModelType.TEXT_TO_SPEECH]: async (runtime, params) => {
            const text = typeof params === 'string' ? params : params.text;
            const coquiUrl = runtime.getSetting('COQUI_TTS_URL') || 'http://limn_nivean_coqui_tts:9000';
            const voice = runtime.getSetting('COQUI_TTS_VOICE') || 'default';
            const language = runtime.getSetting('COQUI_TTS_LANGUAGE') || 'en';

            try {
                const response = await fetch(`${coquiUrl}/tts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text,
                        voice,
                        language,
                        speed: params.speed || 1.0,
                        temperature: params.temperature || 0.7,
                        length_penalty: params.lengthPenalty || 1.0,
                        repetition_penalty: params.repetitionPenalty || 2.0,
                        top_k: params.topK || 50,
                        top_p: params.topP || 0.8,
                        enable_text_splitting: true,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Coqui TTS API error: ${response.status} ${response.statusText}`);
                }

                const audioBuffer = await response.arrayBuffer();
                const base64Audio = Buffer.from(audioBuffer).toString('base64');

                return `data:audio/wav;base64,${base64Audio}`;
            } catch (error) {
                throw new Error(`Coqui TTS generation failed: ${error.message}`);
            }
        },
    },

    async init(runtime) {
        // Test connection to Coqui TTS server
        const coquiUrl = runtime.getSetting('COQUI_TTS_URL') || 'http://limn_nivean_coqui_tts:9000';
        try {
            const response = await fetch(`${coquiUrl}/health`);
            if (!response.ok) {
                console.warn('[Coqui TTS] Server health check failed');
            }
        } catch (error) {
            console.warn('[Coqui TTS] Could not connect to server:', error);
        }
    },
};

export default coquiTtsPlugin; 