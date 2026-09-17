package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	var students []models.Student
	if err := config.DB.Find(&students).Error; err != nil {
		log.Fatalf("Failed to fetch students: %v", err)
	}

	updatedCount := 0
	tx := config.DB.Begin()

	for _, student := range students {
		nisn := strings.TrimSpace(student.NISN)
		if len(nisn) < 10 && len(nisn) > 0 {
			// Pad with leading zeros until length is 10
			paddedNisn := fmt.Sprintf("%010s", nisn)
			
			// Update the student
			if err := tx.Model(&models.Student{}).Where("id = ?", student.ID).Update("nisn", paddedNisn).Error; err != nil {
				tx.Rollback()
				log.Fatalf("Failed to update student %d: %v", student.ID, err)
			}
			updatedCount++
			fmt.Printf("Updated NISN: %s -> %s\n", nisn, paddedNisn)
		}
	}

	if err := tx.Commit().Error; err != nil {
		log.Fatalf("Failed to commit transaction: %v", err)
	}

	fmt.Printf("\nSUCCESS! Total %d students' NISN fixed.\n", updatedCount)
}
