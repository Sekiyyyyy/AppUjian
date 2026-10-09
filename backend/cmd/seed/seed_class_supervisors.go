package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

func generateClassUsername(cls models.Class) string {
	lvl := strings.ToLower(cls.Level)
	dept := strings.ToLower(cls.Department)
	num := strings.TrimSpace(cls.Number)
	return fmt.Sprintf("%s.%s%s", lvl, dept, num)
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)
	db := config.DB

	passwordPlain := "pengawas123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(passwordPlain), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hashing password: %v", err)
	}

	// 1. Ambil 42 kelas aktif
	var classes []models.Class
	if err := db.Where("deleted_at IS NULL").Order("level, department, number, id ASC").Find(&classes).Error; err != nil {
		log.Fatalf("Gagal mengambil data kelas: %v", err)
	}
	fmt.Printf("Ditemukan %d kelas aktif.\n", len(classes))

	// 2. Ambil akun ruang lama jika ada
	var oldRuangUsers []models.User
	db.Where("username LIKE 'ruang%' AND role = ?", models.RoleTeacher).Order("id ASC").Find(&oldRuangUsers)
	fmt.Printf("Ditemukan %d akun ruang lama.\n", len(oldRuangUsers))

	// Map untuk menampung user ID per kelas
	classTeacherMap := make(map[uint]models.User)

	// 3. Konversi atau buat 42 akun spesifik kelas
	for i, cls := range classes {
		targetUsername := generateClassUsername(cls)
		targetName := fmt.Sprintf("Pengawas %s", cls.Name)

		var user models.User
		errUser := db.Where("username = ?", targetUsername).First(&user).Error

		if errUser == nil {
			// Sudah ada dengan username target, update data
			user.Name = targetName
			user.Password = string(hashedPassword)
			user.Role = models.RoleTeacher
			db.Save(&user)
		} else if i < len(oldRuangUsers) {
			// Gunakan akun ruang lama yang ada dan ubah usernamenya
			user = oldRuangUsers[i]
			user.Username = targetUsername
			user.Name = targetName
			user.Password = string(hashedPassword)
			user.Role = models.RoleTeacher
			db.Save(&user)
		} else {
			// Buat akun baru jika tidak ada akun lama
			user = models.User{
				Username: targetUsername,
				Password: string(hashedPassword),
				Name:     targetName,
				Role:     models.RoleTeacher,
			}
			db.Create(&user)
		}

		// Pastikan record di tabel teachers ada & update token_password
		var teacher models.Teacher
		if err := db.Where("user_id = ?", user.ID).First(&teacher).Error; err == nil {
			teacher.TokenPassword = passwordPlain
			teacher.Jabatan = "Guru"
			db.Save(&teacher)
		} else {
			teacher = models.Teacher{
				UserID:        user.ID,
				TokenPassword: passwordPlain,
				Jabatan:       "Guru",
			}
			db.Create(&teacher)
		}

		classTeacherMap[cls.ID] = user
		fmt.Printf("[%02d/42] Kelas: %-16s -> Username: %-16s | Nama: %s\n", i+1, cls.Name, targetUsername, targetName)
	}

	// 4. Hapus akun ruang yang tersisa (misal ruang43 - ruang50)
	if len(oldRuangUsers) > len(classes) {
		leftover := oldRuangUsers[len(classes):]
		for _, u := range leftover {
			var supCount int64
			db.Model(&models.ExamSupervisor{}).Where("teacher_id = ?", u.ID).Count(&supCount)
			if supCount == 0 {
				db.Where("user_id = ?", u.ID).Delete(&models.Teacher{})
				db.Delete(&u)
				fmt.Printf("🗑️ Menghapus akun ruang sisa: %s (ID: %d)\n", u.Username, u.ID)
			}
		}
	}

	// 5. Perbarui penugasan pengawas pada Ujian Simulasi (Exam ID 6) agar spesifik ke kelas tertuju
	var exam models.Exam
	if err := db.Where("title LIKE ?", "%Simulasi Asesmen CBT Bersama%").First(&exam).Error; err == nil {
		fmt.Printf("Memperbarui jadwal pengawas untuk Ujian: %s (ID: %d)...\n", exam.Title, exam.ID)
		
		for _, cls := range classes {
			teacherUser := classTeacherMap[cls.ID]

			var sup models.ExamSupervisor
			errSup := db.Where("exam_id = ? AND class_id = ?", exam.ID, cls.ID).First(&sup).Error

			supRecord := models.ExamSupervisor{
				ExamID:    exam.ID,
				ClassID:   cls.ID,
				TeacherID: teacherUser.ID,
				Ruangan:   cls.Name,
				Notes:     fmt.Sprintf("Pengawas Sesi Simulasi - %s", cls.Name),
				Status:    "STARTED",
				IsStarted: true,
				IsPaused:  false,
			}

			if errSup == nil {
				supRecord.ID = sup.ID
				db.Model(&sup).Updates(supRecord)
			} else {
				db.Create(&supRecord)
			}
		}
		fmt.Println("✅ Penugasan pengawas ujian simulasi berhasil diperbarui secara 1-to-1 dengan kelas!")
	}

	fmt.Println("=========================================================")
	fmt.Printf("🎉 SUKSES! Sebanyak %d akun pengawas kelas berhasil dikonfigurasi.\n", len(classes))
	fmt.Printf("Password semua akun: %s\n", passwordPlain)
	fmt.Println("=========================================================")
}
