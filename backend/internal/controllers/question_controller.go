package controllers

import (
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetQuestions returns a list of questions with optional subject filter
func GetQuestions(c *gin.Context) {
	var questions []models.Question
	query := config.DB.Preload("Subject")

	subjectID := c.Query("subject_id")
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

	if err := query.Order("id DESC").Find(&questions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil bank soal"})
		return
	}
	c.JSON(http.StatusOK, questions)
}

// CreateQuestion adds a new question to the bank
func CreateQuestion(c *gin.Context) {
	var req models.Question
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if exists {
		if idFloat, ok := userID.(float64); ok {
			req.TeacherID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			req.TeacherID = idUint
		}
	}

	// Fetch Subject to ensure it is valid
	var subject models.Subject
	if err := config.DB.First(&subject, req.SubjectID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mata pelajaran tidak valid"})
		return
	}

	if err := config.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan soal"})
		return
	}

	config.DB.Preload("Subject").First(&req, req.ID)
	c.JSON(http.StatusCreated, req)
}

// DeleteQuestion deletes a question by ID
func DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Question{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus soal"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Soal berhasil dihapus"})
}
