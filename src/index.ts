import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { documentRouter } from './routes/document.routes.js';
import { esignRouter } from './routes/esign.routes.js';
import { templateRouter } from './routes/template.routes.js';
import { TemplateLoader } from './engine/template-loader.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Preload partials and compile templates
TemplateLoader.getInstance().loadPartials();

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'fingrid-doc-engine',
    version: '1.0.0',
    esignProvider: config.esign.provider,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use(`${config.apiPrefix}/documents`, documentRouter);
app.use(`${config.apiPrefix}/esign`, esignRouter);
app.use(`${config.apiPrefix}/templates`, templateRouter);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 FinGrid Dynamic Document & eSign Engine Started`);
    console.log(`📡 Port: ${config.port}`);
    console.log(`📝 eSign Active Provider: ${config.esign.provider}`);
    console.log(`📂 Templates Directory: ${config.templatesDir}`);
    console.log(`🔗 API Base: http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`=======================================================`);
  });
}

export default app;
