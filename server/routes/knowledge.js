const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const knowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    cb(null, knowledgeBasePath);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only supported file types
    const allowedTypes = ['.pdf', '.txt', '.md', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported. Allowed types: ${allowedTypes.join(', ')}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Get list of files in knowledge base
router.get('/files', async (req, res) => {
  try {
    const knowledgeBasePath = path.join(__dirname, '../../knowledge-base');
    await fs.ensureDir(knowledgeBasePath);
    
    const files = await fs.readdir(knowledgeBasePath);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(knowledgeBasePath, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          type: path.extname(file).toLowerCase()
        };
      })
    );
    
    res.json({ files: fileStats });
  } catch (error) {
    console.error('Error listing knowledge base files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      details: error.message 
    });
  }
});

// Upload file to knowledge base
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ 
      message: 'File uploaded successfully',
      file: {
        name: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

// Delete file from knowledge base
router.delete('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../knowledge-base', filename);
    
    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await fs.remove(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});

// Create a new text file
router.post('/create-text', async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }
    
    // Ensure filename has .txt extension
    const finalFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    const filePath = path.join(__dirname, '../../knowledge-base', finalFilename);
    
    await fs.writeFile(filePath, content, 'utf8');
    res.json({ 
      message: 'Text file created successfully',
      filename: finalFilename
    });
  } catch (error) {
    console.error('Error creating text file:', error);
    res.status(500).json({ 
      error: 'Failed to create text file',
      details: error.message 
    });
  }
});

module.exports = router;
