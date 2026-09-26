package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

// SupervisorInput represents the payload to create or update a supervisor assignment
type SupervisorInput struct {
	ExamID    uint   `json:"exam_id" binding:"required"`
	ClassID   uint   `json:"class_id" binding:"required"`
	TeacherID uint   `json:"teacher_id" binding:"required"`
	Ruangan   string `json:"ruangan"`
	Notes     string `json:"notes"`
}

// GetSupervisors returns supervisor assignments filtered by exam_id, class_id, or teacher_id
func GetSupervisors(c *gin.Context) {
	query := config.DB.Preload("Exam.Subject").Preload("Class").Preload("Teacher").Order("id DESC")

	if examID := c.Query("exam_id"); examID != "" {
		query = query.Where("exam_id = ?", examID)
	}
	if classID := c.Query("class_id"); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if teacherID := c.Query("teacher_id"); teacherID != "" {
		query = query.Where("teacher_id = ?", teacherID)
	}

	var supervisors []models.ExamSupervisor
	if err := query.Find(&supervisors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data jadwal pengawas"})
		return
	}

	c.JSON(http.StatusOK, supervisors)
}

// GetMySupervisionSchedules returns supervisor assignments for the logged-in teacher
func GetMySupervisionSchedules(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var teacherID uint
	if idFloat, ok := userID.(float64); ok {
		teacherID = uint(idFloat)
	} else if idUint, ok := userID.(uint); ok {
		teacherID = idUint
	}

	var supervisors []models.ExamSupervisor
	err := config.DB.Preload("Exam.Subject").
		Preload("Class").
		Preload("Teacher").
		Where("teacher_id = ?", teacherID).
		Joins("LEFT JOIN exams ON exams.id = exam_supervisors.exam_id").
		Order("exams.start_time ASC, exam_supervisors.id DESC").
		Find(&supervisors).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil jadwal tugas pengawasan"})
		return
	}

	c.JSON(http.StatusOK, supervisors)
}

// CreateSupervisor assigns a teacher to supervise a class during an exam
func CreateSupervisor(c *gin.Context) {
	var req SupervisorInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak valid: " + err.Error()})
		return
	}

	// 1. Verify exam exists
	var exam models.Exam
	if err := config.DB.First(&exam, req.ExamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ujian tidak ditemukan"})
		return
	}

	// 2. Verify class exists
	var class models.Class
	if err := config.DB.First(&class, req.ClassID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kelas tidak ditemukan"})
		return
	}

	// 3. Verify teacher exists and has role TEACHER
	var teacher models.User
	if err := config.DB.Where("id = ? AND role = ?", req.TeacherID, models.RoleTeacher).First(&teacher).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Guru pengawas tidak ditemukan atau tidak memiliki role Guru"})
		return
	}

	// 4. Check for duplicate assignment
	var existing models.ExamSupervisor
	if err := config.DB.Where("exam_id = ? AND class_id = ? AND teacher_id = ?", req.ExamID, req.ClassID, req.TeacherID).First(&existing).Error; err == nil {
		// Update existing
		existing.Ruangan = req.Ruangan
		existing.Notes = req.Notes
		if err := config.DB.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui jadwal pengawas"})
			return
		}
		config.DB.Preload("Exam.Subject").Preload("Class").Preload("Teacher").First(&existing, existing.ID)
		c.JSON(http.StatusOK, gin.H{"message": "Jadwal pengawas berhasil diperbarui", "data": existing})
		return
	}

	supervisor := models.ExamSupervisor{
		ExamID:    req.ExamID,
		ClassID:   req.ClassID,
		TeacherID: req.TeacherID,
		Ruangan:   req.Ruangan,
		Notes:     req.Notes,
	}

	if err := config.DB.Create(&supervisor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menambahkan jadwal pengawas"})
		return
	}

	config.DB.Preload("Exam.Subject").Preload("Class").Preload("Teacher").First(&supervisor, supervisor.ID)
	c.JSON(http.StatusCreated, gin.H{"message": "Jadwal pengawas berhasil ditambahkan", "data": supervisor})
}

