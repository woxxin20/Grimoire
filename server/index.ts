import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { router as apiRouter } from './routes/memories.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach API Routes
app.use('/api', apiRouter);

// Serve static frontend files in production mode if dist exists
const frontendDist = path.join(process.cwd(), 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  MIND Personal AI Second Brain Engine active!`);
  console.log(`  Backend Listening on: http://localhost:${PORT}`);
  console.log(`  API Health endpoint:  http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
