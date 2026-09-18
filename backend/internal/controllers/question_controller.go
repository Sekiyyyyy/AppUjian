package controllers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/datatypes"
)

// CreateQuestionInput payload supporting optional exam association
type CreateQuestionInput struct {
	SubjectID     uint           `json:"subject_id"`
	Type          models.QuestionType   `json:"type"`
	Content       string         `json:"content"`
	ImageUrl      string         `json:"image_url,omitempty"`
	Options       datatypes.JSON `json:"options,omitempty"`
	CorrectAnswer string         `json:"correct_answer,omitempty"`
	Points        int            `json:"points"`
	ExamID        uint           `json:"exam_id,omitempty"`
}

// GetQuestions returns a list of questions with optional subject or exam filter
func GetQuestions(c *gin.Context) {
	examID := c.Query("exam_id")
	if examID != "" {
		var exam models.Exam
		if err := config.DB.Preload("Questions.Subject").First(&exam, examID).Error; err == nil {
			c.JSON(http.StatusOK, exam.Questions)
			return
		}
	}

	var questions []models.Question
	query := config.DB.Preload("Subject")

	subjectID := c.Query("subject_id")
	if subjectID != "" {
		query = query.Where("subject_id = ?", subjectID)
	}

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

	if err := query.Order("id DESC").Find(&questions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil bank soal"})
		return
	}
	c.JSON(http.StatusOK, questions)
}

// CreateQuestion adds a new question to the bank and optionally attaches to an exam
func CreateQuestion(c *gin.Context) {
	var req CreateQuestionInput
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

	// Fetch Subject to ensure it is valid
	var subject models.Subject
	if err := config.DB.First(&subject, req.SubjectID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mata pelajaran tidak valid"})
		return
	}

	q := models.Question{
		SubjectID:     req.SubjectID,
		Type:          req.Type,
		Content:       req.Content,
		ImageUrl:      req.ImageUrl,
		Options:       req.Options,
		CorrectAnswer: req.CorrectAnswer,
		Points:        req.Points,
		TeacherID:     teacherID,
	}

	if err := config.DB.Create(&q).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan soal"})
		return
	}

	// Attach to exam if exam_id was provided
	if req.ExamID > 0 {
		var exam models.Exam
		if err := config.DB.First(&exam, req.ExamID).Error; err == nil {
			config.DB.Model(&exam).Association("Questions").Append(&q)
		}
	}

	config.DB.Preload("Subject").First(&q, q.ID)
	c.JSON(http.StatusCreated, q)
}

// DeleteQuestion deletes a question by ID
func DeleteQuestion(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Question{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus soal"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Soal berhasil dihapus"})
}

