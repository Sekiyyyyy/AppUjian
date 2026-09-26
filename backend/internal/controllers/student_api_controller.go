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
	if err := config.DB.Select("id, class_id").Where("user_id = ?", userID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bukan akun siswa"})
		return
	}

	if student.ClassID == 0 {
		c.JSON(http.StatusOK, []gin.H{})
		return
	}

	var exams []models.Exam
	if err := config.DB.
		Preload("Subject").
		Preload("Category").
		Joins("JOIN exam_classes ON exam_classes.exam_id = exams.id").
		Where("exam_classes.class_id = ? AND exams.deleted_at IS NULL", student.ClassID).
		Find(&exams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data ujian"})
		return
	}

	var sessions []models.ExamSession
	config.DB.Where("student_id = ?", student.ID).Find(&sessions)
	sessionMap := make(map[uint]string)
	for i := range sessions {
		s := &sessions[i]
		// Zero-Trust: If a session is ONGOING and not unlocked by proctor,
		// but the student is fetching exams (on Home screen/dashboard),
		// it means the student left/exited the exam! Automatically lock it.
		if s.Status == "ONGOING" && !s.IsUnlocked {
			s.Status = "LOCKED"
			s.LockReason = "Terdeteksi keluar dari aplikasi ujian"
			config.DB.Model(&models.ExamSession{}).Where("id = ?", s.ID).Updates(map[string]interface{}{
				"status":      "LOCKED",
				"lock_reason": s.LockReason,
			})
		}
		sessionMap[s.ExamID] = s.Status
	}

	type ExamResponse struct {
		models.Exam
		SessionStatus string `json:"session_status"`
	}

	var response []ExamResponse = make([]ExamResponse, 0)
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
