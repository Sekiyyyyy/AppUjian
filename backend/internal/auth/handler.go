package auth

import (
	"net/http"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	DeviceID string `json:"device_id"` // Used for Zero Trust Session Binding
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  models.User  `json:"user"`
}

func LoginHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		// Find user by username
		if err := config.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		// Check password (Assuming bcrypt is used)
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}

		// Device Registration/Validation check could go here for Students
		// Example: if user.Role == RoleStudent, verify req.DeviceID against device_registrations table

		// Generate JWT Token (15 minutes expiry for high security)
		token, err := GenerateToken(user.ID, string(user.Role), req.DeviceID, cfg.JWTSecret, 15*time.Minute)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, LoginResponse{
			Token: token,
			User:  user,
		})
	}
}
