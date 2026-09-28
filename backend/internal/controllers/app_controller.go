package controllers

import (
	"net/http"
	"strconv"
	"strings"

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

const (
	CurrentLatestAppVersion  = "1.0.8"
	CurrentLatestBuildNumber = 9
	CurrentMinAppVersion     = "1.0.8"
	CurrentAppDownloadURL    = "https://ujian.tiksmkn1beringin.my.id/download"
)

// IsVersionOutdated compares a client version against the required minimum version
func IsVersionOutdated(clientVersion string, clientBuild int) bool {
	if clientVersion == "" {
		return true
	}

	clientParts := strings.Split(clientVersion, ".")
	minParts := strings.Split(CurrentMinAppVersion, ".")

	for i := 0; i < 3; i++ {
		cVal := 0
		mVal := 0
		if i < len(clientParts) {
			cVal, _ = strconv.Atoi(clientParts[i])
		}
		if i < len(minParts) {
			mVal, _ = strconv.Atoi(minParts[i])
		}
		if cVal < mVal {
			return true
		}
		if cVal > mVal {
			return false
		}
	}

	if clientBuild > 0 && clientBuild < CurrentLatestBuildNumber {
		return true
	}

	return false
}

// StudentVersionCheckMiddleware ensures that student clients are on the mandatory version
func StudentVersionCheckMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientVersion := c.GetHeader("X-App-Version")
		clientBuildStr := c.GetHeader("X-App-Build")
		clientBuild, _ := strconv.Atoi(clientBuildStr)

		if IsVersionOutdated(clientVersion, clientBuild) {
			c.JSON(http.StatusUpgradeRequired, gin.H{
				"error":            "Versi aplikasi Anda sudah usang. Wajib memperbarui ke versi terbaru (v" + CurrentLatestAppVersion + ") untuk dapat mengikuti ujian!",
				"upgrade_required": true,
				"latest_version":   CurrentLatestAppVersion,
				"build_number":     CurrentLatestBuildNumber,
				"min_version":      CurrentMinAppVersion,
				"download_url":     CurrentAppDownloadURL,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetAppVersion returns the latest version metadata of student client applications
func GetAppVersion(c *gin.Context) {
	c.JSON(http.StatusOK, AppVersionResponse{
		LatestVersion: CurrentLatestAppVersion,
		BuildNumber:   CurrentLatestBuildNumber,
		MinVersion:    CurrentMinAppVersion,
		ForceUpdate:   true,
		Title:         "Pembaruan Wajib Aplikasi CBT v" + CurrentLatestAppVersion,
		Changelog: []string{
			"Pembaruan keamanan sistem ujian terbaru dan peningkatan integritas ujian.",
			"Pembaruan Wajib: Menutup seluruh celah keamanan dan kecurangan pada versi terdahulu.",
			"Sinkronisasi ketat live room pengawas ujian dan kontrol siswa.",
			"Optimalisasi performa, kestabilan koneksi, dan responsivitas pengerjaan soal.",
		},
		DownloadURL: CurrentAppDownloadURL,
	})
}
