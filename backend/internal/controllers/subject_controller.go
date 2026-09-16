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

// UpdateSubject updates a subject by ID
func UpdateSubject(c *gin.Context) {
	id := c.Param("id")
	
	var subject models.Subject
	if err := config.DB.First(&subject, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mata pelajaran tidak ditemukan"})
		return
	}

	// Authorization Check
	role, _ := c.Get("role")
	userID, _ := c.Get("userID")
	var currentUserID uint
	if idFloat, ok := userID.(float64); ok {
		currentUserID = uint(idFloat)
	} else if idUint, ok := userID.(uint); ok {
		currentUserID = idUint
	}

	if role == string(models.RoleTeacher) && subject.TeacherID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak berhak mengedit mata pelajaran ini"})
		return
	}

	var req models.Subject
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	subject.Name = req.Name
	subject.Type = req.Type
	subject.Class = req.Class

	if err := config.DB.Save(&subject).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate mata pelajaran"})
		return
	}

	c.JSON(http.StatusOK, subject)
}

// DeleteSubject deletes a subject by ID
func DeleteSubject(c *gin.Context) {
	id := c.Param("id")
	
	var subject models.Subject
	if err := config.DB.First(&subject, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mata pelajaran tidak ditemukan"})
		return
	}

	// Authorization Check
	role, _ := c.Get("role")
	userID, _ := c.Get("userID")
	var currentUserID uint
	if idFloat, ok := userID.(float64); ok {
		currentUserID = uint(idFloat)
	} else if idUint, ok := userID.(uint); ok {
		currentUserID = idUint
	}

	if role == string(models.RoleTeacher) && subject.TeacherID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak berhak menghapus mata pelajaran ini"})
		return
	}

	if err := config.DB.Delete(&models.Subject{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mata pelajaran berhasil dihapus"})
}
