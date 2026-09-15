package auth

import (
	"net/http"
	"strings"

	"github.com/AppUjian/backend/config"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates the JWT token in the Authorization header
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			return
		}

		tokenStr := parts[1]
		claims, err := ValidateToken(tokenStr, cfg.JWTSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		// Security: Zero Trust Device Binding Validation
		// If the endpoint requires a device check, it verifies the client's current Device-ID matches the token
		reqDeviceID := c.GetHeader("X-Device-ID")
		if claims.Role == "STUDENT" && claims.DeviceID != "" && reqDeviceID != claims.DeviceID {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Device mismatch violation"})
			return
		}

		// Store claims in context for later handlers
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)
		c.Set("deviceID", claims.DeviceID)

		c.Next()
	}
}

// RoleMiddleware restricts access based on user role (RBAC)
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User role not found in session"})
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Invalid role type"})
			return
		}

		allowed := false
		for _, r := range allowedRoles {
			if roleStr == r {
				allowed = true
				break
			}
		}

		if !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this resource"})
			return
		}

		c.Next()
	}
}
