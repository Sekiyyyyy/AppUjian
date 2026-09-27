package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AppVersionResponse structure for client update checks
type AppVersionResponse struct {
	LatestVersion string   `json:"latest_version"`
	BuildNumber   int      `json:"build_number"`
	MinVersion    string   `json:"min_version"`
	ForceUpdate   bool     `json:"force_update"`
	Title         string   `json:"title"`
	Changelog     []string `json:"changelog"`
	DownloadURL   string   `json:"download_url"`
}

// GetAppVersion returns the latest version metadata of student client applications
func GetAppVersion(c *gin.Context) {
	c.JSON(http.StatusOK, AppVersionResponse{
		LatestVersion: "1.0.3",
		BuildNumber:   4,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.3",
		Changelog: []string{
			"Pembaruan ikon resmi SMKN 1 Beringin di semua platform (.apk, .exe, .ipa).",
			"Penyempurnaan form login CBT: Username & Password langsung dari kartu ujian.",
			"Peningkatan sistem keamanan Kiosk Anti-Cheat di Android, Windows, dan iOS.",
			"Fitur pengacakan urutan soal (randomize questions) per sesi siswa.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
