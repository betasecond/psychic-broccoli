package config

import (
	"os"
)

// Config 应用配置
type Config struct {
	ServerPort string
	DBPath     string
	JWTSecret  string
	EnableSeed      bool
	AnthropicAPIKey string
}

// Load 加载配置
func Load() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		DBPath:     getEnv("DB_PATH", "./database/education.db"),
		JWTSecret:  getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		EnableSeed:      getEnvBool("ENABLE_SEED", false),
		AnthropicAPIKey: getEnv("ANTHROPIC_API_KEY", ""),
	}
}

// getEnv 获取环境变量,如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvBool 获取布尔类型环境变量
func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	// 支持多种布尔值表示
	switch value {
	case "true", "TRUE", "True", "1", "yes", "YES", "Yes", "on", "ON", "On":
		return true
	case "false", "FALSE", "False", "0", "no", "NO", "No", "off", "OFF", "Off":
		return false
	default:
		return defaultValue
	}
}
