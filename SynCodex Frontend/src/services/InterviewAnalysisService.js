/**
 * Interview Analysis Service
 * Integrates with Gemini API for audio transcription and analysis
 * Master Prompt focuses on:
 * - Technical Proficiency Score
 * - Communication Quality Score
 * - Technical Gaps
 * - Actionable Feedback
 */

class InterviewAnalysisService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.fallbackBaseUrl = 'https://generativelanguage.googleapis.com/v1/models';

    // Model fallback list (some accounts/regions expose slightly different names)
    this.audioModels = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      // older fallbacks (some keys only expose these)
      'gemini-1.0-pro',
      'gemini-pro',
    ];
    this.textModels = [
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro',
    ];

    // Cache ListModels result so we can auto-pick a model that exists for your API key.
    this._modelCatalogPromise = null;
    this._modelCatalog = null;

    // Client-side throttling to avoid Gemini free-tier 429s during chunked streaming.
    this.rateLimit = {
      // Free tier often enforces very low request rates (e.g., 5/min).
      maxRequestsPerMinute: 5,
      minIntervalMs: 12500,
      max429Retries: 3,
      retryJitterMs: 250,
    };
    this._requestQueue = Promise.resolve();
    this._recentRequestTimestamps = [];
    this._lastRequestAt = 0;

    this.masterPrompt = this.getMasterPrompt();
  }

  getMasterPrompt() {
    return `You are an expert technical interviewer and assessment specialist. Analyze the following interview transcript and provide a comprehensive evaluation.

ANALYSIS FRAMEWORK:

1. TECHNICAL PROFICIENCY SCORE (0-100)
   - Evaluate depth of technical knowledge
   - Assess problem-solving approach
   - Rate coding quality and architectural understanding
   - Consider years of experience vs demonstrated skills

2. COMMUNICATION QUALITY SCORE (0-100)
   - Clarity in explaining concepts
   - Ability to articulate solutions
   - Active listening and question handling
   - Professional communication patterns

3. TECHNICAL GAPS IDENTIFIED
   - List specific areas where knowledge is lacking
   - Identify technologies/concepts not understood
   - Note incomplete or incorrect explanations
   - Highlight missing best practices

4. ACTIONABLE FEEDBACK
   - Specific recommendations for improvement
   - Areas to focus learning on
   - Strengths to leverage in role
   - Next steps for career development

Please provide a structured JSON response with these exact fields:
{
  "technicalScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "technicalGaps": [<list of identified gaps>],
  "strengths": [<key strengths demonstrated>],
  "improvements": [<specific improvement areas>],
  "summary": "<2-3 paragraph professional summary>",
  "recommendation": "<hire/consider/continue_evaluation/feedback_needed>"
}`;
  }

  normalizeModelName(name) {
    if (!name) return '';
    // ListModels usually returns "models/<id>".
    return name.startsWith('models/') ? name.slice('models/'.length) : name;
  }

  async listModelsOnce() {
    if (this._modelCatalog) return this._modelCatalog;
    if (this._modelCatalogPromise) return this._modelCatalogPromise;

    const fetchCatalog = async (baseUrl) => {
      const url = `${baseUrl}?key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      const models = Array.isArray(data?.models) ? data.models : [];
      return models
        .map((m) => ({
          name: this.normalizeModelName(m?.name),
          supported: m?.supportedGenerationMethods || m?.supportedMethods || [],
        }))
        .filter((m) => !!m.name);
    };

    this._modelCatalogPromise = (async () => {
      try {
        const [beta, v1] = await Promise.all([
          fetchCatalog(this.baseUrl),
          fetchCatalog(this.fallbackBaseUrl),
        ]);
        const combined = [...beta, ...v1];

        // dedupe by name
        const seen = new Set();
        const deduped = [];
        for (const m of combined) {
          if (seen.has(m.name)) continue;
          seen.add(m.name);
          deduped.push(m);
        }

        this._modelCatalog = deduped;
        return deduped;
      } finally {
        this._modelCatalogPromise = null;
      }
    })();

    return this._modelCatalogPromise;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async _applyClientRateLimit() {
    const maxPerMinute = this.rateLimit?.maxRequestsPerMinute ?? 0;
    const minIntervalMs = this.rateLimit?.minIntervalMs ?? 0;

    while (true) {
      const now = Date.now();

      if (maxPerMinute > 0) {
        this._recentRequestTimestamps = (this._recentRequestTimestamps || []).filter(
          (t) => now - t < 60_000
        );

        if (this._recentRequestTimestamps.length >= maxPerMinute) {
          const oldest = this._recentRequestTimestamps[0];
          const waitMs = Math.max(0, 60_000 - (now - oldest) + 100);
          await this._sleep(waitMs);
          continue;
        }
      }

      if (minIntervalMs > 0 && this._lastRequestAt) {
        const since = now - this._lastRequestAt;
        if (since < minIntervalMs) {
          await this._sleep(minIntervalMs - since);
          continue;
        }
      }

      return;
    }
  }

  _parseRetryAfterMs(response, apiMsg) {
    try {
      const header = response?.headers?.get?.('retry-after') || response?.headers?.get?.('Retry-After');
      if (header) {
        const seconds = Number(header);
        if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
      }
    } catch (_) {
      // ignore
    }

    const msg = apiMsg || '';
    const match = msg.match(/retry in\s+([0-9.]+)s/i);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
    }

    return null;
  }

  async _postJsonWith429Retry(url, body) {
    const max429Retries = this.rateLimit?.max429Retries ?? 0;
    const jitterMs = this.rateLimit?.retryJitterMs ?? 0;

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this._applyClientRateLimit();

      const now = Date.now();
      this._lastRequestAt = now;
      this._recentRequestTimestamps.push(now);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const raw = await response.text().catch(() => '');
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (_) {
        parsed = null;
      }

      if (response.ok) {
        // If parsing failed for some reason, fall back to an empty object.
        return parsed ?? {};
      }

      const apiMsg = parsed?.error?.message || '';
      const error = new Error(
        `API Error: ${response.status} ${response.statusText}${apiMsg ? ` — ${apiMsg}` : ''}`
      );
      error.status = response.status;
      error.url = url;

      if (response.status === 429) {
        const retryAfterMs =
          this._parseRetryAfterMs(response, apiMsg) ??
          20_000; // reasonable default for Gemini free-tier backoff

        error.retryAfterMs = retryAfterMs;

        if (attempt < max429Retries) {
          attempt += 1;
          await this._sleep(retryAfterMs + (jitterMs || 0));
          continue;
        }
      }

      throw error;
    }
  }

  _enqueueRequest(fn) {
    const run = async () => fn();
    const p = this._requestQueue.then(run, run);
    this._requestQueue = p.catch(() => {});
    return p;
  }

  async postToGemini(path, body) {
    return this._enqueueRequest(async () => {
      const urls = [
        `${this.baseUrl}/${path}?key=${this.apiKey}`,
        `${this.fallbackBaseUrl}/${path}?key=${this.apiKey}`,
      ];

      let lastError = null;

      for (const url of urls) {
        try {
          return await this._postJsonWith429Retry(url, body);
        } catch (error) {
          lastError = error;
          // For model/path mismatches we retry the fallback URL or next model.
          if (error.status === 404) continue;
          throw error;
        }
      }

      throw lastError || new Error('Gemini API request failed');
    });
  }

  async generateContentWithModelFallback(models, body) {
    // Try to auto-select only models that actually exist for this API key.
    let catalog = [];
    try {
      if (this.apiKey) catalog = await this.listModelsOnce();
    } catch (_) {
      // ignore; we will fall back to static list
    }

    const supportedGenerate = new Set(
      catalog
        .filter((m) => Array.isArray(m.supported) && m.supported.includes('generateContent'))
        .map((m) => m.name)
    );

    const preferred = (models || []).filter((m) => supportedGenerate.size === 0 || supportedGenerate.has(m));

    // If none of our preferred models exist, pick any available model that supports generateContent.
    const fallbackFromCatalog = (() => {
      if (!supportedGenerate.size) return null;
      const available = Array.from(supportedGenerate);
      // simple heuristic: prefer pro/flash 1.5+ if present
      return (
        available.find((m) => m.includes('1.5-pro')) ||
        available.find((m) => m.includes('1.5-flash')) ||
        available.find((m) => m.includes('1.0-pro')) ||
        available[0]
      );
    })();

    const modelsToTry = preferred.length ? preferred : (fallbackFromCatalog ? [fallbackFromCatalog] : models);

    let lastError = null;
    for (const model of modelsToTry) {
      try {
        return await this.postToGemini(`${model}:generateContent`, body);
      } catch (err) {
        lastError = err;
        if (err?.status !== 404) throw err;
      }
    }

    if (supportedGenerate.size) {
      throw new Error(
        `${lastError?.message || 'Gemini API request failed'}\nAvailable models for this key: ${Array.from(supportedGenerate).slice(0, 12).join(', ')}`
      );
    }

    throw lastError || new Error('Gemini API request failed');
  }

  async analyzeAudioChunk(audioBase64, mimeType = 'audio/webm') {
    try {
      const data = await this.generateContentWithModelFallback(this.audioModels, {
        contents: [
          {
            parts: [
              {
                text: 'Transcribe this interview audio. Return only the transcript text (no JSON).',
              },
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
      });

      return this.extractTranscript(data);
    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw error;
    }
  }

  async summarizeTranscript(transcript) {
    try {
      const data = await this.generateContentWithModelFallback(this.textModels, {
        contents: [
          {
            parts: [
              {
                text: `${this.masterPrompt}\n\n---INTERVIEW TRANSCRIPT---\n\n${transcript}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
        },
      });

      return this.parseAnalysis(data);
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }

  extractTranscript(apiResponse) {
    try {
      const text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text;
    } catch (error) {
      console.error('Failed to extract transcript:', error);
      return '';
    }
  }

  parseAnalysis(apiResponse) {
    try {
      let text = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse analysis:', error);
      // Return default structure if parsing fails
      return {
        technicalScore: 0,
        communicationScore: 0,
        technicalGaps: [],
        strengths: [],
        improvements: [],
        summary: 'Analysis processing failed. Please try again.',
        recommendation: 'feedback_needed',
      };
    }
  }

  validateApiKey() {
    return this.apiKey && this.apiKey.length > 0;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
}

export default InterviewAnalysisService;
