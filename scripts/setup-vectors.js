const SimpleVectorService = require('../server/services/simpleVectorService');
const path = require('path');
require('dotenv').config();

async function setupVectors() {
  console.log('🚀 Setting up vector database...');
  
  const vectorService = new SimpleVectorService();
  
  try {
    // Initialize the vector service
    await vectorService.initialize();
    console.log('✅ Vector database initialized');
    
    // Process the knowledge base
    const knowledgeBasePath = path.join(__dirname, '../knowledge-base');
    console.log(`📚 Processing knowledge base at: ${knowledgeBasePath}`);
    
    const result = await vectorService.processKnowledgeBase(knowledgeBasePath);
    console.log(`✅ Processed ${result.processedFiles} files`);
    
    // Get collection stats
    const stats = await vectorService.getCollectionStats();
    console.log(`📊 Vector database contains ${stats.documentCount} documents`);
    
    console.log('🎉 Setup complete! You can now start the server and chat with your knowledge base.');
    
  } catch (error) {
    console.error('❌ Error setting up vector database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupVectors();
}

module.exports = setupVectors;
