package models

import (
	"gorm.io/gorm"
)

// ExamSupervisor represents a proctor/supervisor assignment of a teacher to supervise a specific class during an exam.
type ExamSupervisor struct {
	gorm.Model
	ExamID    uint   `gorm:"index:idx_exam_class_teacher,unique;not null" json:"exam_id"`
	Exam      *Exam  `gorm:"foreignKey:ExamID" json:"exam,omitempty"`
	ClassID   uint   `gorm:"index:idx_exam_class_teacher,unique;not null" json:"class_id"`
	Class     *Class `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	TeacherID uint   `gorm:"index:idx_exam_class_teacher,unique;not null" json:"teacher_id"` // User ID of the teacher (role: TEACHER)
	Teacher   *User  `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	Ruangan   string `gorm:"type:varchar(100)" json:"ruangan"` // e.g. "Lab Komputer 1", "Ruang 04"
	Notes     string `gorm:"type:varchar(255)" json:"notes"`   // e.g. "Pengawas Utama", "Sesi Pagi"
}
