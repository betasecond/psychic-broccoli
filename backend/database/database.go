package database

import (
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// DB is the database connection
var DB *sqlx.DB

// Connect connects to the database
func Connect(databaseURL string) {
	var err error
	DB, err = sqlx.Connect("postgres", databaseURL)
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}
}