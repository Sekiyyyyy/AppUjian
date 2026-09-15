package main

import (
	"fmt"
	"log"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Load config and connect to DB
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	// 2. Check if admin already exists
	var count int64
	config.DB.Model(&models.User{}).Where("username = ?", "admin").Count(&count)
	
	if count > 0 {
		fmt.Println("Akun admin sudah ada di database.")
		return
	}

	// 3. Hash password "admin123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal melakukan hashing password: %v", err)
	}

	// 4. Create admin user
	adminUser := models.User{
		Username: "admin",
		Password: string(hashedPassword),
		Role:     models.RoleAdmin,
	}

	if err := config.DB.Create(&adminUser).Error; err != nil {
		log.Fatalf("Gagal membuat user admin: %v", err)
	}

	fmt.Println("✅ Sukses! Akun Super Admin berhasil dibuat di database PostgreSQL.")
	fmt.Println("Username: admin")
	fmt.Println("Password: admin123")
}
