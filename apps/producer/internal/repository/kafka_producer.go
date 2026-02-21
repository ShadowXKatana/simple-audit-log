package repository

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/IBM/sarama"
	"github.com/simple-audit-log/producer-api/internal/domain"
)

// KafkaProducer implements domain.AuditProducer using Sarama.
type KafkaProducer struct {
	producer sarama.SyncProducer
	topic    string
}

// NewKafkaProducer creates a new synchronous Kafka producer.
func NewKafkaProducer(brokers []string, topic string) (*KafkaProducer, error) {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Idempotent = true
	config.Producer.Return.Successes = true
	config.Producer.Compression = sarama.CompressionLZ4
	config.Producer.Retry.Max = 10
	config.Net.MaxOpenRequests = 1 // Required for idempotent producer

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	log.Printf("[kafka] Connected to brokers: %v, topic: %s", brokers, topic)
	return &KafkaProducer{producer: producer, topic: topic}, nil
}

// Produce serializes an AuditEvent to JSON and sends it to Kafka.
func (p *KafkaProducer) Produce(event *domain.AuditEvent) (*domain.ProduceResult, error) {
	value, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topic,
		Key:   sarama.StringEncoder(event.LogID),
		Value: sarama.ByteEncoder(value),
	}

	_, offset, err := p.producer.SendMessage(msg)
	if err != nil {
		return nil, fmt.Errorf("failed to produce message: %w", err)
	}

	log.Printf("[kafka] Produced log_id=%s offset=%d", event.LogID, offset)
	return &domain.ProduceResult{
		LogID:  event.LogID,
		Offset: offset,
	}, nil
}

// Close shuts down the Kafka producer.
func (p *KafkaProducer) Close() error {
	return p.producer.Close()
}
