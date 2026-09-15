package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Config represents JWT configuration
type JWTConfig struct {
	SecretKey string
}

// Claims represents the JWT Claims payload
type Claims struct {
	UserID   uint   `json:"user_id"`
	Role     string `json:"role"`
	DeviceID string `json:"device_id,omitempty"` // For Session Binding & Zero Trust
	jwt.RegisteredClaims
}

// GenerateToken generates a new JWT token for a user
func GenerateToken(userID uint, role string, deviceID string, secretKey string, duration time.Duration) (string, error) {
	claims := Claims{
		UserID:   userID,
		Role:     role,
		DeviceID: deviceID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secretKey))
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenStr, secretKey string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
