package controllers

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GenerateRandomDigits creates a random string of n numeric digits
func GenerateRandomDigits(n int) string {
	const digits = "0123456789"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		ret[i] = digits[num.Int64()]
	}
	return string(ret)
}

type TeacherResponse struct {
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	Username      string    `json:"username"`
	Name          string    `json:"name"`
	Role          string    `json:"role"`
	NIP           string    `json:"nip"`
	NUPTK         string    `json:"nuptk"`
	Jabatan       string    `json:"jabatan"`
	TokenPassword string    `json:"token_password"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateTeacherRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password"`
	Name     string `json:"name" binding:"required"`
	NIP      string `json:"nip"`
	NUPTK    string `json:"nuptk"`
	Jabatan  string `json:"jabatan"`
}

// GetUsers returns all teachers with their NIP, NUPTK, and Jabatan
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := config.DB.Where("role = ?", models.RoleTeacher).Order("id asc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	var teachers []models.Teacher
	config.DB.Find(&teachers)
	teacherMap := make(map[uint]models.Teacher)
	for _, t := range teachers {
		teacherMap[t.UserID] = t
	}

	resp := make([]TeacherResponse, 0, len(users))
	for _, u := range users {
		t, ok := teacherMap[u.ID]
		jabatan := "Guru"
		if ok && t.Jabatan != "" {
			jabatan = t.Jabatan
		}

		resp = append(resp, TeacherResponse{
			ID:            u.ID,
			UserID:        u.ID,
			Username:      u.Username,
			Name:          u.Name,
			Role:          string(u.Role),
			NIP:           t.NIP,
			NUPTK:         t.NUPTK,
			Jabatan:       jabatan,
			TokenPassword: t.TokenPassword,
			CreatedAt:     u.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, resp)
}

// CreateTeacher creates a new teacher user with random 7-digit password if not specified
func CreateTeacher(c *gin.Context) {
	var req CreateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	password := req.Password
	if password == "" {
		password = GenerateRandomDigits(7)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	jabatan := req.Jabatan
	if jabatan == "" {
		jabatan = "Guru"
	}

	// Begin Transaction
	tx := config.DB.Begin()

	// 1. Create User
	user := models.User{
		Username: req.Username,
		Password: string(hashedPassword),
		Name:     req.Name,
		Role:     models.RoleTeacher,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user. Username might exist."})
		return
	}

	// 2. Create Teacher record
	teacher := models.Teacher{
		UserID:        user.ID,
		NIP:           req.NIP,
		NUPTK:         req.NUPTK,
		Jabatan:       jabatan,
		TokenPassword: password,
	}

	if err := tx.Create(&teacher).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create teacher record."})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, TeacherResponse{
		ID:            user.ID,
		UserID:        user.ID,
		Username:      user.Username,
		Name:          user.Name,
		Role:          string(user.Role),
		NIP:           teacher.NIP,
		NUPTK:         teacher.NUPTK,
		Jabatan:       teacher.Jabatan,
		TokenPassword: teacher.TokenPassword,
		CreatedAt:     user.CreatedAt,
	})
}

// GenerateTeacherTokens generates new random 7-digit passwords for all teachers
func GenerateTeacherTokens(c *gin.Context) {
	var teachers []models.Teacher
	if err := config.DB.Preload("User").Find(&teachers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data guru"})
		return
	}

	tx := config.DB.Begin()
	successCount := 0

	for _, t := range teachers {
		if t.User.ID == 0 {
			continue
		}

		newPassword := GenerateRandomDigits(7)
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.MinCost)

		t.User.Password = string(hashedPassword)
		t.TokenPassword = newPassword

		if err := tx.Save(&t.User).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update kredensial user guru"})
			return
		}

		if err := tx.Save(&t).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update password guru"})
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
		"message": fmt.Sprintf("Berhasil membuat password 7 digit baru untuk %d guru", successCount),
	})
}

// DeleteUser deletes a user by ID and cascades to Teacher/Student records
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	tx := config.DB.Begin()

	// Cascade: delete associated Teacher record
	if user.Role == models.RoleTeacher {
		if err := tx.Where("user_id = ?", user.ID).Delete(&models.Teacher{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete teacher record"})
			return
		}
	}

	// Cascade: delete associated Student record
	if user.Role == models.RoleStudent {
		if err := tx.Where("user_id = ?", user.ID).Delete(&models.Student{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete student record"})
			return
		}
	}

	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

type UpdateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Name     string `json:"name"`
	NIP      string `json:"nip"`
	NUPTK    string `json:"nuptk"`
	Jabatan  string `json:"jabatan"`
}

// UpdateUser updates user details, and if NIP/NUPTK/Jabatan are provided, updates associated Teacher record
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	tx := config.DB.Begin()

	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.Password = string(hashedPassword)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Update Teacher record if user is a teacher
	if user.Role == models.RoleTeacher {
		var teacher models.Teacher
		if err := tx.Where("user_id = ?", user.ID).First(&teacher).Error; err == nil {
			teacher.NIP = req.NIP
			teacher.NUPTK = req.NUPTK
			if req.Jabatan != "" {
				teacher.Jabatan = req.Jabatan
			}
			if req.Password != "" {
				teacher.TokenPassword = req.Password
			}
			if err := tx.Save(&teacher).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update teacher record"})
				return
			}
		} else {
			jabatan := req.Jabatan
			if jabatan == "" {
				jabatan = "Guru"
			}
			teacher = models.Teacher{
				UserID:        user.ID,
				NIP:           req.NIP,
				NUPTK:         req.NUPTK,
				Jabatan:       jabatan,
				TokenPassword: req.Password,
			}
			if err := tx.Create(&teacher).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create teacher record"})
				return
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, user)
}
