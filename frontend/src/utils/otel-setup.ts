import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const initFrontendTracer = () => {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'courseark-frontend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
  });

  // 使用 OTLP 导出器 (如果后端配置了 Collector) 
  // 演示环境默认先配置，即使没有 Collector 也不影响 UI 渲染
  const exporter = new OTLPTraceExporter({
    url: '/api/v1/otel/traces',
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new FetchInstrumentation({
        ignoreUrls: [/localhost:5173/],
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
    ],
  });

  console.log('[OTEL] Frontend Tracing Initialized.');
};
