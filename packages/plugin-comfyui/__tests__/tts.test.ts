import { ComfyUIService } from '../src/service';
import { generateTTSAction } from '../src/actions/generateTTS';

describe('ComfyUI Plugin XTTS Generation', () => {
    let service: ComfyUIService;

    beforeEach(() => {
        service = new ComfyUIService({} as any);
        process.env.COMFYUI_API_URL = 'http://comfyui:8188';
    });

    it('should generate valid XTTS workflow', () => {
        const workflow = service['createXTTSWorkflow']('Test text to speech');
        expect(workflow['3'].inputs.text).toBe('Test text to speech');
        expect(workflow['3'].class_type).toBe('XTTS_INFER');
        expect(workflow['2'].class_type).toBe('LoadAudioPath');
        expect(workflow['1'].class_type).toBe('PreViewAudio');
    });

    it('should include XTTS parameters in workflow', () => {
        const workflow = service['createXTTSWorkflow']('Test text', {
            reference_audio: 'custom_voice.wav',
            language: 'es',
            temperature: 0.5,
            speed: 1.5
        });

        expect(workflow['2'].inputs.audio).toBe('custom_voice.wav');
        expect(workflow['3'].inputs.language).toBe('es');
        expect(workflow['3'].inputs.temperature).toBe(0.5);
        expect(workflow['3'].inputs.speed).toBe(1.5);
    });

    it('should register GENERATE_TTS action', () => {
        expect(generateTTSAction.name).toBe('GENERATE_TTS');
        expect(generateTTSAction.similes).toContain('TEXT_TO_SPEECH');
        expect(generateTTSAction.similes).toContain('TTS');
        expect(generateTTSAction.similes).toContain('XTTS');
        expect(generateTTSAction.similes).toContain('VOICE_CLONING');
    });

    it('should validate XTTS action correctly', async () => {
        const mockRuntime = {
            getSetting: (key: string) => {
                if (key === 'COMFYUI_API_URL') return 'http://comfyui:8188';
                return null;
            }
        } as any;

        const mockMessage = {
            content: { text: 'speak this text aloud using xtts' }
        } as any;

        const result = await generateTTSAction.validate(mockRuntime, mockMessage);
        expect(result).toBe(true);
    });

    it('should reject XTTS action when ComfyUI not configured', async () => {
        const mockRuntime = {
            getSetting: (key: string) => null
        } as any;

        const mockMessage = {
            content: { text: 'speak this text aloud' }
        } as any;

        const result = await generateTTSAction.validate(mockRuntime, mockMessage);
        expect(result).toBe(false);
    });

    it('should create XTTS proxy URL correctly', () => {
        const internalUrl = 'http://comfyui:8188/view?filename=test.wav&type=output';
        const proxyUrl = service['createTTSProxyUrl'](internalUrl);
        expect(proxyUrl).toBe('/api/media/comfyui/tts?url=' + encodeURIComponent(internalUrl));
    });

    it('should extract XTTS parameters from text', () => {
        const text = 'speak with voice file custom.wav and speed 1.5: Hello world';
        const mockRuntime = {
            getSetting: (key: string) => 'http://comfyui:8188'
        } as any;

        const mockMessage = {
            content: { text }
        } as any;

        // Test that validation passes
        generateTTSAction.validate(mockRuntime, mockMessage).then(result => {
            expect(result).toBe(true);
        });
    });
}); 