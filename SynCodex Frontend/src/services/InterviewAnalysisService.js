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
    this.modelName = 'gemini-1.5-pro';
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

  async postToGemini(path, body) {
    const urls = [
      `${this.baseUrl}/${path}?key=${this.apiKey}`,
      `${this.fallbackBaseUrl}/${path}?key=${this.apiKey}`,
    ];

    let lastError = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = new Error(`API Error: ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (error.status !== 404) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Gemini API request failed');
  }

  async analyzeAudioChunk(audioBase64) {
    try {
      const data = await this.postToGemini(`${this.modelName}:generateContent`, {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this interview audio. Provide accurate transcript with timestamps if possible.',
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
      const data = await this.postToGemini(`${this.modelName}:generateContent`, {
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
