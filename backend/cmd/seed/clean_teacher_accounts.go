package main

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

var titlesRegex = regexp.MustCompile(`(?i)\b(drs|dra|dr|prof|ir|h|hj|s\.pd|m\.pd|s\.kom|m\.kom|s\.t|m\.t|s\.si|m\.si|s\.ag|m\.ag|s\.sos|s\.e|m\.m|m\.b\.a|gr|ak|b\.a|s\.psi|m\.psi|s\.p|m\.p)\b\.?`)
var nonAlphaDotRegex = regexp.MustCompile(`[^a-z0-9.]`)
var multipleDotRegex = regexp.MustCompile(`\.+`)

func generateCleanUsername(name string, fallbackID uint) string {
	// 1. Take part before comma (usually name before degrees)
	parts := strings.Split(name, ",")
	mainName := parts[0]

	// 2. Remove common titles
	cleaned := titlesRegex.ReplaceAllString(mainName, "")

	// 3. Lowercase & trim
	cleaned = strings.ToLower(strings.TrimSpace(cleaned))

	// 4. Replace spaces with dots
	cleaned = strings.ReplaceAll(cleaned, " ", ".")

	// 5. Remove anything that isn't a-z, 0-9, or dot
	cleaned = nonAlphaDotRegex.ReplaceAllString(cleaned, "")

	// 6. Clean up multiple dots and trim dots from edges
	cleaned = multipleDotRegex.ReplaceAllString(cleaned, ".")
	cleaned = strings.Trim(cleaned, ".")

	if cleaned == "" || len(cleaned) < 3 {
		return fmt.Sprintf("guru%03d", fallbackID)
	}

	return cleaned
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)

	// Run auto migration to ensure column exists
	config.DB.AutoMigrate(&models.Teacher{})

	var teachers []models.Teacher
	if err := config.DB.Preload("User").Find(&teachers).Error; err != nil {
		log.Fatalf("Error fetching teachers: %v", err)
	}

	defaultPassword := "guru123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Error hashing password: %v", err)
	}

	usedUsernames := make(map[string]bool)
	// Reserve admin & student usernames if any
	var nonTeacherUsers []models.User
	config.DB.Where("role != ?", models.RoleTeacher).Find(&nonTeacherUsers)
	for _, u := range nonTeacherUsers {
		usedUsernames[u.Username] = true
	}

	fmt.Printf("Updating %d teachers with clean name-based usernames and default password 'guru123'...\n", len(teachers))

	updatedCount := 0
	for _, t := range teachers {
		baseUsername := generateCleanUsername(t.User.Name, t.ID)
		finalUsername := baseUsername

		counter := 2
		for usedUsernames[finalUsername] {
			finalUsername = fmt.Sprintf("%s%d", baseUsername, counter)
			counter++
		}
		usedUsernames[finalUsername] = true

		// Update User
		t.User.Username = finalUsername
		t.User.Password = string(hashedPassword)
		if err := config.DB.Save(&t.User).Error; err != nil {
			log.Printf("Failed to update user %s: %v", t.User.Name, err)
			continue
		}

		// Update Teacher TokenPassword
		t.TokenPassword = defaultPassword
		if err := config.DB.Save(&t).Error; err != nil {
			log.Printf("Failed to update teacher token password %s: %v", t.User.Name, err)
			continue
		}

		updatedCount++
		fmt.Printf("✓ [%03d] %-35s -> @%-20s (Pass: %s)\n", t.ID, t.User.Name, finalUsername, defaultPassword)
	}

	fmt.Printf("\nSUCCESS: Successfully updated %d teacher accounts.\n", updatedCount)
}
