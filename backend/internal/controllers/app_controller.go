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
		LatestVersion: "1.0.7",
		BuildNumber:   8,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.7",
		Changelog: []string{
			"Penyempurnaan tata letak Desktop: Kartu ujian aktif dan kartu siswa kini tampil penuh (full-width) proporsional dan tidak lagi terbelah setengah.",
			"Pembersihan judul header yang bertumpuk pada tampilan beranda desktop.",
			"Penyempurnaan halaman Riwayat Ujian: Tampil rapi dan proporsional.",
			"Anti-cheat Desktop dan Mobile: Tetap ketat dan aman.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
