package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// ExamInput payload for creating an exam
type ExamInput struct {
	Title       string    `json:"title" binding:"required"`
	SubjectID   uint      `json:"subject_id" binding:"required"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time"`
	Duration    int       `json:"duration"`
	TotalPoints int       `json:"total_points"`
	Status      string    `json:"status"`
	CategoryID  *uint     `json:"category_id"`
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
	query := config.DB.Preload("Subject").Preload("Category").Preload("Classes").Preload("Questions").Preload("Teacher").Order("id DESC")

	subjectID := c.Query("subject_id")
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

	myExams := c.Query("my_exams")
	if myExams == "true" {
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

	status := "DRAFT"
	if req.Status != "" {
		status = req.Status
	} else if !req.StartTime.IsZero() {
		status = "SCHEDULED"
	}

	startTime := req.StartTime
	if startTime.IsZero() {
		startTime = time.Now().Add(24 * time.Hour)
	}

	endTime := req.EndTime
	if endTime.IsZero() {
		endTime = startTime.Add(2 * time.Hour)
	}

	duration := req.Duration
	if duration <= 0 {
		duration = 90
	}
	
	exam := models.Exam{
		Title:        req.Title,
		SubjectID:    req.SubjectID,
		CategoryID:   req.CategoryID,
		StartTime:    startTime,
		EndTime:      endTime,
		Duration:     duration,
		TotalPoints:  req.TotalPoints,
		Status:       status,
		Tahun:        req.Tahun,
		Semester:     req.Semester,
		Proktor:      req.Proktor,
		Pengawas:     req.Pengawas,
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

	// Fetch selected questions
	if len(req.QuestionIDs) > 0 {
		var questions []models.Question
		if err := config.DB.Find(&questions, req.QuestionIDs).Error; err == nil {
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
	config.DB.Preload("Subject").Preload("Category").Preload("Classes").Preload("Questions").Preload("Teacher").First(&exam, exam.ID)

	c.JSON(http.StatusCreated, exam)
}

// DeleteExam removes an exam by ID and cleans up associations and sessions
func DeleteExam(c *gin.Context) {
	id := c.Param("id")

	var exam models.Exam
	if err := config.DB.First(&exam, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal ujian tidak ditemukan"})
		return
	}

	role, exists := c.Get("role")
	userID, idExists := c.Get("userID")
	var currentUserID uint
	if idExists {
		if idFloat, ok := userID.(float64); ok {
			currentUserID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			currentUserID = idUint
		}
	}

	if exists && role == string(models.RoleTeacher) {
		if exam.TeacherID != 0 && exam.TeacherID != currentUserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya guru pembuat ujian yang berhak menghapus ujian ini"})
			return
		}
	}

	tx := config.DB.Begin()

	// Clear many-to-many associations
	if err := tx.Model(&exam).Association("Classes").Clear(); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus relasi kelas ujian"})
		return
	}
	if err := tx.Model(&exam).Association("Questions").Clear(); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus relasi soal ujian"})
		return
	}

	// Delete student answers for this exam's sessions
	var sessionIDs []uint
	tx.Model(&models.ExamSession{}).Where("exam_id = ?", id).Pluck("id", &sessionIDs)
	if len(sessionIDs) > 0 {
		if err := tx.Where("session_id IN ?", sessionIDs).Delete(&models.StudentAnswer{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jawaban peserta ujian"})
			return
		}
	}

	// Delete sessions
	if err := tx.Where("exam_id = ?", id).Delete(&models.ExamSession{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus sesi ujian"})
		return
	}

	// Delete supervisor assignments
	if err := tx.Where("exam_id = ?", id).Delete(&models.ExamSupervisor{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jadwal pengawas ujian"})
		return
	}

	// Delete exam itself
	if err := tx.Delete(&exam).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jadwal ujian"})
		return
	}

	tx.Commit()
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

	role, exists := c.Get("role")
	userID, idExists := c.Get("userID")
	var currentUserID uint
	if idExists {
		if idFloat, ok := userID.(float64); ok {
			currentUserID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			currentUserID = idUint
		}
	}

	if exists && role == string(models.RoleTeacher) {
		if exam.TeacherID != 0 && exam.TeacherID != currentUserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya guru pembuat ujian yang berhak mengedit jadwal ujian ini"})
			return
		}
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

	if req.Status != "" {
		exam.Status = req.Status
	} else if !req.StartTime.IsZero() {
		exam.Status = "SCHEDULED"
	}

	// Clear class associations and re-add if provided
	if len(req.ClassIDs) > 0 {
		config.DB.Model(&exam).Association("Classes").Clear()
		var classes []models.Class
		if err := config.DB.Find(&classes, req.ClassIDs).Error; err == nil {
			exam.Classes = classes
		}
	}

	// Re-add selected questions only if explicitly provided
	if len(req.QuestionIDs) > 0 {
		config.DB.Model(&exam).Association("Questions").Clear()
		var questions []models.Question
		if err := config.DB.Find(&questions, req.QuestionIDs).Error; err == nil {
			exam.Questions = questions
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
	if err := config.DB.Preload("Class").Preload("User").Where("class_id IN ?", classIDs).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data siswa"})
		return
	}

	var sessions []models.ExamSession
	config.DB.Where("exam_id = ?", examID).Find(&sessions)

	sessionMap := make(map[uint]models.ExamSession)
	for _, s := range sessions {
		sessionMap[s.StudentID] = s
	}

	// Determine supervisor permissions for current caller
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	isAdmin := roleStr == string(models.RoleAdmin) || roleStr == string(models.RoleSuperAdmin)

	supervisedClassMap := make(map[uint]bool)
	if !isAdmin {
		userID, exists := c.Get("userID")
		if exists && userID != nil {
			var teacherID uint
			if idFloat, ok := userID.(float64); ok {
				teacherID = uint(idFloat)
			} else if idUint, ok := userID.(uint); ok {
				teacherID = idUint
			}

			var supervisedClassIDs []uint
			config.DB.Model(&models.ExamSupervisor{}).
				Where("exam_id = ? AND teacher_id = ?", examID, teacherID).
				Pluck("class_id", &supervisedClassIDs)

			for _, cid := range supervisedClassIDs {
				supervisedClassMap[cid] = true
			}
		}
	}

	type ParticipantResponse struct {
		models.Student
		Name          string  `json:"name"`
		SessionStatus string  `json:"session_status"`
		Score         float64 `json:"score"`
		CanUnlock     bool    `json:"can_unlock"`
		IsSupervisor  bool    `json:"is_supervisor"`
	}

	var responses []ParticipantResponse = make([]ParticipantResponse, 0)
	for _, student := range students {
		status := "BELUM MULAI"
		var score float64
		if session, exists := sessionMap[student.ID]; exists {
			status = session.Status
			score = session.Score
		}

		isSupervisor := isAdmin || supervisedClassMap[student.ClassID]
		canUnlock := (status == "LOCKED") && isSupervisor

		responses = append(responses, ParticipantResponse{
			Student:       student,
			Name:          student.User.Name,
			SessionStatus: status,
			Score:         score,
			CanUnlock:     canUnlock,
			IsSupervisor:  isSupervisor,
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

	// Permission boundary: If caller is a TEACHER, verify they are supervising this class or authored the exam
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

			var student models.Student
			if err := config.DB.First(&student, session.StudentID).Error; err == nil {
				var supervisorCount int64
				config.DB.Model(&models.ExamSupervisor{}).
					Where("exam_id = ? AND class_id = ? AND teacher_id = ?", session.ExamID, student.ClassID, teacherID).
					Count(&supervisorCount)

				var exam models.Exam
				config.DB.Select("teacher_id").First(&exam, session.ExamID)

				if supervisorCount == 0 && exam.TeacherID != teacherID {
					c.JSON(http.StatusForbidden, gin.H{
						"error": "Akses Ditolak: Anda hanya memiliki izin mereset ujian untuk siswa di kelas yang sedang Anda awasi.",
					})
					return
				}
			}
		}
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

// UnlockStudentExam allows an authorized proctor or admin to unlock a student's locked exam session
func UnlockStudentExam(c *gin.Context) {
	examID := c.Param("id")
	studentID := c.Param("student_id")

	var session models.ExamSession
	if err := config.DB.Where("exam_id = ? AND student_id = ?", examID, studentID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sesi ujian siswa tidak ditemukan"})
		return
	}

	// Permission boundary: If caller is a TEACHER, verify they are assigned as supervisor for this exam and class
	role, exists := c.Get("role")
	if exists && role == string(models.RoleTeacher) {
		userID, idExists := c.Get("userID")
		if !idExists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var teacherID uint
		if idFloat, ok := userID.(float64); ok {
			teacherID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			teacherID = idUint
		}

		var student models.Student
		if err := config.DB.First(&student, session.StudentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Data siswa tidak ditemukan"})
			return
		}

		var supervisorCount int64
		config.DB.Model(&models.ExamSupervisor{}).
			Where("exam_id = ? AND class_id = ? AND teacher_id = ?", session.ExamID, student.ClassID, teacherID).
			Count(&supervisorCount)

		if supervisorCount == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Akses Ditolak: Anda hanya memiliki izin membuka kunci ujian untuk siswa di kelas yang sedang Anda awasi.",
			})
			return
		}
	}

	if session.Status != "LOCKED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ujian siswa tidak dalam status terkunci (status: " + session.Status + ")"})
		return
	}

	session.Status = "ONGOING"
	session.LockReason = ""
	session.IsUnlocked = true
	if err := config.DB.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka kunci ujian siswa"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kunci ujian siswa berhasil dibuka. Siswa dapat melanjutkan ujian."})
}

