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
		LatestVersion: "1.0.5",
		BuildNumber:   6,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.5",
		Changelog: []string{
			"Perbaikan tombol power: Layar mati atau tombol power tidak lagi mengunci sesi ujian (ujian dapat dilanjutkan saat layar dinyalakan kembali).",
			"Otomatis kunci ujian kini hanya aktif ketika siswa benar-benar keluar dari aplikasi.",
			"Penyempurnaan responsivitas tampilan mobile pada semua ukuran layar (bebas dari teks terpotong dan overflow bar).",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
