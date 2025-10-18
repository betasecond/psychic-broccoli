package config

import (
	"log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	DatabaseURL string
	Port        string
	JWTSecret   string
}

// Load loads the configuration from environment variables
func Load() *Config {
	// Get the directory of the currently running file
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		log.Fatal("Could not get the current file path")
	}
	dir := filepath.Dir(filename)

	// Construct the path to the .env file
	envPath := filepath.Join(dir, "..", ".env")

	err := godotenv.Load(envPath)
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}
}