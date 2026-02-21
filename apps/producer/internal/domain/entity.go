package domain

// AuditEvent represents a single audit log entry matching the RFC schema.
type AuditEvent struct {
	Timestamp string  `json:"timestamp"` // ISO 8601, auto-generated if empty
	LogID     string  `json:"log_id"`    // UUID v7, auto-generated if empty
	Actor     Actor   `json:"actor"`
	Event     Event   `json:"event"`
	Target    Target  `json:"target"`
	Changes   *Change `json:"changes,omitempty"`
	Payload   *Change `json:"payload,omitempty"`
	Metadata  *Meta   `json:"metadata,omitempty"`
}

// Actor represents who performed the action.
type Actor struct {
	UserID    string `json:"user_id"`
	Role      string `json:"role"`
	IPAddress string `json:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
}

// Event represents what happened.
type Event struct {
	Action  string `json:"action"`
	Module  string `json:"module,omitempty"`
	Outcome string `json:"outcome"`
}

// Target represents the resource affected.
type Target struct {
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
}

// Change represents a field change (before/after values).
type Change struct {
	Field    string      `json:"field,omitempty"`
	OldValue interface{} `json:"old_value"`
	NewValue interface{} `json:"new_value"`
}

// Meta holds optional correlation/tracing metadata.
type Meta struct {
	CorrelationID string `json:"correlation_id,omitempty"`
	ServiceName   string `json:"service_name,omitempty"`
}

// ProduceResult is returned after successfully producing an event to Kafka.
type ProduceResult struct {
	LogID  string `json:"log_id"`
	Offset int64  `json:"offset"`
}

// LogQuery represents search parameters for querying audit logs.
type LogQuery struct {
	Size   int    `json:"size"`
	From   int    `json:"from"`
	Action string `json:"action,omitempty"`
	UserID string `json:"user_id,omitempty"`
}

// LogQueryResult represents the response from a log search.
type LogQueryResult struct {
	Total int64        `json:"total"`
	Logs  []AuditEvent `json:"logs"`
}

// ConnectorStatus holds the status for a named connector.
type ConnectorStatus map[string]string

// DLQCount represents dead-letter-queue message counts.
type DLQCount struct {
	EsDLQCount int64 `json:"es_dlq_count"`
	S3DLQCount int64 `json:"s3_dlq_count"`
}
