const { GoogleGenerativeAI } = require('@google/generative-ai');

class ChatService {
  constructor(vectorService) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.vectorService = vectorService;
  }

  async generateResponse(query, conversationHistory = []) {
    try {
      // Search for relevant documents
      const relevantDocs = await this.vectorService.searchSimilar(query, 5);
      
      // Create context from relevant documents
      const context = relevantDocs
        .map(doc => doc.content)
        .join('\n\n');

      // Build conversation history for context
      const historyContext = conversationHistory
        .slice(-6) // Keep last 6 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided knowledge base. 
Use the following context to answer the user's question. If the answer cannot be found in the context, 
say so and provide a helpful response based on your general knowledge.

Context from knowledge base:
${context}

Previous conversation:
${historyContext}

Instructions:
- Answer based on the provided context when possible
- Be concise but comprehensive
- Cite sources when referencing specific information
- If you're unsure about something, say so
- Maintain a helpful and professional tone`;

      // Build the full prompt for Gemini
      let fullPrompt = systemPrompt + '\n\nUser Question: ' + query;
      
      // Add conversation history
      if (historyContext) {
        fullPrompt = historyContext + '\n\n' + fullPrompt;
      }

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      });

      const result = await model.generateContent(fullPrompt);
      const answer = result.response.text();
      
      // Extract sources from relevant documents
      const sources = relevantDocs.map(doc => ({
        source: doc.metadata.source,
        chunk_index: doc.metadata.chunk_index,
        relevance_score: 1 - doc.distance // Convert distance to relevance score
      }));

      return {
        answer,
        sources,
        relevantDocs: relevantDocs.map(doc => ({
          content: doc.content.substring(0, 200) + '...',
          source: doc.metadata.source
        }))
      };
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}

module.exports = ChatService;
