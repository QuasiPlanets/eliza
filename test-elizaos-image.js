import dotenv from 'dotenv';
dotenv.config();

// Test ElizaOS image generation through the runtime
async function testElizaOSImageGeneration() {
    try {
        console.log('Testing ElizaOS image generation...');
        
        // Import the ElizaOS runtime
        const { AgentRuntime } = await import('./packages/core/dist/index.js');
        
        // Create a runtime instance
        const runtime = new AgentRuntime();
        
        // Initialize the runtime
        await runtime.init();
        
        // Test the image generation by calling the model handler directly
        const imageParams = {
            prompt: "a beautiful fairy with wings in a magical forest",
            width: 512,
            height: 512,
            steps: 20,
            cfg: 8
        };
        
        console.log('Calling image generation with params:', imageParams);
        
        // Call the image generation model handler
        const result = await runtime.useModel('IMAGE', imageParams);
        
        console.log('✅ Image generation successful!');
        console.log('Result:', result);
        
    } catch (error) {
        console.error('❌ ElizaOS image generation test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testElizaOSImageGeneration(); 