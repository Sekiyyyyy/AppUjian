package controllers

import (
	"net/http"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// GetStudentExams returns exams available for the student based on their class
func GetStudentExams(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var student models.Student
	if err := config.DB.Where("user_id = ?", userID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bukan akun siswa"})
		return
	}

	var class models.Class
	if err := config.DB.First(&class, student.ClassID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Data kelas tidak ditemukan"})
		return
	}

	var exams []models.Exam
	if err := config.DB.
		Preload("Subject").
		Preload("Category").
		Joins("JOIN exam_classes ON exam_classes.exam_id = exams.id").
		Where("exam_classes.class_id = ?", class.ID).
		Find(&exams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ujian"})
		return
	}

	var sessions []models.ExamSession
	config.DB.Where("student_id = ?", student.ID).Find(&sessions)
	sessionMap := make(map[uint]string)
	for _, s := range sessions {
		sessionMap[s.ExamID] = s.Status
	}

	type ExamResponse struct {
		models.Exam
		SessionStatus string `json:"session_status"`
	}

	var response []ExamResponse
	for _, exam := range exams {
		status := sessionMap[exam.ID]
		if status == "" {
			status = "BELUM MULAI"
		}
		response = append(response, ExamResponse{
			Exam:          exam,
			SessionStatus: status,
		})
	}

	c.JSON(http.StatusOK, response)
}
