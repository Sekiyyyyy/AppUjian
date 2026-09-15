package controllers

import (
	"net/http"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// ExamInput payload for creating an exam
type ExamInput struct {
	Title       string    `json:"title" binding:"required"`
	SubjectID   uint      `json:"subject_id" binding:"required"`
	StartTime   time.Time `json:"start_time" binding:"required"`
	EndTime     time.Time `json:"end_time" binding:"required"`
	Duration    int       `json:"duration" binding:"required"`
	TotalPoints int       `json:"total_points"`
	Status      string    `json:"status"`
	ClassIDs    []uint    `json:"class_ids"`
	QuestionIDs []uint    `json:"question_ids"`
}

// GetExams returns a list of scheduled exams with preloaded subjects, classes, and questions
func GetExams(c *gin.Context) {
	var exams []models.Exam
	if err := config.DB.Preload("Subject").Preload("Classes").Preload("Questions").Order("id DESC").Find(&exams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data jadwal ujian"})
		return
	}
	c.JSON(http.StatusOK, exams)
}

// CreateExam creates a new exam schedule and attaches selected classes and questions
func CreateExam(c *gin.Context) {
	var req ExamInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var teacherID uint
	userID, exists := c.Get("userID")
	if exists {
		if idFloat, ok := userID.(float64); ok {
			teacherID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			teacherID = idUint
		}
	}

	status := req.Status
	if status == "" {
		status = "SCHEDULED"
	}

	exam := models.Exam{
		Title:       req.Title,
		SubjectID:   req.SubjectID,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Duration:    req.Duration,
		TotalPoints: req.TotalPoints,
		Status:      status,
		TeacherID:   teacherID,
	}

	// Fetch selected classes
	if len(req.ClassIDs) > 0 {
		var classes []models.Class
		if err := config.DB.Find(&classes, req.ClassIDs).Error; err == nil {
			exam.Classes = classes
		}
	}

	// Fetch selected questions or fetch all questions for this subject if none explicitly selected
	if len(req.QuestionIDs) > 0 {
		var questions []models.Question
		if err := config.DB.Find(&questions, req.QuestionIDs).Error; err == nil {
			exam.Questions = questions
		}
	} else {
		// Automatically attach all questions from the chosen subject
		var questions []models.Question
		if err := config.DB.Where("subject_id = ?", req.SubjectID).Find(&questions).Error; err == nil {
			exam.Questions = questions
		}
	}

	// Calculate total points if not given
	if exam.TotalPoints == 0 {
		for _, q := range exam.Questions {
			exam.TotalPoints += q.Points
		}
	}

	if err := config.DB.Create(&exam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat jadwal ujian"})
		return
	}

	// Reload with preloads
	config.DB.Preload("Subject").Preload("Classes").Preload("Questions").First(&exam, exam.ID)

	c.JSON(http.StatusCreated, exam)
}

// DeleteExam removes an exam by ID
func DeleteExam(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Exam{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jadwal ujian"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Jadwal ujian berhasil dihapus"})
}