// UpdateSupervisor updates an existing supervisor assignment
func UpdateSupervisor(c *gin.Context) {
	id := c.Param("id")
	var supervisor models.ExamSupervisor
	if err := config.DB.First(&supervisor, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal pengawas tidak ditemukan"})
		return
	}

	var req SupervisorInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak valid: " + err.Error()})
		return
	}

	supervisor.ExamID = req.ExamID
	supervisor.ClassID = req.ClassID
	supervisor.TeacherID = req.TeacherID
	supervisor.Ruangan = req.Ruangan
	supervisor.Notes = req.Notes

	if err := config.DB.Save(&supervisor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui jadwal pengawas"})
		return
	}

	config.DB.Preload("Exam.Subject").Preload("Class").Preload("Teacher").First(&supervisor, supervisor.ID)
	c.JSON(http.StatusOK, gin.H{"message": "Jadwal pengawas berhasil diperbarui", "data": supervisor})
}

// DeleteSupervisor removes a supervisor assignment
func DeleteSupervisor(c *gin.Context) {
	id := c.Param("id")
	var supervisor models.ExamSupervisor
	if err := config.DB.First(&supervisor, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal pengawas tidak ditemukan"})
		return
	}

	if err := config.DB.Delete(&supervisor).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus jadwal pengawas"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jadwal pengawas berhasil dihapus"})
}

