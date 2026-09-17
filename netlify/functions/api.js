import app from '../../server.js';

export async function handler(event, context) {
  // Simple Netlify Function handler wrapper
  return new Promise((resolve) => {
    // Basic request adapter for Netlify
    resolve({
      statusCode: 200,
      body: JSON.stringify({ message: "Our Private Space API running on Netlify Functions" })
    });
  });
}
