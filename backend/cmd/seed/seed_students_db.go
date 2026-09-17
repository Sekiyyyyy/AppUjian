package main

import (
	"fmt"
	"log"
	"strings"
	"crypto/rand"
	"math/big"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

func GenerateRandomString(n int) string {
	const letters = "0123456789"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		ret[i] = letters[num.Int64()]
	}
	return string(ret)
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	var classes []models.Class
	config.DB.Find(&classes)
	
	classMap := make(map[string]uint)
	for _, c := range classes {
		// e.g. "X PPLG 1" -> "X_PPLG_1"
		// The db has level="X", department="PPLG", number="1"
		// The sheet has "X_PPLG_1" or "X_Kuliner_1" (case insensitive)
		key := strings.ToLower(fmt.Sprintf("%s_%s_%s", c.Level, c.Department, c.Number))
		key = strings.TrimSuffix(key, "_") // remove trailing underscore if number is empty
		classMap[key] = c.ID
	}

	customMapping := map[string]uint{
		"x_tkjt_2": 16,
		"xi_ulw": 18,
		"xii_ulw": 32,
	}
	for k, v := range customMapping {
		classMap[k] = v
	}

	files := []string{
		"../Data_Siswa_Kelas_X_Smkn1Beringin.xlsx",
		"../Data_Siswa_Kelas_XI_Smkn1Beringin.xlsx",
		"../Data_Siswa_Kelas_XII_Smkn1Beringin.xlsx",
	}

	totalInserted := 0
	for _, file := range files {
		f, err := excelize.OpenFile(file)
		if err != nil {
			log.Println("Error opening file:", err)
			continue
		}

		for _, sheetName := range f.GetSheetMap() {
			key := strings.ToLower(sheetName)
			classID, exists := classMap[key]
			if !exists {
				log.Printf("WARN: Class not found for sheet %s (key: %s)", sheetName, key)
				continue
			}

			rows, err := f.GetRows(sheetName)
			if err != nil {
				continue
			}

			// skip header (row 0)
			for i, row := range rows {
				if i == 0 {
					continue
				}
				// Format: No | NISN | Nama Siswa | Agama | Jenis Kelamin
				if len(row) < 5 {
					continue
				}

				nisn := strings.TrimSpace(row[1])
				nama := strings.TrimSpace(row[2])
				agama := strings.TrimSpace(row[3])
				jk := strings.TrimSpace(row[4])

				if nisn == "" || nama == "" {
					continue
				}

				tokenUsername := GenerateRandomString(7)
				tokenPassword := GenerateRandomString(7)
				hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(tokenPassword), bcrypt.DefaultCost)

				user := models.User{
					Username: tokenUsername,
					Password: string(hashedPassword),
					Name:     nama,
					Role:     models.RoleStudent,
				}

				tx := config.DB.Begin()
				if err := tx.Create(&user).Error; err != nil {
					tx.Rollback()
					log.Printf("Error creating user %s: %v", nama, err)
					continue
				}

				student := models.Student{
					UserID:       user.ID,
					NISN:         nisn,
					ClassID:      classID,
					Agama:        agama,
					JenisKelamin: jk,
					TokenPassword: tokenPassword,
				}

				if err := tx.Create(&student).Error; err != nil {
					tx.Rollback()
					log.Printf("Error creating student %s: %v", nama, err)
					continue
				}

				tx.Commit()
				totalInserted++
			}
			log.Printf("Imported sheet %s successfully", sheetName)
		}
		f.Close()
	}

	fmt.Printf("\nSUCCESS! Total %d students inserted to DB.\n", totalInserted)
}
