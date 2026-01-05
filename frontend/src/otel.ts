import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// 初始化Tracer Provider
// 使用 resourceFromAttributes 替代 new Resource
const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'frontend-service',
  }),
});

// 添加Console Exporter (用于开发调试)
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

// 注册Provider
// 使用默认的 context manager (StackContextManager)，不需要引入 Zone.js
provider.register();

// 注册自动插桩
registerInstrumentations({
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new FetchInstrumentation({
      // 允许向以下URL注入Trace Header (CORS)
      propagateTraceHeaderCorsUrls: [
        new RegExp('.*'), // 允许所有URL (或者指定后端URL)
      ],
      clearTimingResources: true,
    }),
  ],
});

console.log('OpenTelemetry Initialized');
