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
		LatestVersion: "1.0.0",
		BuildNumber:   1,
		MinVersion:    "1.0.0",
		ForceUpdate:   false,
		Title:         "Pembaruan Aplikasi CBT",
		Changelog: []string{
			"Rilis resmi aplikasi CBT SMK Negeri 1 Beringin.",
			"Peningkatan sistem anti-curang dan keamanan ujian.",
			"Dukungan server cloud resmi https://ujian.tiksmkn1beringin.my.id.",
		},
		DownloadURL: "https://ujian.tiksmkn1beringin.my.id/download",
	})
}
