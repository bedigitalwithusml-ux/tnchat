import serverless from 'serverless-http';
import app from '../../server.js';

const handlerInstance = serverless(app);

export const handler = async (event, context) => {
  try {
    return await handlerInstance(event, context);
  } catch (err) {
    console.error('[Netlify Function Error]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: { message: err.message || 'Internal Server Error' }
      })
    };
  }
};
