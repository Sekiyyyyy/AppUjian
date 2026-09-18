package models

import "gorm.io/gorm"

// Subject represents a course/class category for questions
type Subject struct {
	gorm.Model
	ParentID  *uint      `gorm:"index" json:"parent_id"` // null for Master/Kategori Mapel; set for Teacher Mapel
	Parent    *Subject   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Name      string     `json:"name"`
	Code      string     `json:"code,omitempty"` // e.g. "MM", "BI", "BING"
	Type      string     `json:"type"`           // "AKADEMIK" or "JURUSAN"
	Class     string     `json:"class"`          // e.g. "XII IPA" (fallback/legacy)
	TeacherID *uint      `gorm:"index" json:"teacher_id"`
	Teacher   *User      `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	Tahun     string     `json:"tahun"`    // e.g. "2026/2027"
	Semester  string     `json:"semester"` // e.g. "Ganjil" or "Genap"
	Classes   []Class    `gorm:"many2many:subject_classes;" json:"classes,omitempty"`
	Questions []Question `json:"questions,omitempty"`
	Exams     []Exam     `json:"exams,omitempty"`
	Children  []Subject  `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}
