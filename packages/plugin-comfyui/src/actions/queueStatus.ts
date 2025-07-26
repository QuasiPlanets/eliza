import type { Action, IAgentRuntime, Memory, State, ActionResult } from '@elizaos/core';
import { ComfyUIService } from '../service';

export const queueStatusAction: Action = {
    name: 'CHECK_COMFYUI_QUEUE',
    similes: ['QUEUE_STATUS', 'CHECK_QUEUE', 'GENERATION_STATUS', 'COMFYUI_STATUS'],
    description: 'Checks the ComfyUI queue status to see pending and running generations',

    validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
        const text = message.content?.text?.toLowerCase() || '';

        // Check for queue status keywords
        const queueKeywords = [
            'queue status', 'check queue', 'generation status', 'comfyui status',
            'pending generations', 'running generations', 'queue length'
        ];

        return queueKeywords.some(keyword => text.includes(keyword));
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

            // Get queue status
            const queueStatus = await comfyuiService.getQueueStatus();

            const runningCount = queueStatus.queue_running.length;
            const pendingCount = queueStatus.queue_pending.length;
            const totalInQueue = runningCount + pendingCount;

            let statusText = '📊 **ComfyUI Queue Status:**\n\n';

            if (totalInQueue === 0) {
                statusText += '✅ Queue is empty - ready for new generations!';
            } else {
                statusText += `🔄 **Running:** ${runningCount} generation${runningCount !== 1 ? 's' : ''}\n`;
                statusText += `⏳ **Pending:** ${pendingCount} generation${pendingCount !== 1 ? 's' : ''}\n`;
                statusText += `📝 **Total in queue:** ${totalInQueue}`;

                if (runningCount > 0) {
                    statusText += '\n\n🎨 Generations are currently in progress...';
                }
                if (pendingCount > 0) {
                    statusText += `\n⏱️ Estimated wait time: ~${pendingCount * 2} minutes`;
                }
            }

            return {
                success: true,
                text: statusText,
                data: {
                    queueStatus,
                    runningCount,
                    pendingCount,
                    totalInQueue,
                    timestamp: new Date().toISOString()
                }
            };

        } catch (error: any) {
            console.error('Error checking ComfyUI queue status:', error);

            return {
                success: false,
                text: 'Failed to check ComfyUI queue status. The service may be unavailable.',
                error: `Queue status check failed: ${error.message}`
            };
        }
    },

    examples: [
        [
            {
                name: '{{name1}}',
                content: { text: 'Check the ComfyUI queue status' }
            },
            {
                name: 'Eliza',
                content: { text: '📊 **ComfyUI Queue Status:**\n\n✅ Queue is empty - ready for new generations!' }
            }
        ],
        [
            {
                name: '{{name1}}',
                content: { text: 'What is the generation status?' }
            },
            {
                name: 'Eliza',
                content: { text: '📊 **ComfyUI Queue Status:**\n\n🔄 **Running:** 1 generation\n⏳ **Pending:** 2 generations\n📝 **Total in queue:** 3\n\n🎨 Generations are currently in progress...\n⏱️ Estimated wait time: ~4 minutes' }
            }
        ]
    ]
}; 