// DownloadQuestionTemplateExcel generates and serves a pre-formatted Excel template for 35, 40, or 45 questions
func DownloadQuestionTemplateExcel(c *gin.Context) {
	countStr := c.DefaultQuery("count", "40")
	count, err := strconv.Atoi(countStr)
	if err != nil || count <= 0 {
		count = 40
	}

	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Template Soal"
	f.SetSheetName("Sheet1", sheetName)

	// Style Header
	styleHeader, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "#FFFFFF", Size: 11},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"059669"}, Pattern: 1}, // Emerald 600
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#CBD5E1", Style: 1},
			{Type: "top", Color: "#CBD5E1", Style: 1},
			{Type: "bottom", Color: "#CBD5E1", Style: 1},
			{Type: "right", Color: "#CBD5E1", Style: 1},
		},
	})

	styleCenter, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	headers := []string{"No", "Pertanyaan / Soal", "Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E", "Kunci Jawaban", "Bobot Poin"}
	for colIdx, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(colIdx+1, 1)
		f.SetCellValue(sheetName, cell, h)
		f.SetCellStyle(sheetName, cell, cell, styleHeader)
	}
	f.SetRowHeight(sheetName, 1, 28)

	// Set column widths
	f.SetColWidth(sheetName, "A", "A", 6)   // No
	f.SetColWidth(sheetName, "B", "B", 50)  // Soal
	f.SetColWidth(sheetName, "C", "G", 25)  // Opsi A-E
	f.SetColWidth(sheetName, "H", "H", 16)  // Kunci
	f.SetColWidth(sheetName, "I", "I", 14)  // Poin

	// Default point per question scaled to 100
	pointPerQ := math.Round((100.0/float64(count))*100) / 100

	// Sample Row 1
	f.SetCellValue(sheetName, "A2", 1)
	f.SetCellValue(sheetName, "B2", "Contoh: Ibukota negara Republik Indonesia saat ini adalah ...")
	f.SetCellValue(sheetName, "C2", "Jakarta")
	f.SetCellValue(sheetName, "D2", "Nusantara")
	f.SetCellValue(sheetName, "E2", "Surabaya")
	f.SetCellValue(sheetName, "F2", "Bandung")
	f.SetCellValue(sheetName, "G2", "Medan")
	f.SetCellValue(sheetName, "H2", "A")
	f.SetCellValue(sheetName, "I2", pointPerQ)
	f.SetCellStyle(sheetName, "A2", "A2", styleCenter)
	f.SetCellStyle(sheetName, "H2", "I2", styleCenter)

	// Pre-fill row numbers and points up to count
	for r := 3; r <= count+1; r++ {
		no := r - 1
		cellA, _ := excelize.CoordinatesToCellName(1, r)
		cellI, _ := excelize.CoordinatesToCellName(9, r)
		f.SetCellValue(sheetName, cellA, no)
		f.SetCellValue(sheetName, cellI, pointPerQ)
		f.SetCellStyle(sheetName, cellA, cellA, styleCenter)
		f.SetCellStyle(sheetName, cellI, cellI, styleCenter)
	}

	fileName := fmt.Sprintf("Template_Soal_%d_Butir.xlsx", count)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("File-Name", fileName)

	if err := f.Write(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghasilkan file Excel template"})
	}
}

