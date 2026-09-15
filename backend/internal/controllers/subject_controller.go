package controllers

import (
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetSubjects returns a list of subjects
func GetSubjects(c *gin.Context) {
	var subjects []models.Subject
	if err := config.DB.Order("id DESC").Find(&subjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, subjects)
}

// CreateSubject adds a new subject
func CreateSubject(c *gin.Context) {
	var req models.Subject
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

	if req.Type == "" {
		req.Type = "AKADEMIK"
	}

	if err := config.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat mata pelajaran"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

// DeleteSubject deletes a subject by ID
func DeleteSubject(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Subject{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mata pelajaran berhasil dihapus"})
}
