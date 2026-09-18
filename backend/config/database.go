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

	// Database Connection Pool Tuning for High Concurrent Performance (Supports 800 - 1000 concurrent students)
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(75)
		sqlDB.SetMaxOpenConns(300)
		sqlDB.SetConnMaxIdleTime(10 * time.Minute)
		sqlDB.SetConnMaxLifetime(time.Hour)
		log.Println("Database connection pool configured (MaxIdle: 75, MaxOpen: 300, MaxIdleTime: 10m)")
	}

	log.Println("Database connection established")
}
