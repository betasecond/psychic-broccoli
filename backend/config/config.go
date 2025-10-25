package config

import (
	"os"
)

// Config 应用配置
type Config struct {
	ServerPort string
	DBPath     string
	JWTSecret  string
}

// Load 加载配置
func Load() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		DBPath:     getEnv("DB_PATH", "./database/education.db"),
		JWTSecret:  getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
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

