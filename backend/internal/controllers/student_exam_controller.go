package controllers

import (
	"net/http"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// StartExam initiates an exam session for the student
func StartExam(c *gin.Context) {
	examID := c.Param("id")
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var student models.Student
	if err := config.DB.Where("user_id = ?", userID).First(&student).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a student"})
		return
	}

	var exam models.Exam
	if err := config.DB.First(&exam, examID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	// Security: Validate Exam Time Constraints
	now := time.Now()
	if !exam.IsMakeupOpen {
		if now.Before(exam.StartTime) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Ujian belum dimulai"})
			return
		}
		if now.After(exam.EndTime) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Waktu ujian sudah habis"})
			return
		}
	}

	var session models.ExamSession
	err := config.DB.Where("student_id = ? AND exam_id = ?", student.ID, exam.ID).First(&session).Error
	if err == nil {
		c.JSON(http.StatusOK, session)
		return
	}

	session = models.ExamSession{
		StudentID: student.ID,
		ExamID:    exam.ID,
		StartTime: time.Now(),
		Status:    "ONGOING",
	}

	if err := config.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start exam"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// GetExamQuestions returns questions for the exam without the correct answers
func GetExamQuestions(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")

	var student models.Student
	config.DB.Where("user_id = ?", userID).First(&student)

	var session models.ExamSession
	if err := config.DB.Where("student_id = ? AND exam_id = ?", student.ID, examID).First(&session).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Exam session not found or not started"})
		return
	}

	var exam models.Exam
	if err := config.DB.Preload("Questions").First(&exam, examID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	var studentAnswers []models.StudentAnswer
	config.DB.Where("session_id = ?", session.ID).Find(&studentAnswers)

	answerMap := make(map[uint]string)
	for _, a := range studentAnswers {
		answerMap[a.QuestionID] = a.Answer
	}

	type QuestionResponse struct {
		ID            uint           `json:"id"`
		Type          string         `json:"type"`
		Content       string         `json:"content"`
		Options       any            `json:"options,omitempty"`
		StudentAnswer string         `json:"student_answer,omitempty"`
	}

	var questions []QuestionResponse
	for _, q := range exam.Questions {
		ans := answerMap[q.ID]
		var opts any
		if q.Type == models.MultipleChoice {
			opts = q.Options
		}
		questions = append(questions, QuestionResponse{
			ID:            q.ID,
			Type:          string(q.Type),
			Content:       q.Content,
			Options:       opts,
			StudentAnswer: ans,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"session":   session,
		"questions": questions,
		"duration":  exam.Duration,
	})
}

type AnswerInput struct {
	QuestionID uint   `json:"question_id"`
	Answer     string `json:"answer"`
}

// SubmitAnswer saves a single answer
func SubmitAnswer(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")
	var req AnswerInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var student models.Student
	config.DB.Where("user_id = ?", userID).First(&student)

	var session models.ExamSession
	if err := config.DB.Where("student_id = ? AND exam_id = ?", student.ID, examID).First(&session).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Session not found"})
		return
	}

	if session.Status != "ONGOING" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Exam already submitted or timeout"})
		return
	}

	var studentAnswer models.StudentAnswer
	err := config.DB.Where("session_id = ? AND question_id = ?", session.ID, req.QuestionID).First(&studentAnswer).Error
	if err == nil {
		studentAnswer.Answer = req.Answer
		config.DB.Save(&studentAnswer)
	} else {
		studentAnswer = models.StudentAnswer{
			SessionID:  session.ID,
			QuestionID: req.QuestionID,
			Answer:     req.Answer,
		}
		config.DB.Create(&studentAnswer)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Answer saved"})
}

// FinishExam calculates the score and ends the session
func FinishExam(c *gin.Context) {
	examID := c.Param("id")
	userID, _ := c.Get("userID")

	var student models.Student
	config.DB.Where("user_id = ?", userID).First(&student)

	var session models.ExamSession
	if err := config.DB.Where("student_id = ? AND exam_id = ?", student.ID, examID).First(&session).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Session not found"})
		return
	}

	if session.Status != "ONGOING" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Already submitted"})
		return
	}

	var exam models.Exam
	config.DB.Preload("Questions").First(&exam, examID)

	var answers []models.StudentAnswer
	config.DB.Where("session_id = ?", session.ID).Find(&answers)

	answerMap := make(map[uint]models.StudentAnswer)
	for _, a := range answers {
		answerMap[a.QuestionID] = a
	}

	totalScore := 0.0
	for _, q := range exam.Questions {
		if ans, ok := answerMap[q.ID]; ok {
			if q.Type == models.MultipleChoice {
				if ans.Answer == q.CorrectAnswer {
					ans.Score = float64(q.Points)
					totalScore += ans.Score
					config.DB.Save(&ans)
				}
			}
		}
	}

	now := time.Now()
	session.Status = "SUBMITTED"
	session.EndTime = now
	session.Score = totalScore
	config.DB.Save(&session)

	c.JSON(http.StatusOK, gin.H{"message": "Exam finished successfully"})
}
