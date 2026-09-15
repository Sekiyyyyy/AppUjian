package models

import (
	"time"
	"gorm.io/gorm"
)

type Role string

const (
	RoleSuperAdmin Role = "SUPER_ADMIN"
	RoleAdmin      Role = "ADMIN"
	RoleTeacher    Role = "TEACHER"
	RoleStudent    Role = "STUDENT"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"uniqueIndex;not null" json:"username"`
	Password  string         `gorm:"not null" json:"-"`
	Name      string         `gorm:"not null" json:"name"`
	Role      Role           `gorm:"type:varchar(20);not null" json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Student struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"uniqueIndex" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user"`
	NISN      string         `gorm:"uniqueIndex;not null" json:"nisn"`
	ClassID   uint           `gorm:"index" json:"class_id"` // Will map to Class model later
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type Teacher struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"uniqueIndex" json:"user_id"`
	User      User           `gorm:"foreignKey:UserID" json:"user"`
	NIP       string         `gorm:"uniqueIndex;not null" json:"nip"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}
