//go:build ignore

package main

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

var nonDigitRegex = regexp.MustCompile(`\D`)

func cleanDigits(s string) string {
	return nonDigitRegex.ReplaceAllString(s, "")
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	fmt.Println("==================================================")
	fmt.Println("IMPORTING GURU AND MAPEL TO DATABASE")
	fmt.Println("==================================================")

	// 1. Seed Guru
	fGuru, err := excelize.OpenFile("d:/AppUjian/Guru_Smkn1Beringin.xlsx")
	if err != nil {
		log.Fatalf("Gagal membuka file Guru: %v", err)
	}
	defer fGuru.Close()

	guruRows, err := fGuru.GetRows("Sheet1")
	if err != nil {
		log.Fatalf("Gagal membaca Sheet1 Guru: %v", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("guru123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hash password: %v", err)
	}

	guruCount := 0
	guruUpdated := 0

	for i, r := range guruRows {
		if i == 0 {
			continue // Skip header
		}
		nipRaw := ""
		if len(r) > 1 {
			nipRaw = strings.TrimSpace(r[1])
		}
		nuptkRaw := ""
		if len(r) > 2 {
			nuptkRaw = strings.TrimSpace(r[2])
		}
		name := ""
		if len(r) > 3 {
			name = strings.TrimSpace(r[3])
		}

		if name == "" {
			continue
		}

		cleanNIP := cleanDigits(nipRaw)
		cleanNUPTK := cleanDigits(nuptkRaw)

		finalNIP := cleanNIP
		if finalNIP == "" {
			if cleanNUPTK != "" {
				finalNIP = cleanNUPTK
			} else {
				finalNIP = fmt.Sprintf("GURU%03d", i)
			}
		}

		username := strings.ToLower(finalNIP)

		// Check if user with username or teacher with finalNIP already exists
		var existingUser models.User
		errUser := config.DB.Where("username = ?", username).First(&existingUser).Error

		var existingTeacher models.Teacher
		errTeacher := config.DB.Where("nip = ?", finalNIP).First(&existingTeacher).Error

		if errUser == nil && errTeacher == nil {
			// Update name if changed
			existingUser.Name = name
			config.DB.Save(&existingUser)
			guruUpdated++
			continue
		}

		// Also check if user with same name exists (like existing Sumarno)
		var userByName models.User
		if err := config.DB.Where("name ILIKE ? AND role = ?", "%"+strings.Split(name, ",")[0]+"%", models.RoleTeacher).First(&userByName).Error; err == nil {
			// Found by name, update teacher NIP if needed
			var t models.Teacher
			if err := config.DB.Where("user_id = ?", userByName.ID).First(&t).Error; err == nil {
				t.NIP = finalNIP
				config.DB.Save(&t)
				userByName.Name = name
				config.DB.Save(&userByName)
				guruUpdated++
				continue
			}
		}

		// Create User & Teacher
		tx := config.DB.Begin()

		user := models.User{
			Username: username,
			Password: string(hashedPassword),
			Name:     name,
			Role:     models.RoleTeacher,
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			fmt.Printf("Gagal buat User guru '%s' (%s): %v\n", name, username, err)
			continue
		}

		teacher := models.Teacher{
			UserID: user.ID,
			NIP:    finalNIP,
		}

		if err := tx.Create(&teacher).Error; err != nil {
			tx.Rollback()
			fmt.Printf("Gagal buat Teacher guru '%s' (%s): %v\n", name, finalNIP, err)
			continue
		}

		tx.Commit()
		guruCount++
	}

	fmt.Printf("Guru berhasil diproses: %d baru ditambahkan, %d diperbarui.\n", guruCount, guruUpdated)

	// 2. Seed Mapel / Subjects
	fMapel, err := excelize.OpenFile("d:/AppUjian/Mapel_Smkn1Beringin.xlsx")
	if err != nil {
		log.Fatalf("Gagal membuka file Mapel: %v", err)
	}
	defer fMapel.Close()

	mapelRows, err := fMapel.GetRows("Sheet1")
	if err != nil {
		log.Fatalf("Gagal membaca Sheet1 Mapel: %v", err)
	}

	academicCodes := map[string]bool{
		"PAIBP":  true,
		"PAKRBP": true,
		"PAKGBP": true,
		"PAKHBP": true,
		"PP":     true,
		"BI":     true,
		"PJOK":   true,
		"SJ":     true,
		"SM":     true,
		"CS":     true,
		"BM":     true,
		"MM":     true,
		"BING":   true,
		"PIPAS":  true,
		"SOS":    true,
		"INF":    true,
		"SR":     true,
	}

	mapelCount := 0
	mapelUpdated := 0

	for i, r := range mapelRows {
		if i == 0 {
			continue // Skip header
		}
		code := ""
		if len(r) > 1 {
			code = strings.TrimSpace(r[1])
		}
		name := ""
		if len(r) > 2 {
			name = strings.TrimSpace(r[2])
		}

		if name == "" {
			continue
		}

		subType := "JURUSAN"
		if academicCodes[strings.ToUpper(code)] {
			subType = "AKADEMIK"
		}

		// Check if subject already exists
		var existingSubject models.Subject
		if err := config.DB.Where("LOWER(name) = ?", strings.ToLower(name)).First(&existingSubject).Error; err == nil {
			// Update type if needed
			existingSubject.Type = subType
			config.DB.Save(&existingSubject)
			mapelUpdated++
			continue
		}

		subject := models.Subject{
			Name:  name,
			Type:  subType,
			Class: "Semua Kelas",
		}

		if err := config.DB.Create(&subject).Error; err != nil {
			fmt.Printf("Gagal buat Mapel '%s': %v\n", name, err)
			continue
		}

		mapelCount++
	}

	fmt.Printf("Mapel berhasil diproses: %d baru ditambahkan, %d diperbarui.\n", mapelCount, mapelUpdated)

	// Summary
	var totalTeachers int64
	var totalSubjects int64
	config.DB.Model(&models.Teacher{}).Count(&totalTeachers)
	config.DB.Model(&models.Subject{}).Count(&totalSubjects)
	fmt.Printf("\nTOTAL DATA SAAT INI DI DATABASE:\n- Guru: %d orang\n- Mata Pelajaran: %d mapel\n", totalTeachers, totalSubjects)
}
