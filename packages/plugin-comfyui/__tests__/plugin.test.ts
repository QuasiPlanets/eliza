import { describe, expect, it } from 'vitest';
import comfyuiPlugin from '../src/index';

describe('ComfyUI Plugin', () => {
    it('should export a valid plugin', () => {
        expect(comfyuiPlugin).toBeDefined();
        expect(comfyuiPlugin.name).toBe('@elizaos/plugin-comfyui');
        expect(comfyuiPlugin.description).toBe('Enhanced ElizaOS plugin for ComfyUI API integration with full endpoint support, queue management, and universal image display');
        expect(comfyuiPlugin.actions).toBeDefined();
        expect(comfyuiPlugin.actions).toHaveLength(4);
    });

    it('should have generate image action', () => {
        const imageAction = comfyuiPlugin.actions?.find(action => action.name === 'GENERATE_IMAGE');
        expect(imageAction).toBeDefined();
        expect(imageAction?.description).toBe('Generates an image using ComfyUI based on a text prompt with enhanced parameters support');
        expect(imageAction?.validate).toBeDefined();
        expect(imageAction?.handler).toBeDefined();
    });

    it('should have generate audio action', () => {
        const audioAction = comfyuiPlugin.actions?.find(action => action.name === 'GENERATE_AUDIO');
        expect(audioAction).toBeDefined();
        expect(audioAction?.description).toBe('Generates audio using ComfyUI based on a text prompt (experimental feature)');
        expect(audioAction?.validate).toBeDefined();
        expect(audioAction?.handler).toBeDefined();
    });

    it('should have queue status action', () => {
        const queueAction = comfyuiPlugin.actions?.find(action => action.name === 'CHECK_COMFYUI_QUEUE');
        expect(queueAction).toBeDefined();
        expect(queueAction?.description).toBe('Checks the ComfyUI queue status to see pending and running generations');
        expect(queueAction?.validate).toBeDefined();
        expect(queueAction?.handler).toBeDefined();
    });

    it('should have interrupt generation action', () => {
        const interruptAction = comfyuiPlugin.actions?.find(action => action.name === 'INTERRUPT_COMFYUI');
        expect(interruptAction).toBeDefined();
        expect(interruptAction?.description).toBe('Interrupts the currently running ComfyUI generation process');
        expect(interruptAction?.validate).toBeDefined();
        expect(interruptAction?.handler).toBeDefined();
    });

    it('should have init function', () => {
        expect(comfyuiPlugin.init).toBeDefined();
        expect(typeof comfyuiPlugin.init).toBe('function');
    });
}); 