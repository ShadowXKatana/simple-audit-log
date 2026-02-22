package http

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/simple-audit-log/producer-api/internal/domain"
	"github.com/simple-audit-log/producer-api/internal/usecase"
)

// AuditHandler handles HTTP requests for audit operations.
type AuditHandler struct {
	usecase *usecase.AuditUsecase
}

// NewAuditHandler creates a new handler.
func NewAuditHandler(uc *usecase.AuditUsecase) *AuditHandler {
	return &AuditHandler{usecase: uc}
}

// Health returns service health status.
func (h *AuditHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"kafka":  "connected",
	})
}

// SendEvent handles POST /api/audit — generic event submission.
func (h *AuditHandler) SendEvent(c *gin.Context) {
	var event domain.AuditEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	result, err := h.usecase.SendEvent(&event)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// SendEventCreate handles POST /api/audit/create
func (h *AuditHandler) SendEventCreate(c *gin.Context) {
	h.sendWithAction(c, "CREATE")
}

// SendEventUpdate handles POST /api/audit/update
func (h *AuditHandler) SendEventUpdate(c *gin.Context) {
	h.sendWithAction(c, "UPDATE")
}

// SendEventDelete handles POST /api/audit/delete
func (h *AuditHandler) SendEventDelete(c *gin.Context) {
	h.sendWithAction(c, "DELETE")
}

// SendEventAccess handles POST /api/audit/access
func (h *AuditHandler) SendEventAccess(c *gin.Context) {
	h.sendWithAction(c, "ACCESS")
}

// SendEventAuth handles POST /api/audit/auth
func (h *AuditHandler) SendEventAuth(c *gin.Context) {
	h.sendWithAction(c, "AUTHENTICATION")
}

// sendWithAction is a helper to send an event with a pre-set action.
func (h *AuditHandler) sendWithAction(c *gin.Context, action string) {
	var event domain.AuditEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	result, err := h.usecase.SendEventWithAction(&event, action)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, result)
}

// GetLogs handles GET /api/logs — query audit logs from Elasticsearch.
func (h *AuditHandler) GetLogs(c *gin.Context) {
	size, _ := strconv.Atoi(c.DefaultQuery("size", "50"))
	from, _ := strconv.Atoi(c.DefaultQuery("from", "0"))
	action := c.Query("action")
	userID := c.Query("user_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	query := domain.LogQuery{
		Size:     size,
		From:     from,
		Action:   action,
		UserID:   userID,
		DateFrom: dateFrom,
		DateTo:   dateTo,
	}

	result, err := h.usecase.SearchLogs(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetConnectors handles GET /api/connectors — returns connector statuses.
func (h *AuditHandler) GetConnectors(c *gin.Context) {
	statuses, err := h.usecase.GetConnectorStatuses()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, statuses)
}

// GetDLQ handles GET /api/dlq — returns DLQ message counts.
func (h *AuditHandler) GetDLQ(c *gin.Context) {
	counts, err := h.usecase.GetDLQCounts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, counts)
}
