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

func sanitizeUsername(name string, rowIdx int) string {
	// e.g. "Darmawan, S.Pd" -> "darmawan"
	parts := strings.Split(name, ",")
	clean := strings.ToLower(strings.TrimSpace(parts[0]))
	// remove titles like dra., drs., ir., etc.
	clean = strings.TrimPrefix(clean, "dra. ")
	clean = strings.TrimPrefix(clean, "drs. ")
	clean = strings.TrimPrefix(clean, "dr. ")
	clean = strings.TrimPrefix(clean, "ir. ")
	clean = strings.TrimPrefix(clean, "hj. ")
	clean = strings.TrimPrefix(clean, "h. ")
	clean = strings.ReplaceAll(clean, " ", ".")
	reg := regexp.MustCompile(`[^a-z0-9.]`)
	clean = reg.ReplaceAllString(clean, "")
	clean = strings.Trim(clean, ".")
	if clean == "" {
		return fmt.Sprintf("guru%03d", rowIdx)
	}
	return clean
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	fmt.Println("==================================================")
	fmt.Println("1. RUNNING DATABASE MIGRATION FOR TEACHER SCHEMA")
	fmt.Println("==================================================")

	// Execute DB schema adjustments directly
	migrations := []string{
		"ALTER TABLE teachers ADD COLUMN IF NOT EXISTS nuptk text;",
		"ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jabatan varchar(100) DEFAULT 'Guru';",
		"DROP INDEX IF EXISTS idx_teachers_n_ip;",
		"ALTER TABLE teachers ALTER COLUMN n_ip DROP NOT NULL;",
	}

	for _, query := range migrations {
		if err := config.DB.Exec(query).Error; err != nil {
			log.Printf("Warning executing '%s': %v", query, err)
		} else {
			fmt.Printf("✓ Executed: %s\n", query)
		}
	}

	fmt.Println("\n==================================================")
	fmt.Println("2. READING GURU EXCEL FILE (Guru_Smkn1Beringin.xlsx)")
	fmt.Println("==================================================")

	filePath := "d:/AppUjian/Guru_Smkn1Beringin.xlsx"
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		f, err = excelize.OpenFile("../../Guru_Smkn1Beringin.xlsx")
		if err != nil {
			log.Fatalf("Gagal membuka file Excel Guru: %v", err)
		}
	}
	defer f.Close()

	rows, err := f.GetRows("Sheet1")
	if err != nil {
		log.Fatalf("Gagal membaca Sheet1: %v", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("guru123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hash password: %v", err)
	}

	fmt.Printf("Total rows in Excel: %d (termasuk header)\n", len(rows))

	inserted := 0
	updated := 0

	for i, r := range rows {
		if i == 0 {
			continue // Skip Header: No | NIP | NUPTK | Nama Guru | Jabatan
		}
		if len(r) == 0 {
			continue
		}

		excelNo := ""
		nip := ""
		nuptk := ""
		namaGuru := ""
		jabatan := "Guru"

		if len(r) > 0 {
			excelNo = strings.TrimSpace(r[0])
		}
		if len(r) > 1 {
			nip = strings.TrimSpace(r[1])
		}
		if len(r) > 2 {
			nuptk = strings.TrimSpace(r[2])
		}
		if len(r) > 3 {
			namaGuru = strings.TrimSpace(r[3])
		}
		if len(r) > 4 && strings.TrimSpace(r[4]) != "" {
			jabatan = strings.TrimSpace(r[4])
		}

		if namaGuru == "" {
			continue
		}

		// Normalize empty nip/nuptk
		if nip == "-" {
			nip = ""
		}
		if nuptk == "-" {
			nuptk = ""
		}

		// Determine login username
		cleanNIPDigits := cleanDigits(nip)
		cleanNUPTKDigits := cleanDigits(nuptk)

		var preferredUsername string
		if cleanNIPDigits != "" {
			preferredUsername = cleanNIPDigits
		} else if cleanNUPTKDigits != "" {
			preferredUsername = cleanNUPTKDigits
		} else {
			preferredUsername = sanitizeUsername(namaGuru, i)
		}

		// Check if user already exists by name or username
		var existingUser models.User
		errUser := config.DB.Where("name ILIKE ? AND role = ?", "%"+strings.Split(namaGuru, ",")[0]+"%", models.RoleTeacher).First(&existingUser).Error

		if errUser != nil {
			// Try by username
			errUser = config.DB.Where("username = ?", preferredUsername).First(&existingUser).Error
		}

		if errUser == nil {
			// Update existing user & teacher
			existingUser.Name = namaGuru
			config.DB.Save(&existingUser)

			var teacher models.Teacher
			if err := config.DB.Where("user_id = ?", existingUser.ID).First(&teacher).Error; err == nil {
				teacher.NIP = nip
				teacher.NUPTK = nuptk
				teacher.Jabatan = jabatan
				config.DB.Save(&teacher)
				updated++
			} else {
				teacher = models.Teacher{
					UserID:  existingUser.ID,
					NIP:     nip,
					NUPTK:   nuptk,
					Jabatan: jabatan,
				}
				config.DB.Create(&teacher)
				updated++
			}
			continue
		}

		// Ensure username is unique for new user
		finalUsername := preferredUsername
		suffix := 1
		for {
			var count int64
			config.DB.Model(&models.User{}).Where("username = ?", finalUsername).Count(&count)
			if count == 0 {
				break
			}
			finalUsername = fmt.Sprintf("%s%d", preferredUsername, suffix)
			suffix++
		}

		// Create User and Teacher in transaction
		tx := config.DB.Begin()

		newUser := models.User{
			Username: finalUsername,
			Password: string(hashedPassword),
			Name:     namaGuru,
			Role:     models.RoleTeacher,
		}

		if err := tx.Create(&newUser).Error; err != nil {
			tx.Rollback()
			fmt.Printf("Gagal buat User guru '%s': %v\n", namaGuru, err)
			continue
		}

		newTeacher := models.Teacher{
			UserID:  newUser.ID,
			NIP:     nip,
			NUPTK:   nuptk,
			Jabatan: jabatan,
		}

		if err := tx.Create(&newTeacher).Error; err != nil {
			tx.Rollback()
			fmt.Printf("Gagal buat Teacher '%s': %v\n", namaGuru, err)
			continue
		}

		tx.Commit()
		inserted++

		if i <= 5 || i >= len(rows)-5 {
			fmt.Printf("[%s] Berhasil: %s | NIP: %s | NUPTK: %s | Jabatan: %s | User: %s\n",
				excelNo, namaGuru, nip, nuptk, jabatan, finalUsername)
		}
	}

	fmt.Printf("\n=== SELESAI ===\nTotal Guru Diperbarui: %d\nTotal Guru Baru Ditambahkan: %d\n", updated, inserted)
}
