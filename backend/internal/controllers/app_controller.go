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
		LatestVersion: "1.0.2",
		BuildNumber:   3,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.2",
		Changelog: []string{
			"Optimalisasi antarmuka dan stabilitas koneksi client ke server sekolah.",
			"Peningkatan sistem keamanan kunci layar anti-curang di semua platform.",
			"Dukungan penuh multi-platform: Android, Windows Desktop (.exe), dan Apple iOS (.ipa).",
			"Penyempurnaan sinkronisasi jawaban dan deteksi status ujian otomatis.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
