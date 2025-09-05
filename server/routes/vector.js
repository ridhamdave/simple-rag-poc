const express = require('express');
const router = express.Router();
const path = require('path');
const serviceRegistry = require('../services/serviceRegistry');

router.post('/process-knowledge-base', async (req, res) => {
  const vectorService = serviceRegistry.get('vectorService');
  if (!vectorService) {
    return res.status(503).json({ error: 'Vector service not yet initialized. Please try again in a moment.' });
  }
  
  try {
    const { knowledgeBasePath } = req.body;
    const defaultPath = path.join(__dirname, '../../knowledge-base');
    const pathToProcess = knowledgeBasePath || defaultPath;
    
    const result = await vectorService.processKnowledgeBase(pathToProcess);
    res.json(result);
  } catch (error) {
    console.error('Error processing knowledge base:', error);
    res.status(500).json({ 
      error: 'Failed to process knowledge base',
      details: error.message 
    });
  }
});

router.post('/process-document', async (req, res) => {
  try {
    const { filePath, fileName } = req.body;
    
    if (!filePath || !fileName) {
      return res.status(400).json({ error: 'File path and name are required' });
    }
    
    const result = await vectorService.processDocument(filePath, fileName);
    res.json(result);
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const results = await vectorService.searchSimilar(query, parseInt(limit));
    res.json({ results });
  } catch (error) {
    console.error('Error searching vector database:', error);
    res.status(500).json({ 
      error: 'Failed to search vector database',
      details: error.message 
    });
  }
});

router.get('/stats', async (req, res) => {
  const vectorService = serviceRegistry.get('vectorService');
  if (!vectorService) {
    return res.status(503).json({ error: 'Vector service not yet initialized. Please try again in a moment.' });
  }
  
  try {
    const stats = await vectorService.getCollectionStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting collection stats:', error);
    res.status(500).json({ 
      error: 'Failed to get collection stats',
      details: error.message 
    });
  }
});

router.post('/clear', async (req, res) => {
  const vectorService = serviceRegistry.get('vectorService');
  if (!vectorService) {
    return res.status(503).json({ error: 'Vector service not yet initialized. Please try again in a moment.' });
  }
  
  try {
    const result = await vectorService.clearDatabase();
    res.json(result);
  } catch (error) {
    console.error('Error clearing database:', error);
    res.status(500).json({ 
      error: 'Failed to clear database',
      details: error.message 
    });
  }
});

router.post('/reprocess-all', async (req, res) => {
  const vectorService = serviceRegistry.get('vectorService');
  if (!vectorService) {
    return res.status(503).json({ error: 'Vector service not yet initialized. Please try again in a moment.' });
  }
  
  try {
    // Clear database first
    await vectorService.clearDatabase();
    
    // Then process all files
    const { knowledgeBasePath } = req.body;
    const defaultPath = path.join(__dirname, '../../knowledge-base');
    const pathToProcess = knowledgeBasePath || defaultPath;
    
    const result = await vectorService.processKnowledgeBase(pathToProcess);
    res.json(result);
  } catch (error) {
    console.error('Error reprocessing knowledge base:', error);
    res.status(500).json({ 
      error: 'Failed to reprocess knowledge base',
      details: error.message 
    });
  }
});

module.exports = router;