// DownloadSupervisorTemplateExcel generates an Excel template pre-filled with available teachers, exams, and classes
func DownloadSupervisorTemplateExcel(c *gin.Context) {
	f := excelize.NewFile()
	defer f.Close()

	// Sheet 1: Main Template
	mainSheet := "Jadwal Pengawas"
	f.SetSheetName("Sheet1", mainSheet)

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 10},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E40AF"}, Pattern: 1}, // Blue 800
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#94A3B8", Style: 1},
			{Type: "top", Color: "#94A3B8", Style: 1},
			{Type: "bottom", Color: "#94A3B8", Style: 1},
			{Type: "right", Color: "#94A3B8", Style: 1},
		},
	})

	centerStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
		},
	})

	leftStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
		},
	})

	exampleStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Color: "#64748B"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
		},
	})

	// Main Headers
	headers := []string{
		"ID Ujian",
		"Judul Ujian (Referensi)",
		"ID Kelas",
		"Nama Kelas (Referensi)",
		"ID Guru",
		"Nama Guru (Referensi)",
		"Ruangan",
		"Keterangan",
	}

	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(mainSheet, cell, h)
		f.SetCellStyle(mainSheet, cell, cell, headerStyle)
	}
	f.SetRowHeight(mainSheet, 1, 28)

	f.SetColWidth(mainSheet, "A", "A", 12) // ID Ujian
	f.SetColWidth(mainSheet, "B", "B", 35) // Judul Ujian
	f.SetColWidth(mainSheet, "C", "C", 12) // ID Kelas
	f.SetColWidth(mainSheet, "D", "D", 20) // Nama Kelas
	f.SetColWidth(mainSheet, "E", "E", 12) // ID Guru
	f.SetColWidth(mainSheet, "F", "F", 30) // Nama Guru
	f.SetColWidth(mainSheet, "G", "G", 22) // Ruangan
	f.SetColWidth(mainSheet, "H", "H", 25) // Keterangan

	// Sample Row 2
	f.SetCellValue(mainSheet, "A2", "1")
	f.SetCellValue(mainSheet, "B2", "Contoh: Ujian Akhir Semester")
	f.SetCellValue(mainSheet, "C2", "1")
	f.SetCellValue(mainSheet, "D2", "XII PPLG 1")
	f.SetCellValue(mainSheet, "E2", "2")
	f.SetCellValue(mainSheet, "F2", "Nama Guru Pengawas")
	f.SetCellValue(mainSheet, "G2", "Lab Komputer 1")
	f.SetCellValue(mainSheet, "H2", "Pengawas Utama")

	for c := 1; c <= 8; c++ {
		cell, _ := excelize.CoordinatesToCellName(c, 2)
		f.SetCellStyle(mainSheet, cell, cell, exampleStyle)
	}
	f.SetRowHeight(mainSheet, 2, 22)

	// Fetch Reference Data
	var teachers []models.User
	config.DB.Where("role = ?", models.RoleTeacher).Order("name ASC").Find(&teachers)

	var teacherProfiles []models.Teacher
	config.DB.Find(&teacherProfiles)
	profileMap := make(map[uint]models.Teacher)
	for _, p := range teacherProfiles {
		profileMap[p.UserID] = p
	}

	var exams []models.Exam
	config.DB.Preload("Subject").Preload("Classes").Order("id DESC").Find(&exams)

	var classes []models.Class
	config.DB.Order("level ASC, department ASC, number ASC").Find(&classes)

	// -------------------------------------------------------------
	// Sheet 2: Daftar Guru Tersedia
	// -------------------------------------------------------------
	sheetGuru := "Daftar Guru Tersedia"
	f.NewSheet(sheetGuru)
	guruHeaders := []string{"ID Guru (User ID)", "Nama Guru", "Username", "NIP", "Jabatan"}
	for colIdx, h := range guruHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetGuru, cell, h)
		f.SetCellStyle(sheetGuru, cell, cell, headerStyle)
	}
	f.SetRowHeight(sheetGuru, 1, 26)
	f.SetColWidth(sheetGuru, "A", "A", 18)
	f.SetColWidth(sheetGuru, "B", "B", 35)
	f.SetColWidth(sheetGuru, "C", "C", 20)
	f.SetColWidth(sheetGuru, "D", "D", 22)
	f.SetColWidth(sheetGuru, "E", "E", 20)

	for i, t := range teachers {
		row := i + 2
		prof := profileMap[t.ID]
		f.SetCellValue(sheetGuru, fmt.Sprintf("A%d", row), t.ID)
		f.SetCellValue(sheetGuru, fmt.Sprintf("B%d", row), t.Name)
		f.SetCellValue(sheetGuru, fmt.Sprintf("C%d", row), t.Username)
		f.SetCellValue(sheetGuru, fmt.Sprintf("D%d", row), prof.NIP)
		f.SetCellValue(sheetGuru, fmt.Sprintf("E%d", row), prof.Jabatan)

		f.SetCellStyle(sheetGuru, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), centerStyle)
		f.SetCellStyle(sheetGuru, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), leftStyle)
		f.SetCellStyle(sheetGuru, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), centerStyle)
		f.SetCellStyle(sheetGuru, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), centerStyle)
		f.SetCellStyle(sheetGuru, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), leftStyle)
		f.SetRowHeight(sheetGuru, row, 20)
	}

	// -------------------------------------------------------------
	// Sheet 3: Daftar Ujian
	// -------------------------------------------------------------
	sheetExam := "Daftar Ujian"
	f.NewSheet(sheetExam)
	examHeaders := []string{"ID Ujian", "Judul Ujian", "Mata Pelajaran", "Waktu Mulai", "Waktu Selesai", "Durasi (Menit)", "Kelas Terdaftar"}
	for colIdx, h := range examHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetExam, cell, h)
		f.SetCellStyle(sheetExam, cell, cell, headerStyle)
	}
	f.SetRowHeight(sheetExam, 1, 26)
	f.SetColWidth(sheetExam, "A", "A", 12)
	f.SetColWidth(sheetExam, "B", "B", 35)
	f.SetColWidth(sheetExam, "C", "C", 25)
	f.SetColWidth(sheetExam, "D", "D", 20)
	f.SetColWidth(sheetExam, "E", "E", 20)
	f.SetColWidth(sheetExam, "F", "F", 16)
	f.SetColWidth(sheetExam, "G", "G", 35)

	for i, e := range exams {
		row := i + 2
		subjectName := "-"
		if e.Subject != nil {
			subjectName = e.Subject.Name
		}
		var classNames []string
		for _, c := range e.Classes {
			classNames = append(classNames, c.Name)
		}

		f.SetCellValue(sheetExam, fmt.Sprintf("A%d", row), e.ID)
		f.SetCellValue(sheetExam, fmt.Sprintf("B%d", row), e.Title)
		f.SetCellValue(sheetExam, fmt.Sprintf("C%d", row), subjectName)
		f.SetCellValue(sheetExam, fmt.Sprintf("D%d", row), e.StartTime.Format("2006-01-02 15:04"))
		f.SetCellValue(sheetExam, fmt.Sprintf("E%d", row), e.EndTime.Format("2006-01-02 15:04"))
		f.SetCellValue(sheetExam, fmt.Sprintf("F%d", row), e.Duration)
		f.SetCellValue(sheetExam, fmt.Sprintf("G%d", row), strings.Join(classNames, ", "))

		f.SetCellStyle(sheetExam, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), centerStyle)
		f.SetCellStyle(sheetExam, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), leftStyle)
		f.SetCellStyle(sheetExam, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), leftStyle)
		f.SetCellStyle(sheetExam, fmt.Sprintf("D%d", row), fmt.Sprintf("E%d", row), centerStyle)
		f.SetCellStyle(sheetExam, fmt.Sprintf("F%d", row), fmt.Sprintf("F%d", row), centerStyle)
		f.SetCellStyle(sheetExam, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), leftStyle)
		f.SetRowHeight(sheetExam, row, 20)
	}

	// -------------------------------------------------------------
	// Sheet 4: Daftar Kelas
	// -------------------------------------------------------------
	sheetKelas := "Daftar Kelas"
	f.NewSheet(sheetKelas)
	kelasHeaders := []string{"ID Kelas", "Nama Kelas", "Tingkat", "Jurusan", "Nomor"}
	for colIdx, h := range kelasHeaders {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetKelas, cell, h)
		f.SetCellStyle(sheetKelas, cell, cell, headerStyle)
	}
	f.SetRowHeight(sheetKelas, 1, 26)
	f.SetColWidth(sheetKelas, "A", "A", 12)
	f.SetColWidth(sheetKelas, "B", "B", 22)
	f.SetColWidth(sheetKelas, "C", "C", 14)
	f.SetColWidth(sheetKelas, "D", "D", 16)
	f.SetColWidth(sheetKelas, "E", "E", 14)

	for i, cl := range classes {
		row := i + 2
		f.SetCellValue(sheetKelas, fmt.Sprintf("A%d", row), cl.ID)
		f.SetCellValue(sheetKelas, fmt.Sprintf("B%d", row), cl.Name)
		f.SetCellValue(sheetKelas, fmt.Sprintf("C%d", row), cl.Level)
		f.SetCellValue(sheetKelas, fmt.Sprintf("D%d", row), cl.Department)
		f.SetCellValue(sheetKelas, fmt.Sprintf("E%d", row), cl.Number)

		f.SetCellStyle(sheetKelas, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), centerStyle)
		f.SetCellStyle(sheetKelas, fmt.Sprintf("B%d", row), fmt.Sprintf("E%d", row), centerStyle)
		f.SetRowHeight(sheetKelas, row, 20)
	}

	// Focus back to mainSheet
	idx, _ := f.GetSheetIndex(mainSheet)
	f.SetActiveSheet(idx)

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", "attachment; filename=\"Template_Jadwal_Pengawas.xlsx\"")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghasilkan file Excel template"})
		return
	}
}

