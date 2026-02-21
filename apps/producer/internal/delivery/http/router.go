package http

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/simple-audit-log/producer-api/internal/usecase"
)

// NewRouter creates a Gin router with all routes and middleware.
func NewRouter(uc *usecase.AuditUsecase) *gin.Engine {
	r := gin.Default()

	// CORS — allow Next.js frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3001", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	handler := NewAuditHandler(uc)

	// Health
	r.GET("/health", handler.Health)

	// Audit events
	api := r.Group("/api")
	{
		api.POST("/audit", handler.SendEvent)
		api.POST("/audit/create", handler.SendEventCreate)
		api.POST("/audit/update", handler.SendEventUpdate)
		api.POST("/audit/delete", handler.SendEventDelete)
		api.POST("/audit/access", handler.SendEventAccess)
		api.POST("/audit/auth", handler.SendEventAuth)

		// Query
		api.GET("/logs", handler.GetLogs)

		// System status
		api.GET("/connectors", handler.GetConnectors)
		api.GET("/dlq", handler.GetDLQ)
	}

	return r
}
