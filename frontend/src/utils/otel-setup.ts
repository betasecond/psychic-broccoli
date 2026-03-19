import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export const initFrontendTracer = () => {
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'courseark-frontend',
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