// ImportSupervisorsExcel processes an uploaded Excel spreadsheet to bulk assign supervisors
func ImportSupervisorsExcel(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel (.xlsx) wajib diunggah"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka file unggahan"})
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format file tidak valid atau file Excel rusak"})
		return
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel tidak memiliki lembar kerja"})
		return
	}

	// Use sheet named "Jadwal Pengawas" if exists, otherwise first sheet
	targetSheet := sheets[0]
	for _, s := range sheets {
		if strings.EqualFold(strings.TrimSpace(s), "Jadwal Pengawas") {
			targetSheet = s
			break
		}
	}

	rows, err := f.GetRows(targetSheet)
	if err != nil || len(rows) <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel kosong atau tidak memiliki data baris"})
		return
	}

	// Pre-fetch caches for fast lookup
	var allExams []models.Exam
	config.DB.Preload("Classes").Find(&allExams)
	examByID := make(map[uint]models.Exam)
	examByTitle := make(map[string]models.Exam)
	for _, e := range allExams {
		examByID[e.ID] = e
		examByTitle[strings.ToLower(strings.TrimSpace(e.Title))] = e
	}

	var allClasses []models.Class
	config.DB.Find(&allClasses)
	classByID := make(map[uint]models.Class)
	classByName := make(map[string]models.Class)
	for _, cl := range allClasses {
		classByID[cl.ID] = cl
		classByName[strings.ToLower(strings.TrimSpace(cl.Name))] = cl
	}

	var allTeachers []models.User
	config.DB.Where("role = ?", models.RoleTeacher).Find(&allTeachers)
	teacherByID := make(map[uint]models.User)
	teacherByName := make(map[string]models.User)
	teacherByUsername := make(map[string]models.User)
	for _, t := range allTeachers {
		teacherByID[t.ID] = t
		teacherByName[strings.ToLower(strings.TrimSpace(t.Name))] = t
		teacherByUsername[strings.ToLower(strings.TrimSpace(t.Username))] = t
	}

	var importedCount int
	var errorDetails []string

	for rIdx := 1; rIdx < len(rows); rIdx++ {
		row := rows[rIdx]
		lineNo := rIdx + 1

		// Helper to safely get column
		getCol := func(idx int) string {
			if idx < len(row) {
				return strings.TrimSpace(row[idx])
			}
			return ""
		}

		rawExamID := getCol(0)
		rawExamTitle := getCol(1)
		rawClassID := getCol(2)
		rawClassName := getCol(3)
		rawTeacherID := getCol(4)
		rawTeacherName := getCol(5)
		ruangan := getCol(6)
		notes := getCol(7)

		// Skip row if completely empty or is the sample example row
		if rawExamID == "" && rawExamTitle == "" && rawClassID == "" && rawClassName == "" && rawTeacherID == "" && rawTeacherName == "" {
			continue
		}
		if strings.Contains(strings.ToLower(rawExamTitle), "contoh:") || strings.Contains(strings.ToLower(rawTeacherName), "nama guru pengawas") {
			continue
		}

		// 1. Resolve Exam
		var resolvedExam models.Exam
		var examFound bool
		if rawExamID != "" {
			if parsedID, err := strconv.ParseUint(rawExamID, 10, 32); err == nil {
				if e, ok := examByID[uint(parsedID)]; ok {
					resolvedExam = e
					examFound = true
				}
			}
		}
		if !examFound && rawExamTitle != "" {
			if e, ok := examByTitle[strings.ToLower(rawExamTitle)]; ok {
				resolvedExam = e
				examFound = true
			}
		}
		if !examFound {
			errorDetails = append(errorDetails, fmt.Sprintf("Baris %d: Ujian tidak ditemukan (ID: '%s', Judul: '%s')", lineNo, rawExamID, rawExamTitle))
			continue
		}

		// 2. Resolve Class
		var resolvedClass models.Class
		var classFound bool
		if rawClassID != "" {
			if parsedID, err := strconv.ParseUint(rawClassID, 10, 32); err == nil {
				if cl, ok := classByID[uint(parsedID)]; ok {
					resolvedClass = cl
					classFound = true
				}
			}
		}
		if !classFound && rawClassName != "" {
			if cl, ok := classByName[strings.ToLower(rawClassName)]; ok {
				resolvedClass = cl
				classFound = true
			}
		}
		if !classFound {
			errorDetails = append(errorDetails, fmt.Sprintf("Baris %d: Kelas tidak ditemukan (ID: '%s', Nama: '%s')", lineNo, rawClassID, rawClassName))
			continue
		}

		// 3. Resolve Teacher
		var resolvedTeacher models.User
		var teacherFound bool
		if rawTeacherID != "" {
			if parsedID, err := strconv.ParseUint(rawTeacherID, 10, 32); err == nil {
				if t, ok := teacherByID[uint(parsedID)]; ok {
					resolvedTeacher = t
					teacherFound = true
				}
			}
		}
		if !teacherFound && rawTeacherName != "" {
			cleanName := strings.ToLower(rawTeacherName)
			if t, ok := teacherByName[cleanName]; ok {
				resolvedTeacher = t
				teacherFound = true
			} else if t, ok := teacherByUsername[cleanName]; ok {
				resolvedTeacher = t
				teacherFound = true
			} else {
				// Partial match
				for _, t := range allTeachers {
					if strings.Contains(strings.ToLower(t.Name), cleanName) {
						resolvedTeacher = t
						teacherFound = true
						break
					}
				}
			}
		}
		if !teacherFound {
			errorDetails = append(errorDetails, fmt.Sprintf("Baris %d: Guru pengawas tidak ditemukan (ID: '%s', Nama: '%s')", lineNo, rawTeacherID, rawTeacherName))
			continue
		}

		// Save or Update assignment
		var supervisor models.ExamSupervisor
		findErr := config.DB.Where("exam_id = ? AND class_id = ? AND teacher_id = ?", resolvedExam.ID, resolvedClass.ID, resolvedTeacher.ID).First(&supervisor).Error
		if findErr == nil {
			// Update
			if ruangan != "" {
				supervisor.Ruangan = ruangan
			}
			if notes != "" {
				supervisor.Notes = notes
			}
			config.DB.Save(&supervisor)
			importedCount++
		} else {
			// Create
			supervisor = models.ExamSupervisor{
				ExamID:    resolvedExam.ID,
				ClassID:   resolvedClass.ID,
				TeacherID: resolvedTeacher.ID,
				Ruangan:   ruangan,
				Notes:     notes,
			}
			if err := config.DB.Create(&supervisor).Error; err == nil {
				importedCount++
			} else {
				errorDetails = append(errorDetails, fmt.Sprintf("Baris %d: Gagal menyimpan data pengawas (%v)", lineNo, err))
			}
		}
	}

	msg := fmt.Sprintf("Berhasil memproses %d jadwal pengawas", importedCount)
	if len(errorDetails) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"message":        msg,
			"imported_count": importedCount,
			"errors":         errorDetails,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        msg,
		"imported_count": importedCount,
	})
}
