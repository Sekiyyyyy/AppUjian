package main

import (
	"fmt"
	"log"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	passwordPlain := "pengawas123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwordPlain), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hashing password: %v", err)
	}

	createdCount := 0
	updatedCount := 0

	for i := 1; i <= 50; i++ {
		username := fmt.Sprintf("ruang%d", i)
		name := fmt.Sprintf("Ruang %d", i)

		var existingUser models.User
		err := config.DB.Where("username = ?", username).First(&existingUser).Error

		if err == nil {
			// User exists, update
			existingUser.Name = name
			existingUser.Password = string(hashedPassword)
			existingUser.Role = models.RoleTeacher
			if err := config.DB.Save(&existingUser).Error; err != nil {
				log.Printf("Gagal update user %s: %v\n", username, err)
				continue
			}

			var teacher models.Teacher
			if err := config.DB.Where("user_id = ?", existingUser.ID).First(&teacher).Error; err == nil {
				teacher.TokenPassword = passwordPlain
				teacher.Jabatan = "Guru"
				config.DB.Save(&teacher)
			} else {
				teacher = models.Teacher{
					UserID:        existingUser.ID,
					TokenPassword: passwordPlain,
					Jabatan:       "Guru",
				}
				config.DB.Create(&teacher)
			}
			updatedCount++
		} else {
			// Create new user
			newUser := models.User{
				Username: username,
				Password: string(hashedPassword),
				Name:     name,
				Role:     models.RoleTeacher,
			}

			tx := config.DB.Begin()
			if err := tx.Create(&newUser).Error; err != nil {
				tx.Rollback()
				log.Printf("Gagal buat user %s: %v\n", username, err)
				continue
			}

			newTeacher := models.Teacher{
				UserID:        newUser.ID,
				TokenPassword: passwordPlain,
				Jabatan:       "Guru",
			}

			if err := tx.Create(&newTeacher).Error; err != nil {
				tx.Rollback()
				log.Printf("Gagal buat teacher record untuk %s: %v\n", username, err)
				continue
			}

			tx.Commit()
			createdCount++
		}
	}

	fmt.Printf("✅ Selesai! Berhasil membuat %d akun baru dan memperbarui %d akun guru (ruang1 - ruang50).\n", createdCount, updatedCount)
	fmt.Printf("Password semua akun: %s\n", passwordPlain)
}
