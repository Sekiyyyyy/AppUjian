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

// DeleteClass deletes a class
func DeleteClass(c *gin.Context) {
	id := c.Param("id")

	var class models.Class
	if err := config.DB.First(&class, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kelas tidak ditemukan"})
		return
	}

	if err := config.DB.Delete(&class).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus kelas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kelas berhasil dihapus"})
}

// PromoteClasses processes yearly class promotion
func PromoteClasses(c *gin.Context) {
	tx := config.DB.Begin()

	var students []models.Student
	if err := tx.Preload("Class").Find(&students).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data siswa"})
		return
	}

	var allClasses []models.Class
	if err := tx.Find(&allClasses).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kelas"})
		return
	}

	// Create quick map for class lookup by Level-Department-Number
	classMap := make(map[string]uint)
	for _, cls := range allClasses {
		key := fmt.Sprintf("%s-%s-%s", cls.Level, cls.Department, cls.Number)
		classMap[key] = cls.ID
	}

	for _, s := range students {
		if s.Class == nil {
			continue
		}
		
		if s.Class.Level == "XII" {
			// Delete XII student
			if err := tx.Delete(&s).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus siswa kelas XII"})
				return
			}
			// Delete user
			if err := tx.Delete(&models.User{}, s.UserID).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus user siswa kelas XII"})
				return
			}
		} else if s.Class.Level == "XI" {
			// Promote to XII
			newKey := fmt.Sprintf("XII-%s-%s", s.Class.Department, s.Class.Number)
			if newID, ok := classMap[newKey]; ok {
				if err := tx.Model(&s).Update("class_id", newID).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update kelas siswa XI ke XII"})
					return
				}
			}
		} else if s.Class.Level == "X" {
			// Promote to XI
			newKey := fmt.Sprintf("XI-%s-%s", s.Class.Department, s.Class.Number)
			if newID, ok := classMap[newKey]; ok {
				if err := tx.Model(&s).Update("class_id", newID).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update kelas siswa X ke XI"})
					return
				}
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses kenaikan kelas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kenaikan kelas berhasil diproses"})
}
