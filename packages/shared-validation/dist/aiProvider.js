/** BYO picker — cloud / compatible only. Platform mode may still use server-side Ollama. */
export const AI_PROVIDER_OPTIONS = [
    {
        id: 'openai',
        label: 'OpenAI',
        hint: 'ChatGPT / GPT-4o API key',
        needsKey: true,
        defaultModel: 'gpt-4o-mini',
    },
    {
        id: 'anthropic',
        label: 'Anthropic Claude',
        hint: 'Claude API key from console.anthropic.com',
        needsKey: true,
        defaultModel: 'claude-3-5-haiku-20241022',
    },
    {
        id: 'google',
        label: 'Google Gemini',
        hint: 'Gemini API key from Google AI Studio',
        needsKey: true,
        defaultModel: 'gemini-2.0-flash',
    },
    {
        id: 'openai_compatible',
        label: 'OpenAI-compatible',
        hint: 'Azure, Groq, Together, hosted vLLM, etc.',
        needsKey: true,
        defaultModel: 'gpt-4o-mini',
    },
];
//# sourceMappingURL=aiProvider.js.map