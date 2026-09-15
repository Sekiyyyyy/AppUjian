package models

import "gorm.io/gorm"

// Subject represents a course/class category for questions
type Subject struct {
	gorm.Model
	Name      string     `json:"name"`
	Type      string     `json:"type"` // "AKADEMIK" or "JURUSAN"
	Class     string     `json:"class"` // e.g. "XII IPA" (will be deprecated later or kept as general label)
	TeacherID uint       `json:"teacher_id"`
	Questions []Question `json:"questions,omitempty"`
}
