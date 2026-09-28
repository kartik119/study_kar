// @ts-nocheck
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { app } from './app';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Study Karnataka API Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health and http://localhost:${PORT}/api/v1/health`);
});
