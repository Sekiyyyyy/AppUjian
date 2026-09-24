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

	// Clean up subjects invalid teacher_id if table exists before auto-migrating constraints
	config.DB.Exec("UPDATE subjects SET teacher_id = NULL WHERE teacher_id = 0 OR teacher_id NOT IN (SELECT id FROM users)")

	// Database Auto Migrate
	err := config.DB.AutoMigrate(
		&models.User{},
		&models.Student{},
		&models.Teacher{},
		&models.Class{},
		&models.Category{},
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
		AllowAllOrigins:  true,
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
			authRoutes.GET("/me", auth.AuthMiddleware(cfg), auth.MeHandler())
		}

		// Public App Client Updates & Version Info
		appRoutes := api.Group("/app")
		{
			appRoutes.GET("/version", controllers.GetAppVersion)
		}

		// Protected Admin / Teacher Routes
		adminRoutes := api.Group("/admin")
		adminRoutes.Use(auth.AuthMiddleware(cfg), auth.RoleMiddleware(string(models.RoleAdmin), string(models.RoleTeacher)))
		{
			// Classes Management
			adminRoutes.GET("/classes", controllers.GetClasses)
			adminRoutes.POST("/classes", controllers.CreateClass)
			adminRoutes.POST("/classes/promote", controllers.PromoteClasses)
			adminRoutes.DELETE("/classes/:id", controllers.DeleteClass)

			// Categories Management
			adminRoutes.GET("/categories", controllers.GetCategories)
			adminRoutes.POST("/categories", controllers.CreateCategory)
			adminRoutes.PUT("/categories/:id", controllers.UpdateCategory)
			adminRoutes.DELETE("/categories/:id", controllers.DeleteCategory)

			// Subjects Management
			adminRoutes.GET("/subjects", controllers.GetSubjects)
			adminRoutes.GET("/subjects/categories", controllers.GetSubjectCategories)
			adminRoutes.GET("/subjects/categories/:id/teachers", controllers.GetCategoryTeacherSubjects)
			adminRoutes.POST("/subjects/teacher-subject", controllers.CreateTeacherSubject)
			adminRoutes.PUT("/subjects/teacher-subject/:id", controllers.UpdateTeacherSubject)
			adminRoutes.POST("/subjects", controllers.CreateSubject)
			adminRoutes.PUT("/subjects/:id", controllers.UpdateSubject)
			adminRoutes.DELETE("/subjects/:id", controllers.DeleteSubject)

			// Question Bank
			adminRoutes.GET("/questions", controllers.GetQuestions)
			adminRoutes.GET("/questions/template", controllers.DownloadQuestionTemplateExcel)
			adminRoutes.POST("/questions", controllers.CreateQuestion)
			adminRoutes.POST("/questions/import-excel", controllers.ImportQuestionsExcel)
			adminRoutes.DELETE("/questions/:id", controllers.DeleteQuestion)

			// Exam Management
			adminRoutes.GET("/exams", controllers.GetExams)
			adminRoutes.POST("/exams", controllers.CreateExam)
			adminRoutes.PUT("/exams/:id", controllers.UpdateExam)
			adminRoutes.POST("/exams/:id/toggle-makeup", controllers.ToggleMakeup)
			adminRoutes.GET("/exams/:id/participants", controllers.GetExamParticipants)
			adminRoutes.GET("/exams/:id/export-grades", controllers.ExportExamGradesExcel)
			adminRoutes.DELETE("/exams/:id/reset/:student_id", controllers.ResetStudentExam)
			adminRoutes.POST("/exams/:id/unlock/:student_id", controllers.UnlockStudentExam)
			adminRoutes.DELETE("/exams/:id", controllers.DeleteExam)

			// User Management
			adminRoutes.GET("/users", controllers.GetUsers)
			adminRoutes.POST("/users", controllers.CreateTeacher)
			adminRoutes.PUT("/users/:id", controllers.UpdateUser)
			adminRoutes.DELETE("/users/:id", controllers.DeleteUser)

			// Student Management
			adminRoutes.GET("/students", controllers.GetStudents)
			adminRoutes.POST("/students", controllers.CreateStudent)
			adminRoutes.POST("/students/import", controllers.ImportStudentsCSV)
			adminRoutes.POST("/students/generate-tokens", controllers.GenerateTokens)
			adminRoutes.GET("/students/export-tokens", controllers.ExportTokens)
			adminRoutes.PUT("/students/:id", controllers.UpdateStudent)
			adminRoutes.DELETE("/students/:id", controllers.DeleteStudent)
		}

		// Student API Routes
		studentRoutes := api.Group("/student")
		studentRoutes.Use(auth.AuthMiddleware(cfg), auth.RoleMiddleware(string(models.RoleStudent)))
		{
			studentRoutes.GET("/exams", controllers.GetStudentExams)
			studentRoutes.POST("/exams/:id/start", controllers.StartExam)
			studentRoutes.GET("/exams/:id/questions", controllers.GetExamQuestions)
			studentRoutes.GET("/exams/:id/session", controllers.GetExamSessionStatus)
			studentRoutes.POST("/exams/:id/lock", controllers.LockExam)
			studentRoutes.POST("/exams/:id/answer", controllers.SubmitAnswer)
			studentRoutes.POST("/exams/:id/finish", controllers.FinishExam)
		}
	}

	// 7. Start Server
	log.Println("Starting server on port", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
