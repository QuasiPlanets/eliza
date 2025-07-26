import { describe, expect, it } from 'vitest';
import comfyuiPlugin from '../src/index';

describe('ComfyUI Plugin', () => {
    it('should export a valid plugin', () => {
        expect(comfyuiPlugin).toBeDefined();
        expect(comfyuiPlugin.name).toBe('@elizaos/plugin-comfyui');
        expect(comfyuiPlugin.description).toBe('ElizaOS plugin for ComfyUI API integration (image/audio generation)');
        expect(comfyuiPlugin.actions).toBeDefined();
        expect(comfyuiPlugin.actions).toHaveLength(2);
    });

    it('should have generate image action', () => {
        const imageAction = comfyuiPlugin.actions?.find(action => action.name === 'GENERATE_IMAGE');
        expect(imageAction).toBeDefined();
        expect(imageAction?.description).toBe('Generates an image using ComfyUI based on a text prompt');
        expect(imageAction?.validate).toBeDefined();
        expect(imageAction?.handler).toBeDefined();
    });

    it('should have generate audio action', () => {
        const audioAction = comfyuiPlugin.actions?.find(action => action.name === 'GENERATE_AUDIO');
        expect(audioAction).toBeDefined();
        expect(audioAction?.description).toBe('Generates audio using ComfyUI based on a text prompt');
        expect(audioAction?.validate).toBeDefined();
        expect(audioAction?.handler).toBeDefined();
    });

    it('should have init function', () => {
        expect(comfyuiPlugin.init).toBeDefined();
        expect(typeof comfyuiPlugin.init).toBe('function');
    });
}); 