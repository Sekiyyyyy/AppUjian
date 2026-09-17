package main

import (
	"fmt"
	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	var classes []models.Class
	config.DB.Find(&classes)

	for _, c := range classes {
		fmt.Printf("DB Class: %s %s %s (ID: %d)\n", c.Level, c.Department, c.Number, c.ID)
	}
}
