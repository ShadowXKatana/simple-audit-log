package repository

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/IBM/sarama"
	"github.com/simple-audit-log/producer-api/internal/domain"
)

// ConnectClient implements domain.ConnectorClient.
type ConnectClient struct {
	connectURL string
	httpClient *http.Client
	brokers    []string
}

// NewConnectClient creates a new Kafka Connect REST API client.
func NewConnectClient(connectURL string, brokers []string) *ConnectClient {
	return &ConnectClient{
		connectURL: connectURL,
		httpClient: &http.Client{Timeout: 5 * time.Second},
		brokers:    brokers,
	}
}

// GetConnectorStatuses returns a map of connector name → state (RUNNING, PAUSED, FAILED, etc.).
func (c *ConnectClient) GetConnectorStatuses() (domain.ConnectorStatus, error) {
	// GET /connectors
	resp, err := c.httpClient.Get(c.connectURL + "/connectors")
	if err != nil {
		return nil, fmt.Errorf("failed to reach Kafka Connect: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var connectorNames []string
	if err := json.Unmarshal(body, &connectorNames); err != nil {
		return nil, fmt.Errorf("failed to parse connector list: %w", err)
	}

	statuses := make(domain.ConnectorStatus)
	for _, name := range connectorNames {
		status, err := c.getConnectorStatus(name)
		if err != nil {
			statuses[name] = "UNKNOWN"
			log.Printf("[connect] Warning: could not get status for %s: %v", name, err)
			continue
		}
		statuses[name] = status
	}

	return statuses, nil
}

// getConnectorStatus fetches the status of a single connector.
func (c *ConnectClient) getConnectorStatus(name string) (string, error) {
	resp, err := c.httpClient.Get(fmt.Sprintf("%s/connectors/%s/status", c.connectURL, name))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Connector struct {
			State string `json:"state"`
		} `json:"connector"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Connector.State, nil
}

// GetDLQCounts returns message counts for the DLQ topics.
func (c *ConnectClient) GetDLQCounts() (*domain.DLQCount, error) {
	config := sarama.NewConfig()
	config.Consumer.Return.Errors = true

	client, err := sarama.NewClient(c.brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka client for DLQ: %w", err)
	}
	defer client.Close()

	esDLQ, err := getTopicMessageCount(client, "audit-log-dlq")
	if err != nil {
		log.Printf("[dlq] Warning: could not get ES DLQ count: %v", err)
		esDLQ = 0
	}

	s3DLQ, err := getTopicMessageCount(client, "audit-log-s3-dlq")
	if err != nil {
		log.Printf("[dlq] Warning: could not get S3 DLQ count: %v", err)
		s3DLQ = 0
	}

	return &domain.DLQCount{
		EsDLQCount: esDLQ,
		S3DLQCount: s3DLQ,
	}, nil
}

// getTopicMessageCount calculates approximate message count for a topic.
func getTopicMessageCount(client sarama.Client, topic string) (int64, error) {
	partitions, err := client.Partitions(topic)
	if err != nil {
		return 0, err
	}

	var total int64
	for _, partition := range partitions {
		newest, err := client.GetOffset(topic, partition, sarama.OffsetNewest)
		if err != nil {
			return 0, err
		}
		oldest, err := client.GetOffset(topic, partition, sarama.OffsetOldest)
		if err != nil {
			return 0, err
		}
		total += newest - oldest
	}

	return total, nil
}
