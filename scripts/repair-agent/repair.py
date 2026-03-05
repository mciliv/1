import os
import sys
import subprocess
import json
import argparse

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from litellm import completion
except ImportError:
    completion = None

class RepairAgent:
    def __init__(self):
        # Default to OpenAI since an API key was found in .env
        self.model = os.getenv("REPAIR_MODEL", "openai/gpt-4o")
        self.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("REPAIR_API_KEY")
        self.api_base = os.getenv("REPAIR_API_BASE")

    def call_llm(self, prompt):
        if not completion:
            return "Error: litellm not installed. Run 'pip install litellm'."
        
        if not self.api_key and "ollama" not in self.model:
            return "Error: No API key found. Set OPENAI_API_KEY or REPAIR_API_KEY in .env."

        response = completion(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            api_key=self.api_key,
            api_base=self.api_base
        )
        return response.choices[0].message.content

    def diagnose(self, command, exit_code, output):
        print(f"[*] Diagnosing: '{command}' (Exit Code: {exit_code}) using {self.model}")
        
        prompt = f"""
        System: You are an autonomous repair agent.
        I ran the command: `{command}`
        It failed with exit code: {exit_code}
        Output:
        ---
        {output}
        ---
        
        Provide a fix. Return ONLY a JSON object with:
        {{
            "explanation": "Brief reason for failure",
            "fix_type": "shell_command",
            "fix_value": "the command to run"
        }}
        """
        
        raw_fix = self.call_llm(prompt)
        try:
            # Clean up potential markdown wrapper from LLM
            clean_json = raw_fix.strip().replace("```json", "").replace("```", "")
            return json.loads(clean_json)
        except Exception as e:
            return {"error": f"Failed to parse fix: {str(e)}", "raw": raw_fix}

    def apply_fix(self, fix):
        if "error" in fix:
            print(f"[!] {fix['error']}")
            print(f"[!] Raw output: {fix.get('raw')}")
            return False
            
        print(f"[*] Proposed Fix: {fix['explanation']}")
        
        if fix["fix_type"] == "shell_command":
            cmd = fix["fix_value"]
            print(f"[*] Suggested command: {cmd}")
            # In a real agentic loop, we might ask for confirmation or just run it
            # For this demo, let's just print it.
            return True
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cmd", required=True)
    parser.add_argument("--code", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    agent = RepairAgent()
    fix = agent.diagnose(args.cmd, args.code, args.output)
    agent.apply_fix(fix)