// ImportQuestionsExcel imports questions from an uploaded Excel file
func ImportQuestionsExcel(c *gin.Context) {
	subjectIDStr := c.PostForm("subject_id")
	if subjectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID mata pelajaran (subject_id) wajib dipilih"})
		return
	}

	subjectID, err := strconv.ParseUint(subjectIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID mata pelajaran tidak valid"})
		return
	}

	var subject models.Subject
	if err := config.DB.First(&subject, subjectID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mata pelajaran tidak ditemukan"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel (.xlsx) wajib diunggah"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka file yang diunggah"})
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format file tidak didukung atau file Excel rusak"})
		return
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel tidak memiliki lembar kerja (sheet)"})
		return
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil || len(rows) <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File Excel kosong atau tidak memiliki data soal"})
		return
	}

	// Read teacherID from context
	var teacherID uint
	userID, exists := c.Get("userID")
	if exists {
		if idFloat, ok := userID.(float64); ok {
			teacherID = uint(idFloat)
		} else if idUint, ok := userID.(uint); ok {
			teacherID = idUint
		}
	}

	// Map header columns dynamically
	headerRow := rows[0]
	colSoal := -1
	colA := -1
	colB := -1
	colC := -1
	colD := -1
	colE := -1
	colKunci := -1
	colPoin := -1

	for idx, cellVal := range headerRow {
		clean := strings.ToLower(strings.TrimSpace(cellVal))
		if strings.Contains(clean, "soal") || strings.Contains(clean, "pertanyaan") {
			colSoal = idx
		} else if strings.Contains(clean, "pilihan a") || clean == "a" || strings.Contains(clean, "opsi a") {
			colA = idx
		} else if strings.Contains(clean, "pilihan b") || clean == "b" || strings.Contains(clean, "opsi b") {
			colB = idx
		} else if strings.Contains(clean, "pilihan c") || clean == "c" || strings.Contains(clean, "opsi c") {
			colC = idx
		} else if strings.Contains(clean, "pilihan d") || clean == "d" || strings.Contains(clean, "opsi d") {
			colD = idx
		} else if strings.Contains(clean, "pilihan e") || clean == "e" || strings.Contains(clean, "opsi e") {
			colE = idx
		} else if strings.Contains(clean, "kunci") || strings.Contains(clean, "jawaban") {
			colKunci = idx
		} else if strings.Contains(clean, "poin") || strings.Contains(clean, "bobot") || strings.Contains(clean, "nilai") {
			colPoin = idx
		}
	}

	// Fallback to standard column positions if header text is custom (Col 1: Soal, Col 2-6: A-E, Col 7: Kunci, Col 8: Poin)
	if colSoal == -1 && len(headerRow) > 1 {
		colSoal = 1
	}
	if colA == -1 && len(headerRow) > 2 {
		colA = 2
	}
	if colB == -1 && len(headerRow) > 3 {
		colB = 3
	}
	if colC == -1 && len(headerRow) > 4 {
		colC = 4
	}
	if colD == -1 && len(headerRow) > 5 {
		colD = 5
	}
	if colE == -1 && len(headerRow) > 6 {
		colE = 6
	}
	if colKunci == -1 && len(headerRow) > 7 {
		colKunci = 7
	}
	if colPoin == -1 && len(headerRow) > 8 {
		colPoin = 8
	}

	getVal := func(row []string, col int) string {
		if col >= 0 && col < len(row) {
			return strings.TrimSpace(row[col])
		}
		return ""
	}

	var newQuestions []models.Question
	defaultPoint := 10

	for rIdx := 1; rIdx < len(rows); rIdx++ {
		r := rows[rIdx]
		if len(r) == 0 {
			continue
		}

		soal := getVal(r, colSoal)
		if soal == "" {
			continue
		}

		optA := getVal(r, colA)
		optB := getVal(r, colB)
		optC := getVal(r, colC)
		optD := getVal(r, colD)
		optE := getVal(r, colE)

		kunci := strings.ToUpper(getVal(r, colKunci))
		if kunci == "" {
			kunci = "A" // default fallback
		}

		poin := defaultPoint
		poinStr := getVal(r, colPoin)
		if poinStr != "" {
			if pVal, err := strconv.ParseFloat(poinStr, 64); err == nil && pVal > 0 {
				poin = int(math.Round(pVal))
			}
		}

		optionsMap := map[string]string{
			"A": optA,
			"B": optB,
			"C": optC,
			"D": optD,
			"E": optE,
		}
		optionsBytes, _ := json.Marshal(optionsMap)

		q := models.Question{
			SubjectID:     uint(subjectID),
			Type:          models.MultipleChoice,
			Content:       soal,
			Options:       datatypes.JSON(optionsBytes),
			CorrectAnswer: kunci,
			Points:        poin,
			TeacherID:     teacherID,
		}
		newQuestions = append(newQuestions, q)
	}

	if len(newQuestions) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ditemukan baris soal yang valid dalam file Excel"})
		return
	}

	// Insert in transaction
	tx := config.DB.Begin()
	if err := tx.Create(&newQuestions).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan soal ke database: " + err.Error()})
		return
	}
	tx.Commit()

	// Optionally associate with exam
	examIDStr := c.PostForm("exam_id")
	if examIDStr != "" {
		if eid, err := strconv.Atoi(examIDStr); err == nil && eid > 0 {
			var exam models.Exam
			if err := config.DB.First(&exam, eid).Error; err == nil {
				config.DB.Model(&exam).Association("Questions").Append(&newQuestions)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Berhasil mengimpor %d butir soal ke mata pelajaran '%s'", len(newQuestions), subject.Name),
		"count":   len(newQuestions),
	})
}
