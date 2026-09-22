package controllers

import (
	"crypto/rand"
	"encoding/csv"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type CreateStudentRequest struct {
	Username     string `json:"username"`
	Password     string `json:"password"`
	Name         string `json:"name" binding:"required"`
	NISN         string `json:"nisn" binding:"required"`
	ClassID      uint   `json:"class_id" binding:"required"`
	NIS          string `json:"nis"`
	JenisKelamin string `json:"jenis_kelamin"`
	Agama        string `json:"agama"`
	TempatLahir  string `json:"tempat_lahir"`
	TanggalLahir string `json:"tanggal_lahir"`
	Alamat       string `json:"alamat"`
	NoTelp       string `json:"no_telp"`
	NamaOrangTua string `json:"nama_orang_tua"`
}

type UpdateStudentRequest struct {
	Username     string `json:"username"`
	Password     string `json:"password"`
	Name         string `json:"name"`
	NISN         string `json:"nisn"`
	ClassID      uint   `json:"class_id"`
	NIS          string `json:"nis"`
	JenisKelamin string `json:"jenis_kelamin"`
	Agama        string `json:"agama"`
	TempatLahir  string `json:"tempat_lahir"`
	TanggalLahir string `json:"tanggal_lahir"`
	Alamat       string `json:"alamat"`
	NoTelp       string `json:"no_telp"`
	NamaOrangTua string `json:"nama_orang_tua"`
}

// GetStudents returns all students with their class and user info
func GetStudents(c *gin.Context) {
	var students []models.Student
	query := config.DB.Preload("User").Preload("Class")

	classID := c.Query("class_id")
	if classID != "" && classID != "null" && classID != "undefined" {
		query = query.Where("class_id = ?", classID)
	}

	if err := query.Joins("JOIN users ON users.id = students.user_id").Order("users.name ASC").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch students"})
		return
	}
	c.JSON(http.StatusOK, students)
}

// CreateStudent creates a new student and associated user
func CreateStudent(c *gin.Context) {
	var req CreateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Username == "" {
		req.Username = "TMP-" + req.NISN
	}
	if req.Password == "" {
		req.Password = req.NISN
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	tx := config.DB.Begin()

	user := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
		Name:     req.Name,
		Role:     models.RoleStudent,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat user. Username mungkin sudah ada."})
		return
	}

	student := models.Student{
		UserID:       user.ID,
		NISN:         req.NISN,
		ClassID:      req.ClassID,
		NIS:          req.NIS,
		JenisKelamin: req.JenisKelamin,
		Agama:        req.Agama,
		TempatLahir:  req.TempatLahir,
		TanggalLahir: req.TanggalLahir,
		Alamat:       req.Alamat,
		NoTelp:       req.NoTelp,
		NamaOrangTua: req.NamaOrangTua,
	}

	if err := tx.Create(&student).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat data siswa."})
		return
	}

	tx.Commit()

	config.DB.Preload("User").First(&student, student.ID)
	c.JSON(http.StatusCreated, student)
}

// UpdateStudent updates student and associated user
func UpdateStudent(c *gin.Context) {
	id := c.Param("id")
	var req UpdateStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var student models.Student
	if err := config.DB.Preload("User").First(&student, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	tx := config.DB.Begin()

	// Update User
	if req.Username != "" {
		student.User.Username = req.Username
	}
	if req.Name != "" {
		student.User.Name = req.Name
	}
	if req.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		student.User.Password = string(hashedPassword)
	}

	if err := tx.Save(&student.User).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update data user"})
		return
	}

	// Update Student
	if req.NISN != "" {
		student.NISN = req.NISN
	}
	if req.ClassID != 0 {
		student.ClassID = req.ClassID
	}
	if req.NIS != "" { student.NIS = req.NIS }
	if req.JenisKelamin != "" { student.JenisKelamin = req.JenisKelamin }
	if req.Agama != "" { student.Agama = req.Agama }
	if req.TempatLahir != "" { student.TempatLahir = req.TempatLahir }
	if req.TanggalLahir != "" { student.TanggalLahir = req.TanggalLahir }
	if req.Alamat != "" { student.Alamat = req.Alamat }
	if req.NoTelp != "" { student.NoTelp = req.NoTelp }
	if req.NamaOrangTua != "" { student.NamaOrangTua = req.NamaOrangTua }

	if err := tx.Save(&student).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update data siswa"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, student)
}

// DeleteStudent deletes a student and associated user
func DeleteStudent(c *gin.Context) {
	id := c.Param("id")
	var student models.Student
	if err := config.DB.First(&student, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	tx := config.DB.Begin()
	
	if err := tx.Delete(&student).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus siswa"})
		return
	}

	if err := tx.Delete(&models.User{}, student.UserID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus user siswa"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Siswa berhasil dihapus"})
}

// GenerateRandomString creates a cryptographically secure random string of a given length
func GenerateRandomString(n int) string {
	const letters = "0123456789"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		ret[i] = letters[num.Int64()]
	}
	return string(ret)
}

// GenerateTokens generates new usernames and passwords for all students
func GenerateTokens(c *gin.Context) {
	var students []models.Student
	if err := config.DB.Preload("User").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data siswa"})
		return
	}

	tx := config.DB.Begin()
	successCount := 0

	for _, s := range students {
		// Generate random 7 character numeric tokens for username and password
		newUsername := GenerateRandomString(7)
		newPassword := GenerateRandomString(7)

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.MinCost)
		
		s.User.Username = newUsername
		s.User.Password = string(hashedPassword)
		s.TokenPassword = newPassword

		if err := tx.Save(&s.User).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update kredensial user"})
			return
		}

		if err := tx.Save(&s).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update token siswa"})
			return
		}

		successCount++
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan perubahan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Berhasil mereset %d kredensial token siswa", successCount),
	})
}

func ExportTokens(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Tokens exported"})
}

// ImportStudentsCSV handles importing students from a CSV file
func ImportStudentsCSV(c *gin.Context) {
	classIDStr := c.PostForm("class_id")
	classID, err := strconv.ParseUint(classIDStr, 10, 32)
	if err != nil || classID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID kelas tidak valid"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gagal membaca file"})
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	// Skip header
	if _, err := reader.Read(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format CSV tidak valid"})
		return
	}

	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gagal membaca isi CSV"})
		return
	}

	tx := config.DB.Begin()

	successCount := 0
	for _, record := range records {
		if len(record) < 4 {
			continue // Skip invalid rows (need Name, NISN, Username, Password)
		}

		name := strings.TrimSpace(record[0])
		nisn := strings.TrimSpace(record[1])
		username := strings.TrimSpace(record[2])
		password := strings.TrimSpace(record[3])

		if name == "" || nisn == "" || username == "" || password == "" {
			continue
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

		user := models.User{
			Username: username,
			Password: string(hashedPassword),
			Name:     name,
			Role:     models.RoleStudent,
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Gagal membuat user untuk %s. Username/NISN mungkin sudah terpakai.", name)})
			return
		}

		student := models.Student{
			UserID:  user.ID,
			NISN:    nisn,
			ClassID: uint(classID),
		}

		if err := tx.Create(&student).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Gagal menyimpan data siswa %s", name)})
			return
		}

		successCount++
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan semua data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Berhasil mengimpor %d siswa", successCount),
		"count":   successCount,
	})
}
