package domain

// AuditProducer publishes audit events to the message broker.
type AuditProducer interface {
	// Produce sends an audit event and returns the log_id and offset.
	Produce(event *AuditEvent) (*ProduceResult, error)
	// Close gracefully shuts down the producer.
	Close() error
}

// AuditSearcher queries persisted audit logs.
type AuditSearcher interface {
	// Search returns audit logs matching the query parameters.
	Search(query LogQuery) (*LogQueryResult, error)
}

// ConnectorClient communicates with Kafka Connect REST API.
type ConnectorClient interface {
	// GetConnectorStatuses returns the status of all connectors.
	GetConnectorStatuses() (ConnectorStatus, error)
	// GetDLQCounts returns the number of messages in DLQ topics.
	GetDLQCounts() (*DLQCount, error)
}
