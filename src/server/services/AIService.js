/**
 * AIService - Multi-model priority queue with automatic fallback
 *
 * Models are tried in priority order. On rate-limit (429) or availability
 * errors, the next model in the queue is attempted automatically.
 *
 * Configuration is env-driven. Set keys for the providers you want:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, XAI_API_KEY
 *
 * Priority order is configurable via AI_PRIORITY (comma-separated):
 *   AI_PRIORITY=anthropic,openai,google,xai
 *
 * Task-specific routing via AI_TASK_<TASK>=<provider>:
 *   AI_TASK_CHEMISTRY=anthropic
 *   AI_TASK_VISION=google
 */

const PROVIDER_REGISTRY = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    envModel: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o',
    factory: (model, apiKey) => {
      const { openai } = require('@ai-sdk/openai');
      return openai(model, { apiKey });
    }
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    envModel: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-sonnet-4-20250514',
    factory: (model, apiKey) => {
      const { anthropic } = require('@ai-sdk/anthropic');
      return anthropic(model, { apiKey });
    }
  },
  google: {
    envKey: 'GOOGLE_API_KEY',
    envModel: 'GOOGLE_MODEL',
    defaultModel: 'gemini-2.0-flash',
    factory: (model, apiKey) => {
      const { google } = require('@ai-sdk/google');
      return google(model, { apiKey });
    }
  },
  xai: {
    envKey: 'XAI_API_KEY',
    envModel: 'XAI_MODEL',
    defaultModel: 'grok-3',
    factory: (model, apiKey) => {
      const { xai } = require('@ai-sdk/xai');
      return xai(model, { apiKey });
    }
  }
};

const DEFAULT_PRIORITY = ['openai', 'anthropic', 'google', 'xai'];

class AIService {
  constructor() {
    this.isTest = process.env.NODE_ENV === 'test';
    this.providers = this._buildProviders();
    this.priority = this._buildPriority();
    this.cooldowns = new Map();
    this.config = { provider: this.priority[0] || 'openai' };
    this.model = this.providers.get(this.config.provider)?.model || null;
  }

  _buildProviders() {
    const providers = new Map();

    if (this.isTest) {
      providers.set('mock', { name: 'mock', model: 'mock-model', modelId: 'mock-model' });
      return providers;
    }

    for (const [name, reg] of Object.entries(PROVIDER_REGISTRY)) {
      const apiKey = process.env[reg.envKey];
      if (!apiKey) continue;

      const modelId = process.env[reg.envModel] || reg.defaultModel;
      try {
        const model = reg.factory(modelId, apiKey);
        providers.set(name, { name, model, modelId });
      } catch (err) {
        console.warn(`[AIService] Failed to init ${name}: ${err.message}`);
      }
    }

    return providers;
  }

  _buildPriority() {
    if (this.isTest) return ['mock'];

    const envPriority = process.env.AI_PRIORITY;
    const order = envPriority
      ? envPriority.split(',').map(s => s.trim().toLowerCase())
      : DEFAULT_PRIORITY;

    const available = order.filter(p => this.providers.has(p));

    if (available.length === 0) {
      throw new Error(
        'No AI providers configured. Set at least one API key: ' +
        Object.values(PROVIDER_REGISTRY).map(r => r.envKey).join(', ')
      );
    }

    console.log(`[AIService] Priority queue: ${available.join(' > ')} (${available.length} providers)`);
    return available;
  }

  _getTaskProvider(taskType) {
    if (!taskType) return null;
    const preferred = process.env[`AI_TASK_${taskType.toUpperCase()}`]?.toLowerCase();
    if (preferred && this.providers.has(preferred) && !this._isOnCooldown(preferred)) {
      return preferred;
    }
    return null;
  }

