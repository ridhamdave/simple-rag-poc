const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const chokidar = require('chokidar');
const officeParser = require('officeparser');
const xlsx = require('xlsx');
const GeminiErrorHandler = require('../utils/geminiErrorHandler');

class SimpleVectorService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.documents = [];
    this.embeddings = [];
    this.metadatas = [];
    this.vectorDbPath = process.env.VECTOR_DB_PATH || './vector-db';
    this.dataPath = path.join(this.vectorDbPath, 'vector-data.json');
    this.knowledgeBasePath = process.env.KNOWLEDGE_BASE_PATH || './knowledge-base';
    this.watcher = null;
    this.isProcessing = false;
  }

  async initialize() {
    try {
      // Ensure vector database directory exists
      await fs.ensureDir(this.vectorDbPath);
      
      // Load existing data if it exists
      if (await fs.pathExists(this.dataPath)) {
        await this.loadData();
        console.log(`Vector database loaded with ${this.documents.length} documents`);
      } else {
        this.documents = [];
        this.embeddings = [];
        this.metadatas = [];
        console.log('Vector database initialized');
      }

      // Start file watching
      this.startFileWatching();
    } catch (error) {
      console.error('Error initializing vector database:', error);
      throw error;
    }
  }

  startFileWatching() {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(this.knowledgeBasePath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('add', (filePath) => {
        console.log(`File added: ${filePath}`);
        this.handleFileChange('add', filePath);
      })
      .on('change', (filePath) => {
        console.log(`File changed: ${filePath}`);
        this.handleFileChange('change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`File removed: ${filePath}`);
        this.handleFileChange('unlink', filePath);
      })
      .on('error', (error) => {
        console.error('File watcher error:', error);
      });

    console.log(`Watching knowledge base directory: ${this.knowledgeBasePath}`);
  }

  async handleFileChange(eventType, filePath) {
    if (this.isProcessing) {
      console.log('Already processing files, skipping...');
      return;
    }

    this.isProcessing = true;
    try {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName).toLowerCase();
      const fileNameLower = fileName.toLowerCase();
      const excludedFiles = ['.gitkeep', '.DS_Store', 'Thumbs.db', '.gitignore'];
      
      // Skip unsupported files and system files
      if (!['.pdf', '.txt', '.md', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(fileExt) || 
          excludedFiles.includes(fileNameLower) ||
          fileNameLower.startsWith('.')) {
        console.log(`Skipping unsupported/system file: ${fileName}`);
        return;
      }

      if (eventType === 'add' || eventType === 'change') {
        console.log(`Processing ${eventType} file: ${fileName}`);
        await this.processDocument(filePath, fileName);
        console.log(`Successfully processed ${fileName}`);
      } else if (eventType === 'unlink') {
        console.log(`Removing file from database: ${fileName}`);
        this.removeDocumentEntries(fileName);
        await this.saveData();
        console.log(`Successfully removed ${fileName} from database`);
      }
    } catch (error) {
      console.error(`Error handling file change for ${filePath}:`, error);
    } finally {
      this.isProcessing = false;
    }
  }

  async generateEmbedding(text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      
      // Use error handler for API call with retry logic
      const result = await GeminiErrorHandler.handleApiCall(
        () => model.embedContent(text),
        'Embedding Generation',
        3, // retries
        2000 // base delay (2 seconds)
      );
      
      return result.embedding.values;
    } catch (error) {
      console.error('[VECTOR] Error generating embedding:', error);
      
      // For embeddings, we might want to skip the problematic chunk rather than fail entirely
      const publicMessage = GeminiErrorHandler.getPublicErrorMessage(error);
      const embeddingError = new Error(`Embedding generation failed: ${publicMessage}`);
      embeddingError.originalError = error;
      embeddingError.context = 'embedding_generation';
      
      throw embeddingError;
    }
  }

  async chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);
      
      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.5) {
          chunk = text.slice(start, start + breakPoint + 1);
          start = start + breakPoint + 1;
        } else {
          start = end - overlap;
        }
      } else {
        start = end;
      }
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  async processDocument(filePath, fileName) {
    try {
      const ext = path.extname(fileName).toLowerCase();
      let text = '';

      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (ext === '.docx') {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (ext === '.txt' || ext === '.md') {
        text = await fs.readFile(filePath, 'utf8');
      } else if (ext === '.ppt' || ext === '.pptx') {
        // Parse PowerPoint files
        text = await officeParser.parseOffice(filePath);
      } else if (ext === '.xls' || ext === '.xlsx') {
        // Parse Excel files
        const workbook = xlsx.readFile(filePath);
        let allText = '';
        
        // Extract text from all worksheets
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = xlsx.utils.sheet_to_csv(worksheet, { header: 1 });
          allText += `\n--- Sheet: ${sheetName} ---\n${sheetText}\n`;
        });
        
        text = allText;
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      // Clean and chunk the text
      const cleanedText = text.replace(/\s+/g, ' ').trim();
      const chunks = await this.chunkText(cleanedText);
      
      // Generate embeddings and store
      let successfulChunks = 0;
      let failedChunks = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const embedding = await this.generateEmbedding(chunk);
          
          this.embeddings.push(embedding);
          this.documents.push(chunk);
          this.metadatas.push({
            source: fileName,
            chunk_index: i,
            total_chunks: chunks.length
          });
          
          successfulChunks++;
        } catch (error) {
          failedChunks++;
          console.error(`[VECTOR] Failed to process chunk ${i} of ${fileName}:`, error.message);
          
          // Continue processing other chunks instead of failing entirely
          // This allows partial document processing even if some chunks fail
        }
      }
      
      if (failedChunks > 0) {
        console.warn(`[VECTOR] ${fileName}: ${successfulChunks} chunks processed successfully, ${failedChunks} chunks failed`);
      }

      // Save the updated data
      await this.saveData();

      console.log(`Processed ${fileName}: ${successfulChunks} chunks added successfully`);
      return { success: true, chunks: chunks.length };
    } catch (error) {
      console.error(`Error processing document ${fileName}:`, error);
      throw error;
    }
  }

  async processKnowledgeBase(knowledgeBasePath) {
    try {
      const files = await fs.readdir(knowledgeBasePath);
      const supportedExtensions = ['.pdf', '.txt', '.md', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
      const excludedFiles = ['.gitkeep', '.DS_Store', 'Thumbs.db', '.gitignore'];
      
      const supportedFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        const fileName = file.toLowerCase();
        
        // Include files with supported extensions and exclude system files
        return supportedExtensions.includes(ext) && 
               !excludedFiles.includes(fileName) &&
               !fileName.startsWith('.');
      });

      console.log(`Found ${supportedFiles.length} supported files to process`);

      // Get existing file sources to avoid duplicates
      const existingSources = new Set(this.metadatas.map(meta => meta.source));
      let processedCount = 0;
      let skippedCount = 0;

      for (const file of supportedFiles) {
        if (existingSources.has(file)) {
          console.log(`Skipping ${file} - already processed`);
          skippedCount++;
          continue;
        }
        
        const filePath = path.join(knowledgeBasePath, file);
        await this.processDocument(filePath, file);
        processedCount++;
      }

      console.log(`Processed ${processedCount} new files, skipped ${skippedCount} existing files`);
      return { success: true, processedFiles: processedCount, skippedFiles: skippedCount };
    } catch (error) {
      console.error('Error processing knowledge base:', error);
      throw error;
    }
  }

  async searchSimilar(query, limit = 5) {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate cosine similarity for all documents
      const similarities = this.embeddings.map((embedding, index) => {
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return { index, similarity };
      });
      
      // Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      const results = similarities.slice(0, limit).map(({ index, similarity }) => ({
        content: this.documents[index],
        metadata: this.metadatas[index],
        distance: 1 - similarity // Convert similarity to distance
      }));
      
      return results;
    } catch (error) {
      console.error('Error searching vector database:', error);
      throw error;
    }
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getCollectionStats() {
    try {
      return { documentCount: this.documents.length };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      throw error;
    }
  }

  removeDocumentEntries(fileName) {
    const indicesToRemove = this.metadatas
      .map((meta, index) => (meta.source === fileName ? index : -1))
      .filter(index => index !== -1)
      .sort((a, b) => b - a); // Sort descending to remove without affecting earlier indices

    for (const index of indicesToRemove) {
      this.documents.splice(index, 1);
      this.embeddings.splice(index, 1);
      this.metadatas.splice(index, 1);
    }
  }

  async clearDatabase() {
    try {
      this.documents = [];
      this.embeddings = [];
      this.metadatas = [];
      await this.saveData();
      console.log('Vector database cleared');
      return { success: true, message: 'Database cleared' };
    } catch (error) {
      console.error('Error clearing database:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  async saveData() {
    try {
      const data = {
        documents: this.documents,
        embeddings: this.embeddings,
        metadatas: this.metadatas
      };
      await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }

  async loadData() {
    try {
      const data = JSON.parse(await fs.readFile(this.dataPath, 'utf8'));
      this.documents = data.documents || [];
      this.embeddings = data.embeddings || [];
      this.metadatas = data.metadatas || [];
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }
}

module.exports = SimpleVectorService;
