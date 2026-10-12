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
	CurrentLatestAppVersion  = "1.2.0"
	CurrentLatestBuildNumber = 22
	CurrentMinAppVersion     = "1.2.0"
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
			"Fitur Pembaruan Otomatis Langsung di Aplikasi: Siswa dapat mengunduh dan memperbarui APK secara instan langsung dari dalam aplikasi dengan progress bar real-time tanpa keluar ke browser.",
			"Keamanan Tingkat Lanjut Anti-Emulator PC: Deteksi ketat terhadap BlueStacks 5, LDPlayer, Nox, MEmu, dan MuMu untuk menjamin integritas, keadilan, dan kejujuran ujian sekolah.",
			"Kompatibilitas Penuh Seluruh Versi Android: Dukungan sempurna dari Android 5 hingga Android 15 untuk segala merek smartphone (Infinix, Oppo, Vivo, Xiaomi, Samsung, Realme).",
			"Ikon Mata Field Password: Siswa dapat memeriksa kata sandi atau token ujian yang diketik pada halaman login secara transparan.",
			"Perbaikan Sentuhan & OEM: Stabilitas gesture sentuhan dan pencegahan false alarm sleep tombol daya.",
		},
		DownloadURL: CurrentAppDownloadURL,
	})
}
