//go:build ignore

package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/xuri/excelize/v2"
)

func main() {
	files := []string{
		"../Data_Siswa_Kelas_X_Smkn1Beringin.xlsx",
		"../Data_Siswa_Kelas_XI_Smkn1Beringin.xlsx",
		"../Data_Siswa_Kelas_XII_Smkn1Beringin.xlsx",
	}

	for _, file := range files {
		fmt.Printf("\n--- File: %s ---\n", file)
		f, err := excelize.OpenFile(file)
		if err != nil {
			log.Println("Error opening file:", err)
			continue
		}
		defer f.Close()

		for _, sheetName := range f.GetSheetMap() {
			fmt.Printf("Sheet: %s\n", sheetName)
			
			rows, err := f.GetRows(sheetName)
			if err != nil {
				log.Println("Error reading rows:", err)
				continue
			}

			if len(rows) > 0 {
				fmt.Printf("Header: %s\n", strings.Join(rows[0], " | "))
			}
			if len(rows) > 1 {
				fmt.Printf("Row 1: %s\n", strings.Join(rows[1], " | "))
			}
			fmt.Printf("Total rows: %d\n", len(rows))
		}
	}
}
