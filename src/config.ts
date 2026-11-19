import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  templatesDir: path.resolve(process.env.TEMPLATES_DIR || './templates'),
  outputDir: path.resolve(process.env.OUTPUT_DIR || './generated_docs'),

  gotenbergUrl: process.env.GOTENBERG_URL || 'http://localhost:3000',

  esign: {
    provider: (process.env.ESIGN_PROVIDER || 'MOCK').toUpperCase() as 'MOCK' | 'DIGIO' | 'LEEGALITY' | 'DOCUSIGN',
    webhookSecret: process.env.WEBHOOK_SIGNING_SECRET || 'fingrid_webhook_secret_dev_key',

    digio: {
      clientId: process.env.DIGIO_CLIENT_ID || '',
      clientSecret: process.env.DIGIO_CLIENT_SECRET || '',
      environment: process.env.DIGIO_ENVIRONMENT || 'sandbox',
    },

    leegality: {
      authToken: process.env.LEEGALITY_AUTH_TOKEN || '',
      environment: process.env.LEEGALITY_ENVIRONMENT || 'sandbox',
    },

    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID || '',
      clientId: process.env.DOCUSIGN_CLIENT_ID || '',
      clientSecret: process.env.DOCUSIGN_CLIENT_SECRET || '',
      baseUrl: process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi',
    },
  },
};
