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
	CurrentLatestAppVersion  = "1.1.6"
	CurrentLatestBuildNumber = 18
	CurrentMinAppVersion     = "1.1.6"
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
	clientVersion := c.GetHeader("X-App-Version")
	clientBuildStr := c.GetHeader("X-App-Build")
	clientBuild, _ := strconv.Atoi(clientBuildStr)

	// If client provided version headers and is already on latest, force_update is false.
	// If client version is outdated, force_update is true.
	isOutdated := false
	if clientVersion != "" {
		isOutdated = IsVersionOutdated(clientVersion, clientBuild)
	}

	c.JSON(http.StatusOK, AppVersionResponse{
		LatestVersion: CurrentLatestAppVersion,
		BuildNumber:   CurrentLatestBuildNumber,
		MinVersion:    CurrentMinAppVersion,
		ForceUpdate:   isOutdated,
		Title:         "Pembaruan Wajib Aplikasi CBT v" + CurrentLatestAppVersion,
		Changelog: []string{
			"Perbaikan Layar Mati & Tombol Power: Layar otomatis dijaga tetap menyala, dan jika layar mati atau tombol power tertekan tidak akan mengunci ujian.",
			"Perbaikan Sentuhan & OEM Infinix / Oppo / Xiaomi: Memperbaiki masalah layar tidak merespons sentuhan (touch unresponsive) dan kompatibilitas semat layar di semua ROM.",
			"Kompatibilitas Luas Android 8.0+: Pustaka native dan ikon aplikasi distandarisasi agar instalasi berhasil di seluruh merek HP Android.",
		},
		DownloadURL: CurrentAppDownloadURL,
	})
}
