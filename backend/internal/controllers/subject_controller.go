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
	if err := config.DB.Where("parent_id IS NULL").Preload("Questions").Order("name ASC").Find(&subjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, subjects)
}

// GetSubjectCategories returns all master/induk subject categories with their exams and questions
func GetSubjectCategories(c *gin.Context) {
	var categories []models.Subject
	if err := config.DB.Where("parent_id IS NULL").
		Preload("Exams.Classes").
		Preload("Exams.Questions").
		Preload("Questions").
		Order("name ASC").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kategori mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, categories)
}

// GetCategoryTeacherSubjects returns teacher subjects under a specific category
func GetCategoryTeacherSubjects(c *gin.Context) {
	categoryID := c.Param("id")
	var subjects []models.Subject
	if err := config.DB.Where("parent_id = ?", categoryID).
		Preload("Teacher").
		Preload("Classes").
		Preload("Questions").
		Preload("Parent").
		Order("id DESC").
		Find(&subjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data mata pelajaran guru"})
		return
	}
	c.JSON(http.StatusOK, subjects)
}

// CreateSubject adds a new master subject category
func CreateSubject(c *gin.Context) {
	var req models.Subject
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if exists {
		if idFloat, ok := userID.(float64); ok {
			uid := uint(idFloat)
			req.TeacherID = &uid
		} else if idUint, ok := userID.(uint); ok {
			req.TeacherID = &idUint
		}
	}

	if req.Type == "" {
		req.Type = "AKADEMIK"
	}

	if err := config.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat kategori mata pelajaran"})
		return
	}

	c.JSON(http.StatusCreated, req)
}

type CreateTeacherSubjectRequest struct {
	ParentID  uint   `json:"parent_id" binding:"required"`
	Name      string `json:"name"`
	Tahun     string `json:"tahun" binding:"required"`
	Semester  string `json:"semester" binding:"required"`
	ClassIDs  []uint `json:"class_ids" binding:"required"`
	TeacherID *uint  `json:"teacher_id"`
}

// CreateTeacherSubject creates a subject under a category for a teacher
func CreateTeacherSubject(c *gin.Context) {
	var req CreateTeacherSubjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role, _ := c.Get("role")
	userID, _ := c.Get("userID")
	var currentUserID uint
	if idFloat, ok := userID.(float64); ok {
		currentUserID = uint(idFloat)
	} else if idUint, ok := userID.(uint); ok {
		currentUserID = idUint
	}

	targetTeacherID := currentUserID
	if role == string(models.RoleAdmin) && req.TeacherID != nil && *req.TeacherID > 0 {
		targetTeacherID = *req.TeacherID
	}

	// Verify Parent Subject Category
	var parent models.Subject
	if err := config.DB.First(&parent, req.ParentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kategori mata pelajaran tidak ditemukan"})
		return
	}

	// Fetch Classes
	var classes []models.Class
	if len(req.ClassIDs) > 0 {
		config.DB.Where("id IN ?", req.ClassIDs).Find(&classes)
	}

	name := req.Name
	if name == "" {
		name = parent.Name
	}

	subject := models.Subject{
		ParentID:  &req.ParentID,
		Name:      name,
		Code:      parent.Code,
		Type:      parent.Type,
		TeacherID: &targetTeacherID,
		Tahun:     req.Tahun,
		Semester:  req.Semester,
		Classes:   classes,
	}

	if err := config.DB.Create(&subject).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat mata pelajaran guru"})
		return
	}

	config.DB.Preload("Teacher").Preload("Classes").Preload("Parent").First(&subject, subject.ID)
	c.JSON(http.StatusCreated, subject)
}

type UpdateTeacherSubjectRequest struct {
	Name      string `json:"name"`
	Tahun     string `json:"tahun" binding:"required"`
	Semester  string `json:"semester" binding:"required"`
	ClassIDs  []uint `json:"class_ids" binding:"required"`
	TeacherID *uint  `json:"teacher_id"`
}

// UpdateTeacherSubject updates teacher subject details and class associations
func UpdateTeacherSubject(c *gin.Context) {
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

	if role == string(models.RoleTeacher) && (subject.TeacherID == nil || *subject.TeacherID != currentUserID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak berhak mengedit mata pelajaran ini"})
		return
	}

	var req UpdateTeacherSubjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name != "" {
		subject.Name = req.Name
	}
	subject.Tahun = req.Tahun
	subject.Semester = req.Semester
	if role == string(models.RoleAdmin) && req.TeacherID != nil && *req.TeacherID > 0 {
		subject.TeacherID = req.TeacherID
	}

	// Update classes association
	var classes []models.Class
	if len(req.ClassIDs) > 0 {
		config.DB.Where("id IN ?", req.ClassIDs).Find(&classes)
	}
	if err := config.DB.Model(&subject).Association("Classes").Replace(classes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui relasi kelas"})
		return
	}

	if err := config.DB.Save(&subject).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate mata pelajaran"})
		return
	}

	config.DB.Preload("Teacher").Preload("Classes").Preload("Parent").First(&subject, subject.ID)
	c.JSON(http.StatusOK, subject)
}

// UpdateSubject updates a subject by ID (for master category or general edit)
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

	if role == string(models.RoleTeacher) && (subject.TeacherID == nil || *subject.TeacherID != currentUserID) {
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

	if role == string(models.RoleTeacher) && (subject.TeacherID == nil || *subject.TeacherID != currentUserID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak berhak menghapus mata pelajaran ini"})
		return
	}

	// Check if this is a master category with child subjects
	if subject.ParentID == nil {
		var childCount int64
		config.DB.Model(&models.Subject{}).Where("parent_id = ?", id).Count(&childCount)
		if childCount > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak dapat menghapus kategori yang masih memiliki mata pelajaran guru. Hapus mapel guru terlebih dahulu."})
			return
		}
	}

	// Clear class associations if any
	config.DB.Model(&subject).Association("Classes").Clear()

	if err := config.DB.Delete(&models.Subject{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus mata pelajaran"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Mata pelajaran berhasil dihapus"})
}
