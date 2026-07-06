// Import essential libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app and configuration
const app = express();
const PORT = process.env.PORT || 3000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// Middleware
// Middleware: enable CORS, JSON parsing, and URL-encoded bodies
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Routes
// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Gavin Backend API' });
});

// Chat Route -> Proxy stream to Python AI Service
// Main chat route: forwards user messages to the Python AI service and streams back the response
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, profile, active_plan } = req.body;

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/chat/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history || [], profile: profile || null, active_plan: active_plan || null }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Service responded with status: ${aiResponse.status}`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    for await (const chunk of aiResponse.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.end();
    }
    console.error('Chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to communicate with AI Service.',
        details: error.message,
      });
    } else {
      res.end();
    }
  }
});

// Ensure an uploads directory exists for temporary file storage
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
const upload = multer({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });

// Chat Title Generation Route
// Generate a chat title by delegating to the AI service
app.post('/api/chat/title', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/chat/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Title generation error:', error);
    res.status(500).json({ error: 'Failed to generate title.', details: error.message });
  }
});

// History Summarization Route
// Summarize chat history via the AI service
app.post('/api/chat/summarize-history', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/chat/summarize-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('History summarization error:', error);
    res.status(500).json({ error: 'Failed to summarize history.', details: error.message });
  }
});

// Quiz Generation Route
// Generate quiz questions via the AI service
app.post('/api/quizzes/generate', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/quizzes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz.', details: error.message });
  }
});

// Flashcards Generation Route
// Generate flashcards via the AI service
app.post('/api/flashcards/generate', async (req, res) => {
  try {
    // Send request to AI service for flashcards
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/flashcards/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    // Validate response from AI service
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    // Parse response and return to client
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    // Log error and return error status
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards.', details: error.message });
  }
});

// Notes Summarise Route -> Forward file to Python AI Service
// Summarize uploaded notes; forwards the PDF to the AI service
app.post('/api/notes/summarize', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/notes/summarize`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    fs.unlinkSync(req.file.path);

    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Summarise error:', error);
    res.status(500).json({ error: 'Failed to summarise document.', details: error.message });
  }
});

// Document Upload Route -> Forward file to Python AI Service for indexing
// Upload generic documents for indexing by the AI service
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/documents/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    fs.unlinkSync(req.file.path);

    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process document upload.', details: error.message });
  }
});

// Library Search Route
// Search the knowledge library via the AI service
app.post('/api/library/search', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/library/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Library search error:', error);
    res.status(500).json({ error: 'Failed to search library.', details: error.message });
  }
});

// Study Plan Generation Route
// Generate a personalized study plan via the AI service
app.post('/api/planner/generate', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/planner/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Study plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate study plan.', details: error.message });
  }
});

// Generate Note from Topic
// Generate a note from a topic using the AI service
app.post('/api/notes/generate-from-topic', async (req, res) => {
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/notes/generate-from-topic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!aiResponse.ok) {
      const err = await aiResponse.json().catch(() => ({}));
      throw new Error(err.detail || `AI Service responded with ${aiResponse.status}`);
    }
    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Note generation error:', error);
    res.status(500).json({ error: 'Failed to generate note.', details: error.message });
  }
});

// Start Server
// Start the Express server on the configured port
app.listen(PORT, () => {
  console.log(`Gavin API Server running on port ${PORT}`);
});
