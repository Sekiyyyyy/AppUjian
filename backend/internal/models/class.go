package models

import (
	"fmt"

	"gorm.io/gorm"
)

// Class represents a SMK class (Rombel)
type Class struct {
	gorm.Model
	Level      string `json:"level"`      // e.g., "X", "XI", "XII"
	Department string `json:"department"` // e.g., "PPLG", "TKJ", "AKL"
	Number     string `json:"number"`     // e.g., "1", "2", "3"
	Name       string `json:"name"`       // Generated e.g., "XII PPLG 1"
}

func (c *Class) BeforeSave(tx *gorm.DB) (err error) {
	c.Name = fmt.Sprintf("%s %s %s", c.Level, c.Department, c.Number)
	return nil
}
