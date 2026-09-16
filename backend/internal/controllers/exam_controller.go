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
	CategoryID  uint      `json:"category_id" binding:"required"`
	ClassIDs    []uint    `json:"class_ids"`
	QuestionIDs []uint    `json:"question_ids"`
	Tahun       string    `json:"tahun"`
	Semester    string    `json:"semester"`
	Proktor     string    `json:"proktor"`
	Pengawas    string    `json:"pengawas"`
}

// GetExams returns a list of scheduled exams with preloaded subjects, classes, and questions
func GetExams(c *gin.Context) {
	var exams []models.Exam
	query := config.DB.Preload("Subject").Preload("Category").Preload("Classes").Preload("Questions").Order("id DESC")

	role, exists := c.Get("role")
	if exists && role == string(models.RoleTeacher) {
		userID, idExists := c.Get("userID")
		if idExists {
			var teacherID uint
			if idFloat, ok := userID.(float64); ok {
				teacherID = uint(idFloat)
			} else if idUint, ok := userID.(uint); ok {
				teacherID = idUint
			}
			query = query.Where("teacher_id = ?", teacherID)
		}
	}

	if err := query.Find(&exams).Error; err != nil {
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
	
	exam := models.Exam{
		Title:        req.Title,
		SubjectID:    req.SubjectID,
		CategoryID:   req.CategoryID,
		StartTime:    req.StartTime,
		EndTime:      req.EndTime,
		Duration:     req.Duration,
		TotalPoints:  req.TotalPoints,
		Status:       "SCHEDULED",
		TeacherID:    teacherID,
		IsMakeupOpen: false,
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
	config.DB.Preload("Subject").Preload("Category").Preload("Classes").Preload("Questions").First(&exam, exam.ID)

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

// ToggleMakeup toggles the IsMakeupOpen status of an exam
func ToggleMakeup(c *gin.Context) {
	id := c.Param("id")

	var exam models.Exam
	if err := config.DB.First(&exam, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal ujian tidak ditemukan"})
		return
	}

	exam.IsMakeupOpen = !exam.IsMakeupOpen
	if err := config.DB.Save(&exam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengubah status susulan"})
		return
	}

	statusMsg := "ditutup"
	if exam.IsMakeupOpen {
		statusMsg = "dibuka"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Akses ujian susulan berhasil " + statusMsg,
		"is_makeup_open": exam.IsMakeupOpen,
	})
}

// UpdateExam updates an existing exam
func UpdateExam(c *gin.Context) {
	id := c.Param("id")
	var req ExamInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var exam models.Exam
	if err := config.DB.First(&exam, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal ujian tidak ditemukan"})
		return
	}

	exam.Title = req.Title
	exam.SubjectID = req.SubjectID
	exam.CategoryID = req.CategoryID
	exam.StartTime = req.StartTime
	exam.EndTime = req.EndTime
	exam.Duration = req.Duration
	exam.TotalPoints = req.TotalPoints
	exam.Tahun = req.Tahun
	exam.Semester = req.Semester
	exam.Proktor = req.Proktor
	exam.Pengawas = req.Pengawas

	// Clear associations first
	config.DB.Model(&exam).Association("Classes").Clear()
	config.DB.Model(&exam).Association("Questions").Clear()

	// Re-add selected classes
	if len(req.ClassIDs) > 0 {
		var classes []models.Class
		if err := config.DB.Find(&classes, req.ClassIDs).Error; err == nil {
			exam.Classes = classes
		}
	}

	// Re-add selected questions
	if len(req.QuestionIDs) > 0 {
		var questions []models.Question
		if err := config.DB.Find(&questions, req.QuestionIDs).Error; err == nil {
			exam.Questions = questions
		}
	} else {
		var allQuestions []models.Question
		if err := config.DB.Where("subject_id = ?", req.SubjectID).Find(&allQuestions).Error; err == nil {
			exam.Questions = allQuestions
		}
	}

	if err := config.DB.Save(&exam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui ujian"})
		return
	}

	config.DB.Preload("Subject").Preload("Category").Preload("Classes").Preload("Questions").First(&exam, exam.ID)
	c.JSON(http.StatusOK, exam)
}

// GetExamParticipants returns all students eligible for the exam, grouped/filtered by classes
func GetExamParticipants(c *gin.Context) {
	examID := c.Param("id")

	var exam models.Exam
	if err := config.DB.Preload("Classes").First(&exam, examID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	if len(exam.Classes) == 0 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	var classIDs []uint
	for _, class := range exam.Classes {
		classIDs = append(classIDs, class.ID)
	}

	var students []models.Student
	if err := config.DB.Preload("Class").Where("class_id IN ?", classIDs).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data siswa"})
		return
	}

	var sessions []models.ExamSession
	config.DB.Where("exam_id = ?", examID).Find(&sessions)

	sessionMap := make(map[uint]models.ExamSession)
	for _, s := range sessions {
		sessionMap[s.StudentID] = s
	}

	type ParticipantResponse struct {
		models.Student
		SessionStatus string `json:"session_status"`
	}

	var responses []ParticipantResponse
	for _, student := range students {
		status := "BELUM MULAI"
		if session, exists := sessionMap[student.ID]; exists {
			status = session.Status
		}

		responses = append(responses, ParticipantResponse{
			Student:       student,
			SessionStatus: status,
		})
	}

	c.JSON(http.StatusOK, responses)
}

// ResetStudentExam hard deletes the exam session and answers for a student on a specific exam
func ResetStudentExam(c *gin.Context) {
	examID := c.Param("id")
	studentID := c.Param("student_id")

	var session models.ExamSession
	if err := config.DB.Where("exam_id = ? AND student_id = ?", examID, studentID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Siswa belum memulai ujian ini"})
		return
	}

	if err := config.DB.Unscoped().Where("session_id = ?", session.ID).Delete(&models.StudentAnswer{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jawaban siswa"})
		return
	}

	if err := config.DB.Unscoped().Delete(&models.ExamSession{}, session.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mereset ujian siswa"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ujian siswa berhasil direset. Siswa dapat memulai kembali dari awal."})
}
