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
		LatestVersion: "1.0.4",
		BuildNumber:   5,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.4",
		Changelog: []string{
			"Tampilan desktop: Tombol navigasi soal (Sebelumnya, Ragu-ragu, Berikutnya) kini fixed di bawah layar tanpa perlu scroll.",
			"Penyempurnaan responsivitas tampilan ujian di seluruh perangkat (HP, Tablet, Laptop, PC Lab).",
			"Penyempurnaan sistem keamanan Kiosk Anti-Cheat di Android, Windows, dan iOS.",
			"Fitur pengacakan urutan soal (randomize questions) per sesi siswa.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
