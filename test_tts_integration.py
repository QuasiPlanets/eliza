#!/usr/bin/env python3
"""
Simple test script to verify ComfyUI TTS integration with ElizaOS
"""

import requests
import json
import time

def test_comfyui_tts():
    """Test ComfyUI TTS functionality directly"""
    
    # Test ComfyUI API directly
    comfyui_url = "http://localhost:8188"
    
    print("🧪 Testing ComfyUI TTS Integration")
    print("=" * 50)
    
    # 1. Check if ComfyUI is running
    try:
        response = requests.get(f"{comfyui_url}/queue", timeout=5)
        if response.status_code == 200:
            print("✅ ComfyUI is running")
        else:
            print(f"❌ ComfyUI returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to ComfyUI: {e}")
        return False
    
    # 2. Test ElizaOS TTS endpoint
    elizaos_url = "http://localhost:3000"
    agent_id = "54334a5c-cbd8-0f1f-a083-f5d48d8a7b82"
    
    print(f"\n🎤 Testing ElizaOS TTS endpoint...")
    print(f"Agent ID: {agent_id}")
    
    try:
        response = requests.post(
            f"{elizaos_url}/api/audio/{agent_id}/speech/generate",
            headers={"Content-Type": "application/json"},
            json={"text": "Hello, this is a test of the TTS functionality."},
            timeout=10
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text[:200]}...")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ ElizaOS TTS endpoint working")
                return True
            else:
                print(f"❌ ElizaOS TTS failed: {result.get('error', {}).get('details', 'Unknown error')}")
        else:
            print(f"❌ ElizaOS TTS endpoint returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing ElizaOS TTS: {e}")
    
    return False

def test_agent_plugins():
    """Test what plugins are available for the agent"""
    
    elizaos_url = "http://localhost:3000"
    agent_id = "54334a5c-cbd8-0f1f-a083-f5d48d8a7b82"
    
    print(f"\n🔌 Testing agent plugin configuration...")
    
    try:
        response = requests.get(f"{elizaos_url}/api/agents/{agent_id}")
        
        if response.status_code == 200:
            agent_data = response.json()
            plugins = agent_data.get("data", {}).get("plugins", [])
            print(f"Agent plugins: {plugins}")
            
            if "@elizaos/plugin-comfyui" in plugins:
                print("✅ ComfyUI plugin is in agent configuration")
            else:
                print("❌ ComfyUI plugin is NOT in agent configuration")
                print("This might be why the TEXT_TO_SPEECH model handler is not found")
        else:
            print(f"❌ Failed to get agent data: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting agent data: {e}")

if __name__ == "__main__":
    print("Starting TTS integration test...")
    
    # Test agent plugins first
    test_agent_plugins()
    
    # Test TTS functionality
    success = test_comfyui_tts()
    
    if success:
        print("\n🎉 TTS integration test completed successfully!")
    else:
        print("\n💥 TTS integration test failed!")
        print("\nNext steps:")
        print("1. Check if ComfyUI is running with XTTS model")
        print("2. Verify ComfyUI plugin is properly loaded")
        print("3. Check if TEXT_TO_SPEECH model handler is registered") 