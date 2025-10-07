import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Security headers plugin
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Security headers for development
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
          );
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Force HTTPS in development (optional, requires cert)
    // https: true,
    cors: {
      origin: process.env.VITE_ALLOWED_ORIGINS?.split(',') || true,
      credentials: true,
    },
  },
  build: {
    // Security: Enable source maps only in development
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        // Code splitting for better security and performance
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'openai': ['openai'],
        },
      },
    },
  },
});
