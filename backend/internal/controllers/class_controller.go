package controllers

import (
	"fmt"
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetClasses returns all classes ordered by level, department, and number
func GetClasses(c *gin.Context) {
	var classes []models.Class
	if err := config.DB.Order("level ASC, department ASC, number ASC").Find(&classes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kelas"})
		return
	}
	c.JSON(http.StatusOK, classes)
}

// CreateClass creates a new SMK class
func CreateClass(c *gin.Context) {
	var req struct {
		Level      string `json:"level" binding:"required"`
		Department string `json:"department" binding:"required"`
		Number     string `json:"number" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data kelas tidak lengkap (Tingkat, Jurusan, Lokal wajib diisi)"})
		return
	}

	class := models.Class{
		Level:      req.Level,
		Department: req.Department,
		Number:     req.Number,
		Name:       fmt.Sprintf("%s %s %s", req.Level, req.Department, req.Number),
	}

	// Check if already exists
	var existing models.Class
	if err := config.DB.Where("level = ? AND department = ? AND number = ?", req.Level, req.Department, req.Number).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Kelas %s sudah ada!", class.Name)})
		return
	}

	if err := config.DB.Create(&class).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data kelas"})
		return
	}

	c.JSON(http.StatusCreated, class)
}

// DeleteClass deletes a class by ID
func DeleteClass(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Class{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus kelas"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kelas berhasil dihapus"})
}
