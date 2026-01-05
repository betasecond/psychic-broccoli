package utils

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdoutmetric"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.20.0"
)

// InitTelemetry 初始化OpenTelemetry
func InitTelemetry(serviceName string) (func(context.Context) error, error) {
	// 创建资源
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			"", // 留空 SchemaURL，让 SDK 自行处理或默认为空，避免冲突
			semconv.ServiceName(serviceName),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("创建资源失败: %w", err)
	}

	// 1. 设置 TracerProvider (Stdout Exporter)
	traceExporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		return nil, fmt.Errorf("创建 Trace Exporter 失败: %w", err)
	}

	tracerProvider := trace.NewTracerProvider(
		trace.WithBatcher(traceExporter),
		trace.WithResource(res),
	)
	otel.SetTracerProvider(tracerProvider)

	// 2. 设置 TextMapPropagator (用于跨服务上下文传播)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// 3. 设置 MeterProvider (Stdout Exporter)
	metricExporter, err := stdoutmetric.New()
	if err != nil {
		return nil, fmt.Errorf("创建 Metric Exporter 失败: %w", err)
	}

	meterProvider := metric.NewMeterProvider(
		metric.WithReader(metric.NewPeriodicReader(metricExporter)),
		metric.WithResource(res),
	)
	otel.SetMeterProvider(meterProvider)

	// 返回清理函数
	return func(ctx context.Context) error {
		var errs error
		if err := tracerProvider.Shutdown(ctx); err != nil {
			errs = fmt.Errorf("trace shutdown: %w", err)
		}
		if err := meterProvider.Shutdown(ctx); err != nil {
			if errs != nil {
				errs = fmt.Errorf("%v; metric shutdown: %w", errs, err)
			} else {
				errs = fmt.Errorf("metric shutdown: %w", err)
			}
		}
		return errs
	}, nil
}
