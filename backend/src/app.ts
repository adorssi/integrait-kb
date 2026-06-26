import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/error-handler';
import authRouter from './routes/auth-router';
import clientRouter from './routes/client-router';
import technicianRouter from './routes/technician-router';
import tagRouter from './routes/tag-router';
import incidentRouter from './routes/incident-router';
import backupRouter from './routes/backup-router';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/clients', clientRouter);
app.use('/technicians', technicianRouter);
app.use('/tags', tagRouter);
app.use('/incidents', incidentRouter);
app.use('/backups', backupRouter);

app.use(errorHandler);

export default app;
