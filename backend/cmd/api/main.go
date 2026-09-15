package main

import (
	"log"
	"net/http"
	"time"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/auth"
	"github.com/AppUjian/backend/internal/controllers"
	"github.com/AppUjian/backend/internal/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Connect to Database
	config.ConnectDB(cfg)

	// 3. Auto Migrate Models
	err := config.DB.AutoMigrate(
		&models.User{},
		&models.Student{},
		&models.Teacher{},
		&models.Class{},
		&models.Subject{},
		&models.Question{},
		&models.Exam{},
		&models.ExamSession{},
		&models.StudentAnswer{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate database: %v", err)
	}

	// 4. Setup Gin Router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Device-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 5. Basic Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"version": "1.0.0",
		})
	})

	// 6. Setup API Routes
	api := r.Group("/api/v1")
	{
		// Public Auth Routes
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/login", auth.LoginHandler(cfg))
		}

		// Protected Admin / Teacher Routes
		adminRoutes := api.Group("/admin")
		adminRoutes.Use(auth.AuthMiddleware(cfg), auth.RoleMiddleware(string(models.RoleAdmin), string(models.RoleTeacher)))
		{
			// Classes (SMK Rombel)
			adminRoutes.GET("/classes", controllers.GetClasses)
			adminRoutes.POST("/classes", controllers.CreateClass)
			adminRoutes.DELETE("/classes/:id", controllers.DeleteClass)

			// Subjects Management
			adminRoutes.GET("/subjects", controllers.GetSubjects)
			adminRoutes.POST("/subjects", controllers.CreateSubject)
			adminRoutes.DELETE("/subjects/:id", controllers.DeleteSubject)

			// Question Bank
			adminRoutes.GET("/questions", controllers.GetQuestions)
			adminRoutes.POST("/questions", controllers.CreateQuestion)
			adminRoutes.DELETE("/questions/:id", controllers.DeleteQuestion)

			// Exam Management
			adminRoutes.GET("/exams", controllers.GetExams)
			adminRoutes.POST("/exams", controllers.CreateExam)
			adminRoutes.DELETE("/exams/:id", controllers.DeleteExam)

			// User Management
			adminRoutes.GET("/users", controllers.GetUsers)
			adminRoutes.POST("/users", controllers.CreateTeacher)
			adminRoutes.DELETE("/users/:id", controllers.DeleteUser)
		}
	}

	// 7. Start Server
	log.Println("Starting server on port", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
