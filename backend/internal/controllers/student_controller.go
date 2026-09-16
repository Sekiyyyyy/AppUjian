package controllers

import (
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type CreateStudentRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
	NISN     string `json:"nisn" binding:"required"`
	ClassID  uint   `json:"class_id" binding:"required"`
}

type UpdateStudentRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Name     string `json:"name"`
	NISN     string `json:"nisn"`
	ClassID  uint   `json:"class_id"`
}

// GetStudents returns all students with their class and user info
func GetStudents(c *gin.Context) {
	var students []models.Student
	if err := config.DB.Preload("User").Order("id DESC").Find(&students).Error; err != nil {
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
		UserID:  user.ID,
		NISN:    req.NISN,
		ClassID: req.ClassID,
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

func GenerateTokens(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Tokens generated"})
}

func ExportTokens(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Tokens exported"})
}
