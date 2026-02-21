package usecase

import (
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/simple-audit-log/producer-api/internal/domain"
)

// validOutcomes is the set of allowed outcome values.
var validOutcomes = map[string]bool{
	"SUCCESS": true,
	"FAILURE": true,
	"PENDING": true,
}

// AuditUsecase implements the business logic for audit events.
type AuditUsecase struct {
	producer  domain.AuditProducer
	searcher  domain.AuditSearcher
	connector domain.ConnectorClient
}

// NewAuditUsecase creates a new AuditUsecase.
func NewAuditUsecase(
	producer domain.AuditProducer,
	searcher domain.AuditSearcher,
	connector domain.ConnectorClient,
) *AuditUsecase {
	return &AuditUsecase{
		producer:  producer,
		searcher:  searcher,
		connector: connector,
	}
}

// SendEvent validates, enriches, and produces an audit event.
func (u *AuditUsecase) SendEvent(event *domain.AuditEvent) (*domain.ProduceResult, error) {
	if err := validate(event); err != nil {
		return nil, err
	}

	// Auto-generate log_id (UUID v7) if not provided
	if event.LogID == "" {
		id, err := uuid.NewV7()
		if err != nil {
			return nil, errors.New("failed to generate UUID v7")
		}
		event.LogID = id.String()
	}

	// Auto-generate timestamp (RFC3339) if not provided
	if event.Timestamp == "" {
		event.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	return u.producer.Produce(event)
}

// SendEventWithAction validates and produces an event with a pre-set action type.
func (u *AuditUsecase) SendEventWithAction(event *domain.AuditEvent, action string) (*domain.ProduceResult, error) {
	event.Event.Action = strings.ToUpper(action)
	return u.SendEvent(event)
}

// SearchLogs queries logs from Elasticsearch.
func (u *AuditUsecase) SearchLogs(query domain.LogQuery) (*domain.LogQueryResult, error) {
	if query.Size <= 0 {
		query.Size = 50
	}
	if query.From < 0 {
		query.From = 0
	}
	return u.searcher.Search(query)
}

// GetConnectorStatuses returns all connector statuses.
func (u *AuditUsecase) GetConnectorStatuses() (domain.ConnectorStatus, error) {
	return u.connector.GetConnectorStatuses()
}

// GetDLQCounts returns DLQ message counts.
func (u *AuditUsecase) GetDLQCounts() (*domain.DLQCount, error) {
	return u.connector.GetDLQCounts()
}

// validate checks required fields per spec §4.5.
func validate(e *domain.AuditEvent) error {
	if strings.TrimSpace(e.Actor.UserID) == "" {
		return errors.New("actor.user_id is required")
	}
	if strings.TrimSpace(e.Actor.Role) == "" {
		return errors.New("actor.role is required")
	}
	if strings.TrimSpace(e.Event.Action) == "" {
		return errors.New("event.action is required")
	}
	if !validOutcomes[strings.ToUpper(e.Event.Outcome)] {
		return errors.New("event.outcome must be SUCCESS, FAILURE, or PENDING")
	}
	if strings.TrimSpace(e.Target.ResourceType) == "" {
		return errors.New("target.resource_type is required")
	}
	if strings.TrimSpace(e.Target.ResourceID) == "" {
		return errors.New("target.resource_id is required")
	}
	// Normalize outcome to upper-case
	e.Event.Outcome = strings.ToUpper(e.Event.Outcome)
	return nil
}
