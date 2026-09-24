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
		LatestVersion: "1.0.1",
		BuildNumber:   2,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT",
		Changelog: []string{
			"Perbaikan sistem koneksi otomatis ke server sekolah.",
			"Peningkatan sistem keamanan dan kunci layar anti-curang.",
			"Pembaruan antarmuka soal ujian lebih responsif.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