// ExportExamGradesExcel exports the exam grades for a specific class or all classes in .xlsx format
func ExportExamGradesExcel(c *gin.Context) {
	examID := c.Param("id")
	classIDStr := c.Query("class_id")

	var exam models.Exam
	if err := config.DB.Preload("Subject").Preload("Category").Preload("Classes").First(&exam, examID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal ujian tidak ditemukan"})
		return
	}

	// Security: If current user is a teacher, verify they are the author of this exam
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
			if exam.TeacherID != 0 && exam.TeacherID != teacherID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Anda hanya dapat mengunduh nilai untuk ujian yang Anda buat sendiri"})
				return
			}
		}
	}

	// Determine class filter
	var classIDs []uint
	var targetClassName string = "Semua Kelas"

	if classIDStr != "" && classIDStr != "ALL" && classIDStr != "0" {
		cid, err := strconv.ParseUint(classIDStr, 10, 32)
		if err == nil {
			classIDs = append(classIDs, uint(cid))
			var cls models.Class
			if err := config.DB.First(&cls, cid).Error; err == nil {
				targetClassName = cls.Name
			}
		}
	} else {
		for _, cls := range exam.Classes {
			classIDs = append(classIDs, cls.ID)
		}
	}

	if len(classIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada kelas yang terdaftar pada ujian ini"})
		return
	}

	// Fetch all students in the selected class(es)
	var students []models.Student
	if err := config.DB.Preload("Class").Preload("User").
		Where("class_id IN ?", classIDs).
		Order("class_id ASC, nis ASC").
		Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data siswa"})
		return
	}

	// Fetch exam sessions
	var sessions []models.ExamSession
	config.DB.Where("exam_id = ?", exam.ID).Find(&sessions)

	sessionMap := make(map[uint]models.ExamSession)
	for _, s := range sessions {
		sessionMap[s.StudentID] = s
	}

	// Generate Excel File
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Rekap Nilai"
	f.SetSheetName("Sheet1", sheetName)

	// Define Styles
	// 1. Title Styles
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14, Color: "#1E3A8A"}, // Blue 900
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11, Color: "#475569"}, // Slate 600
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	infoKeyStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 10, Color: "#334155"},
	})

	// 2. Table Header Style
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 10},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E40AF"}, Pattern: 1}, // Blue 800
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
		},
	})

	// 3. Data Styles
	borderStyle := []excelize.Border{
		{Type: "left", Color: "#CBD5E1", Style: 1},
		{Type: "top", Color: "#CBD5E1", Style: 1},
		{Type: "bottom", Color: "#CBD5E1", Style: 1},
		{Type: "right", Color: "#CBD5E1", Style: 1},
	}
	cellCenter, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderStyle,
	})
	cellLeft, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    borderStyle,
	})
	scoreStyle, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderStyle,
		CustomNumFmt: &[]string{"0.00"}[0],
	})
	statusDoneStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#15803D"}, // Green 700
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderStyle,
	})
	statusOtherStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Color: "#B91C1C"}, // Red 700
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderStyle,
	})
	summaryStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F1F5F9"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderStyle,
	})

	// Header KOP Sekolah
	f.MergeCell(sheetName, "A1", "I1")
	f.SetCellValue(sheetName, "A1", "SMK NEGERI 1 BERINGIN")
	f.SetCellStyle(sheetName, "A1", "I1", titleStyle)
	f.SetRowHeight(sheetName, 1, 24)

	f.MergeCell(sheetName, "A2", "I2")
	f.SetCellValue(sheetName, "A2", "DAFTAR NILAI UJIAN BERBASIS CBT (COMPUTER BASED TEST)")
	f.SetCellStyle(sheetName, "A2", "I2", subtitleStyle)
	f.SetRowHeight(sheetName, 2, 20)

	// Informasi Ujian (Rows 4-6)
	subjectName := "-"
	if exam.Subject != nil {
		subjectName = exam.Subject.Name
	}
	f.SetCellValue(sheetName, "A4", "Mata Pelajaran")
	f.SetCellValue(sheetName, "B4", ": "+subjectName)
	f.SetCellValue(sheetName, "F4", "Kelas")
	f.SetCellValue(sheetName, "G4", ": "+targetClassName)

	f.SetCellValue(sheetName, "A5", "Judul Ujian")
	f.SetCellValue(sheetName, "B5", ": "+exam.Title)
	f.SetCellValue(sheetName, "F5", "Tahun / Smt")
	f.SetCellValue(sheetName, "G5", fmt.Sprintf(": %s / %s", exam.Tahun, exam.Semester))

	f.SetCellValue(sheetName, "A6", "Tanggal Unduh")
	f.SetCellValue(sheetName, "B6", ": "+time.Now().Format("02-01-2006 15:04 WIB"))
	f.SetCellValue(sheetName, "F6", "Jumlah Siswa")
	f.SetCellValue(sheetName, "G6", fmt.Sprintf(": %d Siswa", len(students)))

	for r := 4; r <= 6; r++ {
		cellA, _ := excelize.CoordinatesToCellName(1, r)
		cellF, _ := excelize.CoordinatesToCellName(6, r)
		f.SetCellStyle(sheetName, cellA, cellA, infoKeyStyle)
		f.SetCellStyle(sheetName, cellF, cellF, infoKeyStyle)
		f.SetRowHeight(sheetName, r, 18)
	}

	// Table Headers at Row 8
	tableHeaders := []string{"NO", "NISN", "NIS", "NAMA SISWA", "L/P", "KELAS", "STATUS UJIAN", "NILAI AKHIR", "KETERANGAN"}
	for colIdx, h := range tableHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 8)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}
	f.SetRowHeight(sheetName, 8, 26)

	// Set Column Widths
	f.SetColWidth(sheetName, "A", "A", 6)   // No
	f.SetColWidth(sheetName, "B", "B", 16)  // NISN
	f.SetColWidth(sheetName, "C", "C", 14)  // NIS
	f.SetColWidth(sheetName, "D", "D", 32)  // Nama Siswa
	f.SetColWidth(sheetName, "E", "E", 8)   // L/P
	f.SetColWidth(sheetName, "F", "F", 16)  // Kelas
	f.SetColWidth(sheetName, "G", "G", 18)  // Status
	f.SetColWidth(sheetName, "H", "H", 14)  // Nilai
	f.SetColWidth(sheetName, "I", "I", 16)  // Keterangan

	// Populate Data Rows
	startRow := 9
	currentRow := startRow
	for idx, student := range students {
		row := currentRow
		no := idx + 1
		nisn := student.NISN
		nis := student.NIS
		name := student.User.Name
		gender := student.JenisKelamin
		if gender == "Laki-laki" {
			gender = "L"
		} else if gender == "Perempuan" {
			gender = "P"
		}
		className := "-"
		if student.Class != nil {
			className = student.Class.Name
		}

		status := "BELUM MULAI"
		score := 0.0
		ket := "Tidak Ikut"

		if session, ok := sessionMap[student.ID]; ok {
			status = session.Status
			if status == "FINISHED" || status == "SUBMITTED" {
				status = "SELESAI"
				score = session.Score
				if score >= 75.0 {
					ket = "Tuntas"
				} else {
					ket = "Belum Tuntas"
				}
			} else if status == "ONGOING" {
				status = "MENGERJAKAN"
				ket = "Sedang Ujian"
			} else if status == "TIMEOUT" {
				status = "WAKTU HABIS"
				score = session.Score
				if score >= 75.0 {
					ket = "Tuntas"
				} else {
					ket = "Belum Tuntas"
				}
			}
		}

		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), no)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), nisn)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), nis)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), name)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), gender)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), className)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), status)
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), score)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), ket)

		// Styles
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), cellCenter)
		f.SetCellStyle(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("C%d", row), cellCenter)
		f.SetCellStyle(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), cellLeft)
		f.SetCellStyle(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("F%d", row), cellCenter)

		if status == "SELESAI" {
			f.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), statusDoneStyle)
		} else {
			f.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), statusOtherStyle)
		}

		f.SetCellStyle(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("H%d", row), scoreStyle)
		f.SetCellStyle(sheetName, fmt.Sprintf("I%d", row), fmt.Sprintf("I%d", row), cellCenter)

		f.SetRowHeight(sheetName, row, 20)
		currentRow++
	}

	// Bottom Summary Rows
	lastDataRow := currentRow - 1
	if len(students) > 0 {
		avgRow := currentRow
		f.MergeCell(sheetName, fmt.Sprintf("A%d", avgRow), fmt.Sprintf("G%d", avgRow))
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", avgRow), "RATA-RATA KELAS")
		f.SetCellFormula(sheetName, fmt.Sprintf("H%d", avgRow), fmt.Sprintf("AVERAGE(H%d:H%d)", startRow, lastDataRow))
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", avgRow), "-")
		for c := 1; c <= 9; c++ {
			cell, _ := excelize.CoordinatesToCellName(c, avgRow)
			f.SetCellStyle(sheetName, cell, cell, summaryStyle)
		}
		f.SetRowHeight(sheetName, avgRow, 22)
		currentRow++

		maxRow := currentRow
		f.MergeCell(sheetName, fmt.Sprintf("A%d", maxRow), fmt.Sprintf("G%d", maxRow))
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", maxRow), "NILAI TERTINGGI")
		f.SetCellFormula(sheetName, fmt.Sprintf("H%d", maxRow), fmt.Sprintf("MAX(H%d:H%d)", startRow, lastDataRow))
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", maxRow), "-")
		for c := 1; c <= 9; c++ {
			cell, _ := excelize.CoordinatesToCellName(c, maxRow)
			f.SetCellStyle(sheetName, cell, cell, summaryStyle)
		}
		f.SetRowHeight(sheetName, maxRow, 22)
		currentRow++

		minRow := currentRow
		f.MergeCell(sheetName, fmt.Sprintf("A%d", minRow), fmt.Sprintf("G%d", minRow))
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", minRow), "NILAI TERENDAH")
		f.SetCellFormula(sheetName, fmt.Sprintf("H%d", minRow), fmt.Sprintf("MIN(H%d:H%d)", startRow, lastDataRow))
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", minRow), "-")
		for c := 1; c <= 9; c++ {
			cell, _ := excelize.CoordinatesToCellName(c, minRow)
			f.SetCellStyle(sheetName, cell, cell, summaryStyle)
		}
		f.SetRowHeight(sheetName, minRow, 22)
		currentRow++
	}

	// Clean file name
	safeSubject := strings.ReplaceAll(subjectName, " ", "_")
	safeClass := strings.ReplaceAll(targetClassName, " ", "_")
	safeTitle := strings.ReplaceAll(exam.Title, " ", "_")
	fileName := fmt.Sprintf("Nilai_%s_%s_%s.xlsx", safeSubject, safeClass, safeTitle)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("File-Name", fileName)

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghasilkan file Excel"})
	}
}
