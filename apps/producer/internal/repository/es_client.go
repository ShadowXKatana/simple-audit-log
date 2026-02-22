package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/simple-audit-log/producer-api/internal/domain"
)

// ESClient implements domain.AuditSearcher using go-elasticsearch.
type ESClient struct {
	client *elasticsearch.Client
}

// NewESClient creates a new Elasticsearch client.
func NewESClient(addresses []string) (*ESClient, error) {
	cfg := elasticsearch.Config{
		Addresses: addresses,
	}

	es, err := elasticsearch.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create ES client: %w", err)
	}

	// Test connection
	res, err := es.Info()
	if err != nil {
		log.Printf("[es] Warning: could not connect to Elasticsearch: %v", err)
	} else {
		res.Body.Close()
		log.Printf("[es] Connected to Elasticsearch at %v", addresses)
	}

	return &ESClient{client: es}, nil
}

// Search queries the audit-log index with optional filters.
func (c *ESClient) Search(query domain.LogQuery) (*domain.LogQueryResult, error) {
	// Build the index pattern (matches the audit-log index written by Kafka Connect)
	indexPattern := "audit-log*"

	// Build query body
	must := []map[string]interface{}{}

	if query.Action != "" {
		must = append(must, map[string]interface{}{
			"term": map[string]interface{}{
				"event.action": strings.ToUpper(query.Action),
			},
		})
	}

	if query.UserID != "" {
		must = append(must, map[string]interface{}{
			"term": map[string]interface{}{
				"actor.user_id": query.UserID,
			},
		})
	}

	if query.DateFrom != "" || query.DateTo != "" {
		rangeClause := map[string]interface{}{}
		if query.DateFrom != "" {
			rangeClause["gte"] = query.DateFrom
		}
		if query.DateTo != "" {
			rangeClause["lte"] = query.DateTo
		}
		must = append(must, map[string]interface{}{
			"range": map[string]interface{}{
				"timestamp": rangeClause,
			},
		})
	}

	var queryBody map[string]interface{}
	if len(must) > 0 {
		queryBody = map[string]interface{}{
			"query": map[string]interface{}{
				"bool": map[string]interface{}{
					"must": must,
				},
			},
			"sort": []map[string]interface{}{
				{"timestamp": map[string]string{"order": "desc"}},
			},
			"size": query.Size,
			"from": query.From,
		}
	} else {
		queryBody = map[string]interface{}{
			"query": map[string]interface{}{
				"match_all": map[string]interface{}{},
			},
			"sort": []map[string]interface{}{
				{"timestamp": map[string]string{"order": "desc"}},
			},
			"size": query.Size,
			"from": query.From,
		}
	}

	body, err := json.Marshal(queryBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal query: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := c.client.Search(
		c.client.Search.WithContext(ctx),
		c.client.Search.WithIndex(indexPattern),
		c.client.Search.WithBody(bytes.NewReader(body)),
		c.client.Search.WithTrackTotalHits(true),
	)
	if err != nil {
		return nil, fmt.Errorf("ES search failed: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("ES search error: %s", res.String())
	}

	// Parse response
	var result struct {
		Hits struct {
			Total struct {
				Value int64 `json:"value"`
			} `json:"total"`
			Hits []struct {
				Source domain.AuditEvent `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode ES response: %w", err)
	}

	logs := make([]domain.AuditEvent, 0, len(result.Hits.Hits))
	for _, hit := range result.Hits.Hits {
		logs = append(logs, hit.Source)
	}

	return &domain.LogQueryResult{
		Total: result.Hits.Total.Value,
		Logs:  logs,
	}, nil
}
