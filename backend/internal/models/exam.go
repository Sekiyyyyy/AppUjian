package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type QuestionType string

const (
	MultipleChoice QuestionType = "MULTIPLE_CHOICE"
	Essay          QuestionType = "ESSAY"
)

// Question represents a single question in the bank
type Question struct {
	gorm.Model
	SubjectID     uint           `json:"subject_id"`
	Subject       *Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	Type          QuestionType   `json:"type"`
	Content       string         `json:"content"` // Can contain markdown or HTML
	ImageUrl      string         `json:"image_url,omitempty"`
	Options       datatypes.JSON `json:"options,omitempty"` // For multiple choice: {"A": "...", "B": "..."}
	CorrectAnswer string         `json:"correct_answer,omitempty"` // Example: "A" or text for essay keyword
	Points        int            `json:"points"`
	TeacherID     uint           `json:"teacher_id"`
}

// Exam represents a scheduled examination
type Exam struct {
	gorm.Model
	Title       string     `json:"title"`
	SubjectID   uint       `json:"subject_id"`
	Subject     *Subject   `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
	StartTime   time.Time  `json:"start_time"`
	EndTime     time.Time  `json:"end_time"`
	Duration     int        `json:"duration"` // in minutes
	TotalPoints  int        `json:"total_points"`
	Status       string     `json:"status"` // DRAFT, SCHEDULED, ACTIVE, COMPLETED
	IsMakeupOpen bool       `json:"is_makeup_open"` // For manual makeup exam toggle
	CategoryID   *uint      `json:"category_id"`
	Category    *Category  `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	TeacherID   uint       `json:"teacher_id"`
	Tahun       string     `json:"tahun"`
	Semester    string     `json:"semester"`
	Proktor     string     `json:"proktor"`
	Pengawas    string     `json:"pengawas"`
	Questions   []Question `gorm:"many2many:exam_questions;" json:"questions,omitempty"`
	Classes     []Class    `gorm:"many2many:exam_classes;" json:"classes,omitempty"`
}

// ExamSession represents a student's instance of taking an exam
type ExamSession struct {
	gorm.Model
	StudentID          uint      `gorm:"index:idx_student_exam" json:"student_id"`
	ExamID             uint      `gorm:"index:idx_student_exam" json:"exam_id"`
	StartTime          time.Time `json:"start_time"`
	EndTime            time.Time `json:"end_time,omitempty"`
	Status             string    `json:"status"` // ONGOING, FINISHED, SUBMITTED, TIMEOUT
	Score              float64   `json:"score"`
	DeviceID           string    `json:"device_id"`           // Security: Zero Trust
	IPAddress          string    `json:"ip_address"`          // Security
	BrowserFingerprint string    `json:"browser_fingerprint"` // Security: Detect multiple browsers
}

// StudentAnswer stores individual answers given by a student during an ExamSession
type StudentAnswer struct {
	gorm.Model
	SessionID  uint    `gorm:"index:idx_session_question" json:"session_id"`
	QuestionID uint    `gorm:"index:idx_session_question" json:"question_id"`
	Answer     string  `json:"answer"`
	Score      float64 `json:"score"`
}
