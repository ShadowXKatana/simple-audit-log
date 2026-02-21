package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	delivery "github.com/simple-audit-log/producer-api/internal/delivery/http"
	"github.com/simple-audit-log/producer-api/internal/repository"
	"github.com/simple-audit-log/producer-api/internal/usecase"
)

func main() {
	// Read configuration from environment variables
	kafkaBroker := getEnv("KAFKA_BROKER", "localhost:9092")
	kafkaTopic := getEnv("KAFKA_TOPIC", "audit-log")
	esURL := getEnv("ES_URL", "http://localhost:9200")
	connectURL := getEnv("CONNECT_URL", "http://localhost:8083")
	apiPort := getEnv("API_PORT", "8080")

	brokers := strings.Split(kafkaBroker, ",")

	log.Println("=============================================")
	log.Println("🚀 Starting Audit Log Producer API")
	log.Printf("   Kafka Brokers : %v", brokers)
	log.Printf("   Kafka Topic   : %s", kafkaTopic)
	log.Printf("   Elasticsearch : %s", esURL)
	log.Printf("   Kafka Connect : %s", connectURL)
	log.Printf("   API Port      : %s", apiPort)
	log.Println("=============================================")

	// Initialize repository layer
	kafkaProducer, err := repository.NewKafkaProducer(brokers, kafkaTopic)
	if err != nil {
		log.Fatalf("Failed to initialize Kafka producer: %v", err)
	}
	defer kafkaProducer.Close()

	esClient, err := repository.NewESClient([]string{esURL})
	if err != nil {
		log.Fatalf("Failed to initialize Elasticsearch client: %v", err)
	}

	connectClient := repository.NewConnectClient(connectURL, brokers)
	defer connectClient.Close()

	// Initialize usecase layer
	auditUsecase := usecase.NewAuditUsecase(kafkaProducer, esClient, connectClient)

	// Initialize HTTP delivery layer
	router := delivery.NewRouter(auditUsecase)

	// Start server
	addr := fmt.Sprintf(":%s", apiPort)
	log.Printf("🌐 Server listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
