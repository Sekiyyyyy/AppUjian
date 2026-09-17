package config

import (
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB(cfg *Config) {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB = db

	// Database Connection Pool Tuning for High Concurrent Performance
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(25)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		log.Println("Database connection pool configured (MaxIdle: 25, MaxOpen: 100)")
	}

	log.Println("Database connection established")
}
