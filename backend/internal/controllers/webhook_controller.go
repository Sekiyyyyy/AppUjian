package controllers

import (
	"log"
	"net/http"
	"os"
	"os/exec"

	"github.com/gin-gonic/gin"
)

const webhookSecret = "appujian-sync-secret-2026"

// SyncWebhook is triggered by GitHub Actions after a successful build.
// It runs the sync_artifacts.py script to download and deploy the latest artifacts.
func SyncWebhook(c *gin.Context) {
	// Validate webhook secret
	secret := c.GetHeader("X-Webhook-Secret")
	if secret != webhookSecret {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid webhook secret"})
		return
	}

	log.Println("[Webhook] Received sync trigger from GitHub Actions. Starting artifact sync...")

	// Run the sync script in the background
	go func() {
		cmd := exec.Command("python3", "/home/server/AppUjian/sync_artifacts.py", "--force")
		cmd.Env = append(os.Environ(), "GITHUB_TOKEN="+os.Getenv("GITHUB_TOKEN"))
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[Webhook] Sync script error: %v\nOutput: %s", err, string(output))
			return
		}
		log.Printf("[Webhook] Sync completed successfully:\n%s", string(output))
	}()

	c.JSON(http.StatusOK, gin.H{
		"status":  "accepted",
		"message": "Artifact sync triggered successfully",
	})
}
