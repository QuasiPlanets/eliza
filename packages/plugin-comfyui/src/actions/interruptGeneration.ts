import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const interruptGenerationAction: Action = {
    name: 'INTERRUPT_COMFYUI',
    similes: ['STOP_GENERATION', 'CANCEL_GENERATION', 'INTERRUPT_GENERATION', 'ABORT_COMFYUI'],
    description: 'Interrupts the currently running ComfyUI generation process',

    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Check for interrupt keywords
        const interruptKeywords = [
            'interrupt', 'stop generation', 'cancel generation', 'abort generation',
            'stop comfyui', 'cancel comfyui', 'interrupt comfyui', 'abort comfyui',
            'stop image generation', 'cancel image generation'
        ];

        return interruptKeywords.some(keyword => text.includes(keyword));
    },

    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<ActionResult> => {
        try {
            // Get the ComfyUI service
            const comfyuiService = runtime.getService('comfyui') as ComfyUIService;
            if (!comfyuiService) {
                return {
                    success: false,
                    text: 'ComfyUI service is not available. Please check your configuration.',
                    error: 'ComfyUI service not found'
                };
            }

            // Check queue status first to see if there's anything running
            const queueStatus = await comfyuiService.getQueueStatus();
            const runningCount = queueStatus.queue_running.length;
            const pendingCount = queueStatus.queue_pending.length;

            if (runningCount === 0 && pendingCount === 0) {
                return {
                    success: true,
                    text: '📋 No generations are currently running or pending. The queue is already empty.',
                    data: {
                        wasRunning: false,
                        queueStatus,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // Interrupt the execution
            await comfyuiService.interruptExecution();

            let resultText = '🛑 **Generation Interrupted**\n\n';

            if (runningCount > 0) {
                resultText += `✅ Successfully stopped ${runningCount} running generation${runningCount !== 1 ? 's' : ''}.\n`;
            }

            if (pendingCount > 0) {
                resultText += `📝 ${pendingCount} pending generation${pendingCount !== 1 ? 's were' : ' was'} also cleared from the queue.\n`;
            }

            resultText += '\n🔄 ComfyUI is now ready for new requests.';

            return {
                success: true,
                text: resultText,
                data: {
                    wasRunning: true,
                    interruptedRunning: runningCount,
                    clearedPending: pendingCount,
                    queueStatus,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error: any) {
            console.error('Error interrupting ComfyUI generation:', error);

            return {
                success: false,
                text: 'Failed to interrupt ComfyUI generation. The service may be unavailable or there may be nothing to interrupt.',
                error: `Interrupt generation failed: ${error.message}`
            };
        }
    },

    examples: [
        [
            {
                name: '{{name1}}',
                content: { text: 'Stop the current image generation' }
            },
            {
                name: 'Eliza',
                content: { text: '🛑 **Generation Interrupted**\n\n✅ Successfully stopped 1 running generation.\n\n🔄 ComfyUI is now ready for new requests.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Interrupt ComfyUI' }
            },
            {
                name: 'Eliza',
                content: { text: '📋 No generations are currently running or pending. The queue is already empty.' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'Cancel generation' }
            },
            {
                name: 'Eliza',
                content: { text: '🛑 **Generation Interrupted**\n\n✅ Successfully stopped 1 running generation.\n📝 2 pending generations were also cleared from the queue.\n\n🔄 ComfyUI is now ready for new requests.' }
            }
        ]
    ]
}; 