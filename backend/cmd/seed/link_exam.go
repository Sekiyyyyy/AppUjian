package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/AppUjian/backend/config"
)

func main() {
	cfg := config.LoadConfig()
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Gagal: %v", err)
	}

	// Link Exam 5 to Class 40
	res := db.Exec("INSERT INTO exam_classes (exam_id, class_id) VALUES (5, 40) ON CONFLICT DO NOTHING")
	if res.Error != nil {
		log.Fatalf("Gagal insert exam_classes: %v", res.Error)
	}
	fmt.Printf("Rows affected in exam_classes: %d\n", res.RowsAffected)

	// Verify linkage
	var count int64
	db.Table("exam_classes").Where("exam_id = ? AND class_id = ?", 5, 40).Count(&count)
	fmt.Printf("Verification exam_classes (exam 5, class 40): %d linked\n", count)

	// Verify questions in exam
	var qCount int64
	db.Table("exam_questions").Where("exam_id = ?", 5).Count(&qCount)
	fmt.Printf("Verification exam_questions (exam 5): %d questions linked\n", qCount)
}
