import { initFrontendTracer } from './utils/otel-setup';

// Initialize the tracer in a modular way
try {
  initFrontendTracer();
} catch (error) {
  console.error('[OTEL] Error initializing frontend tracer:', error);
}
