package migrations

import (
	"log"
	"os"
	"strings"

	"github.com/jules-labs/online-edu/backend/database"
)

// Run runs the database migrations
func Run() {
	content, err := os.ReadFile("../document/sql.md")
	if err != nil {
		log.Fatalf("Could not read sql.md: %v", err)
	}

	queries := strings.Split(string(content), ";")
	for _, query := range queries {
		if strings.TrimSpace(query) == "" {
			continue
		}
		_, err := database.DB.Exec(query)
		if err != nil {
			log.Printf("Failed to execute query: %s\nError: %v", query, err)
		}
	}

	log.Println("Database migration completed.")

	seedContent, err := os.ReadFile("../document/seed.sql")
	if err != nil {
		log.Printf("Could not read seed.sql, skipping seeding: %v", err)
		return
	}

	seedQueries := strings.Split(string(seedContent), ";")
	for _, query := range seedQueries {
		if strings.TrimSpace(query) == "" {
			continue
		}
		_, err := database.DB.Exec(query)
		if err != nil {
			log.Printf("Failed to execute seed query: %s\nError: %v", query, err)
		}
	}

	log.Println("Database seeding completed.")
}