package controllers

import (
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type CreateTeacherRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Name     string `json:"name" binding:"required"`
	NIP      string `json:"nip" binding:"required"`
}

// GetUsers returns all teachers (and possibly students)
func GetUsers(c *gin.Context) {
	var users []models.User
	// For simplicity, just get users who are teachers
	if err := config.DB.Where("role = ?", models.RoleTeacher).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// CreateTeacher creates a new teacher user
func CreateTeacher(c *gin.Context) {
	var req CreateTeacherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
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
		UserID: user.ID,
		NIP:    req.NIP,
	}

	if err := tx.Create(&teacher).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create teacher record."})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, user)
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
}

// UpdateUser updates user details, and if NIP is provided, updates associated Teacher record
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

	// Update Teacher record if NIP is provided
	if req.NIP != "" && user.Role == models.RoleTeacher {
		var teacher models.Teacher
		if err := tx.Where("user_id = ?", user.ID).First(&teacher).Error; err == nil {
			teacher.NIP = req.NIP
			if err := tx.Save(&teacher).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update teacher record"})
				return
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, user)
}
