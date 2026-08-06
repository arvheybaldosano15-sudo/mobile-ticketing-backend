const OpenAI = require('openai');
const { logger } = require('../utils/logger');

class AIService {
  isKeyValid() {
    const key = process.env.OPENAI_API_KEY || '';
    // Treat missing, placeholder, or obviously fake keys as invalid
    return (
      key.length > 20 &&
      key.startsWith('sk-') &&
      !key.includes('your_') &&
      !key.includes('_here') &&
      !key.includes('placeholder')
    );
  }

  getOpenAIClient() {
    if (!this.isKeyValid()) {
      return null;
    }
    if (!this.openai) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  async classifyTicket(concernDescription, serviceCategories) {
    try {
      const client = this.getOpenAIClient();
      if (!client) {
        logger.warn('OpenAI API Key missing, skipping AI classification');
        return this.getDefaultClassification(serviceCategories);
      }

      const categoriesStr = serviceCategories.map(c => `- ${c.name}: ${c.description}`).join('\n');
      
      const prompt = `
        You are an AI assistant for Converge IT Solutions customer support.
        Given the customer concern below, classify it into one of the following service categories.
        
        Available Categories:
        ${categoriesStr}
        
        Also recommend a priority level: high, medium, or low.
        - high: Critical issues, full service outage, major hardware failure.
        - medium: Intermittent issues, degraded performance, non-critical hardware issues.
        - low: Inquiries, new installation requests, minor configuration questions.

        Also estimate resolution time in hours (number only).
        
        Customer Concern:
        "${concernDescription}"
        
        Respond ONLY with a valid JSON object in this exact format:
        {
          "categoryId": "the UUID of the best matching category from the provided list",
          "priority": "high",
          "estimatedHours": 4.5,
          "confidence": 0.95
        }
      `;

      const categoryMapping = serviceCategories.map(c => ({ id: c.id, name: c.name }));

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful IT support classification AI. Respond only in JSON.' },
          { role: 'user', content: prompt + `\n\nValid IDs to choose from: ${JSON.stringify(categoryMapping)}`}
        ],
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        ai_priority_recommendation: result.priority,
        service_category_id: result.categoryId,
        ai_estimated_resolution_hours: result.estimatedHours,
        ai_classification_confidence: result.confidence
      };

    } catch (error) {
      logger.error('AI Classification Error', error);
      return this.getDefaultClassification(serviceCategories);
    }
  }

  getDefaultClassification(serviceCategories) {
    return {
      ai_priority_recommendation: 'medium',
      service_category_id: serviceCategories && serviceCategories.length > 0 ? serviceCategories[0].id : null,
      ai_estimated_resolution_hours: 24,
      ai_classification_confidence: 0
    };
  }

  async getAdminRecommendations(stats) {
    try {
      const client = this.getOpenAIClient();
      if (!client) return "AI Recommendations unavailable without API key.";
      
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an IT operations analyst AI.' },
          { role: 'user', content: `Based on these ticketing stats: ${JSON.stringify(stats)}. Give 3 short, actionable recommendations for the support team.`}
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('AI Recommendation Error', error);
      return "Could not generate recommendations at this time.";
    }
  }
}

module.exports = new AIService();
