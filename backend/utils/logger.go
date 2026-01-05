package utils

import (
	"context"
	"os"

	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Logger *zap.Logger

// InitLogger 初始化Zap日志
func InitLogger() {
	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.TimeKey = "timestamp"
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder

	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		zapcore.Lock(os.Stdout),
		zap.InfoLevel,
	)

	Logger = zap.New(core, zap.AddCaller())
}

// GetLogger 获取全局Logger
func GetLogger() *zap.Logger {
	if Logger == nil {
		InitLogger()
	}
	return Logger
}

// InfoContext 记录带上下文的Info日志
func InfoContext(ctx context.Context, msg string, fields ...zap.Field) {
	if Logger == nil {
		InitLogger()
	}
	Logger.Info(msg, append(fields, getTraceFields(ctx)...)...)
}

// ErrorContext 记录带上下文的Error日志
func ErrorContext(ctx context.Context, msg string, fields ...zap.Field) {
	if Logger == nil {
		InitLogger()
	}
	Logger.Error(msg, append(fields, getTraceFields(ctx)...)...)
}

// WarnContext 记录带上下文的Warn日志
func WarnContext(ctx context.Context, msg string, fields ...zap.Field) {
	if Logger == nil {
		InitLogger()
	}
	Logger.Warn(msg, append(fields, getTraceFields(ctx)...)...)
}

// DebugContext 记录带上下文的Debug日志
func DebugContext(ctx context.Context, msg string, fields ...zap.Field) {
	if Logger == nil {
		InitLogger()
	}
	Logger.Debug(msg, append(fields, getTraceFields(ctx)...)...)
}

// getTraceFields 从context提取TraceID和SpanID
func getTraceFields(ctx context.Context) []zap.Field {
	if ctx == nil {
		return []zap.Field{}
	}
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return []zap.Field{}
	}
	return []zap.Field{
		zap.String("trace_id", span.SpanContext().TraceID().String()),
		zap.String("span_id", span.SpanContext().SpanID().String()),
	}
}
