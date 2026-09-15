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

// DeleteUser deletes a user by ID
func DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// Delete user (associated teacher/student records should ideally be cascaded or soft-deleted)
	if err := config.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}
