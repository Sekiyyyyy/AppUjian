package models

import "gorm.io/gorm"

// Category represents an exam category or semester (e.g., Mid Sem 1, Sem 1)
type Category struct {
	gorm.Model
	Name string `json:"name" binding:"required"`
}
