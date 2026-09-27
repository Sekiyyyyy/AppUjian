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
		LatestVersion: "1.0.6",
		BuildNumber:   7,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT v1.0.6",
		Changelog: []string{
			"Penyempurnaan anti-cheat Desktop: Aplikasi ujian di desktop langsung terkunci seketika saat siswa beralih jendela/keluar tanpa celah.",
			"Penyempurnaan responsivitas halaman Riwayat Ujian: Bebas dari overflow pada nama mapel panjang dan menggunakan grid 2 kolom di desktop.",
			"Penyempurnaan tampilan kartu siswa di beranda Desktop agar proporsional dan tidak meregang kosong.",
			"Perilaku tombol power Mobile: Layar mati via tombol power tetap aman dan ujian lanjut tanpa terkunci.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