  _isOnCooldown(providerName) {
    const until = this.cooldowns.get(providerName);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldowns.delete(providerName);
      return false;
    }
    return true;
  }

  _setCooldown(providerName, retryAfterSeconds) {
    const duration = (retryAfterSeconds || 60) * 1000;
    this.cooldowns.set(providerName, Date.now() + duration);
    console.warn(`[AIService] ${providerName} rate-limited, cooldown ${retryAfterSeconds || 60}s`);
  }

  _isRetryableError(error) {
    const status = error.status || error.statusCode || error.code;
    if ([429, 503, 529].includes(status)) return true;
    const msg = (error.message || '').toLowerCase();
    return msg.includes('rate limit') || msg.includes('overloaded') || msg.includes('capacity');
  }

  _getRetryAfter(error) {
    if (error.headers?.['retry-after']) return parseInt(error.headers['retry-after'], 10);
    if (error.retryAfter) return error.retryAfter;
    return 60;
  }

  async callAPI(params, options = {}) {
    if (this.isTest) return this._getMockResponse(params);

    const { taskType, provider: forceProvider } = options;
    const tryOrder = this._resolveOrder(taskType, forceProvider);
    let lastError = null;

    for (const providerName of tryOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const result = await this._callProvider(provider, params);
        this.config.provider = providerName;
        this.model = provider.model;
        return this._parseResponse(result);
      } catch (error) {
        lastError = error;
        if (this._isRetryableError(error)) {
          this._setCooldown(providerName, this._getRetryAfter(error));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('All AI providers exhausted');
  }

  _resolveOrder(taskType, forceProvider) {
    if (forceProvider && this.providers.has(forceProvider)) {
      const rest = this.priority.filter(p => p !== forceProvider && !this._isOnCooldown(p));
      return [forceProvider, ...rest];
    }

    const taskPref = this._getTaskProvider(taskType);
    if (taskPref) {
      const rest = this.priority.filter(p => p !== taskPref && !this._isOnCooldown(p));
      return [taskPref, ...rest];
    }

    return this.priority.filter(p => !this._isOnCooldown(p));
  }

  async _callProvider(provider, params) {
    const { generateText } = require('ai');
    const sdkParams = this._convertToSDKFormat(params);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[AIService] Trying ${provider.name} (${provider.modelId})`);
    }

    return await generateText({ model: provider.model, ...sdkParams });
  }

  _convertToSDKFormat(params) {
    const sdkParams = {};

    if (params.messages && Array.isArray(params.messages)) {
      sdkParams.messages = params.messages.map(msg => ({
        role: msg.role || 'user',
        content: msg.content || ''
      }));
    } else {
      sdkParams.prompt = params.input || params.prompt || '';
    }

    if (params.max_tokens) sdkParams.maxTokens = params.max_tokens;
    if (params.temperature !== undefined) sdkParams.temperature = params.temperature;
    if (params.top_p !== undefined) sdkParams.topP = params.top_p;

    return sdkParams;
  }

  _parseResponse(response) {
    if (!response?.text) {
      throw new Error('Invalid AI response: missing text field');
    }

    let content = response.text.trim();
    if (!content) throw new Error('Empty response from AI');

    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    try {
      return JSON.parse(content);
    } catch {
      return {
        content,
        role: 'assistant',
        finish_reason: response.finishReason || 'stop',
        usage: response.usage,
        model: this.getModel()
      };
    }
  }

  _getMockResponse() {
    return {
      text: 'Mock response for testing.',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    };
  }

  getProvider() { return this.config.provider; }
  getModel() { return this.providers.get(this.config.provider)?.modelId || 'unknown'; }

  getStatus() {
    const status = {};
    for (const [name, provider] of this.providers) {
      status[name] = {
        model: provider.modelId,
        available: !this._isOnCooldown(name),
        cooldownUntil: this.cooldowns.get(name) || null,
        priority: this.priority.indexOf(name)
      };
    }
    return status;
  }

  switchProvider(newProvider) {
    if (!this.providers.has(newProvider)) {
      throw new Error(`Unknown provider: ${newProvider}. Available: ${[...this.providers.keys()].join(', ')}`);
    }
    this.config.provider = newProvider;
    this.model = this.providers.get(newProvider).model;
  }

  async healthCheck() {
    try {
      const response = await this.callAPI({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      return { status: 'healthy', provider: this.config.provider, response };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  static getAvailableProviders() {
    return Object.keys(PROVIDER_REGISTRY);
  }
}

module.exports = AIService;
