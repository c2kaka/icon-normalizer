import OpenAI from 'openai';
import { AIResponse, Config, IconInfo } from '../types/index.js';

export class AIAnalysisEngine {
  private openai: OpenAI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.ai.apiKey,
    });
  }

  async analyzeIcon(iconInfo: IconInfo): Promise<AIResponse> {
    const prompt = this.buildPrompt(iconInfo);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.ai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/svg+xml;base64,${Buffer.from(iconInfo.content).toString('base64')}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      throw new Error(`AI analysis failed: ${error}`);
    }
  }

  private buildPrompt(iconInfo: IconInfo): string {
    const categories = Object.keys(this.config.categories);
    const categoryDescriptions = Object.entries(this.config.categories)
      .map(([cat, subcats]) => `- ${cat}: ${subcats.join(', ')}`)
      .join('\n');

    return `Analyze this SVG icon and classify it according to the following categories:

Categories and subcategories:
${categoryDescriptions}

Instructions:
1. Choose the most appropriate category from the list above
2. Provide relevant tags based on the icon's visual appearance and functionality
3. Rate your confidence in the classification (0.0-1.0)
4. Provide brief reasoning for your classification

Icon filename: ${iconInfo.filename}

Respond in JSON format:
{
  "category": "chosen_category",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        category: parsed.category || 'uncategorized',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  async batchAnalyze(icons: IconInfo[]): Promise<Map<string, AIResponse>> {
    const results = new Map<string, AIResponse>();
    const batchSize = this.config.ai.maxConcurrent;
    
    for (let i = 0; i < icons.length; i += batchSize) {
      const batch = icons.slice(i, i + batchSize);
      const promises = batch.map(async (icon) => {
        try {
          const result = await this.analyzeIcon(icon);
          return { id: icon.id, result };
        } catch (error) {
          console.error(`Failed to analyze icon ${icon.filename}:`, error);
          return { 
            id: icon.id, 
            result: {
              category: 'error',
              tags: [],
              confidence: 0,
              reasoning: `Analysis failed: ${error}`,
            }
          };
        }
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
    }

    return results;
  }
}