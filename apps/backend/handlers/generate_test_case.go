package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"trafyx/backend/api/models"
	"trafyx/backend/config"
	"trafyx/backend/types"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func GenerateTestCases(c *gin.Context) {
	var request types.GenerateTestCaseRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	api_id := request.APIId

	log.Printf("Generating test cases for: %v", api_id)
	// Fetch API configuration from MongoDB
	apiConfig, err := getAPIConfigByID(api_id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err})
		return
	}

	// Prepare test case configuration with robust null/string handling
	testCaseConfig := struct {
		Method          string
		URL             string
		Headers         map[string]string
		PayloadTemplate map[string]any
	}{
		Method:          apiConfig.Method,
		URL:             apiConfig.URL,
		Headers:         parseHeadersNullable(apiConfig.Headers),
		PayloadTemplate: parsePayloadNullable(apiConfig.Payload),
	}

	// Generate test cases
	testCases, err := testCaseHandler(testCaseConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err})
		return
	}

	// Store test cases in MongoDB
	storedTestCases, err := storeTestCases(api_id, testCases, request.CreatedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "test_cases": storedTestCases})
}

// getAPIConfigByID retrieves API configuration from MongoDB
func getAPIConfigByID(apiID string) (*models.TestCase, error) {
	collection := config.MongoDB.Collection("user_apis")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectId, err := bson.ObjectIDFromHex(apiID)
	if err != nil {
		log.Printf("Invalid API ID: %v", err)
		return nil, err
	}

	var apiConfig models.TestCase
	err = collection.FindOne(ctx, bson.M{"_id": objectId}).Decode(&apiConfig)
	if err != nil {
		log.Printf("Failed to find API configuration for ID %s: %v", apiID, err)
		return nil, err
	}

	return &apiConfig, nil
}

// storeTestCases saves generated test cases to MongoDB
func storeTestCases(apiID string, testCases []models.TestCase, createdBy string) ([]models.TestCase, error) {
	collection := config.MongoDB.Collection("test_cases")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var storedTestCases []models.TestCase

	// Convert and store each test case
	for _, tc := range testCases {
		tc.ID = bson.NewObjectID()
		tc.CreatedAt = bson.NewDateTimeFromTime(time.Now())
		tc.UpdatedAt = bson.NewDateTimeFromTime(time.Now())
		tc.APIID, _ = bson.ObjectIDFromHex(apiID)
		tc.CreatedBy = createdBy

		// Ensure headers and payload are either nil or stringified JSON pointer
		if tc.Headers == nil || (tc.Headers != nil && (*tc.Headers == "" || *tc.Headers == "null" || *tc.Headers == "{}")) {
			tc.Headers = nil
		} else {
			if !isJSONString(*tc.Headers) {
				jsonStr, _ := json.Marshal(*tc.Headers)
				s := string(jsonStr)
				tc.Headers = &s
			}
		}
		if tc.Payload == nil || (tc.Payload != nil && (*tc.Payload == "" || *tc.Payload == "null" || *tc.Payload == "{}")) {
			tc.Payload = nil
		} else {
			if !isJSONString(*tc.Payload) {
				jsonStr, _ := json.Marshal(*tc.Payload)
				s := string(jsonStr)
				tc.Payload = &s
			}
		}

		_, err := collection.InsertOne(ctx, tc)
		if err != nil {
			log.Printf("Failed to insert test case: %v", err)
			continue
		}

		storedTestCases = append(storedTestCases, tc)
	}
	return storedTestCases, nil
}

// testCaseHandler generates test cases based on the API configuration
func testCaseHandler(config struct {
	Method          string
	URL             string
	Headers         map[string]string
	PayloadTemplate map[string]interface{}
}) ([]models.TestCase, error) {
	var testCases []models.TestCase

	// Generate Happy Path Test Cases
	happyPathCases := generateHappyPathTestCases(config)
	testCases = append(testCases, happyPathCases...)

	// Generate Negative Test Cases
	negativeCases := generateNegativeTestCases(config)
	testCases = append(testCases, negativeCases...)

	// Generate Edge Case Test Cases
	edgeCases := generateEdgeTestCases(config)
	testCases = append(testCases, edgeCases...)

	return testCases, nil
}

// generateHappyPathTestCases creates test cases for typical successful scenarios
func generateHappyPathTestCases(config struct {
	Method          string
	URL             string
	Headers         map[string]string
	PayloadTemplate map[string]interface{}
}) []models.TestCase {
	var happyPathCases []models.TestCase

	// Basic successful request
	basicCase := models.TestCase{
		Name:            fmt.Sprintf("%s Happy Path - Basic", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(config.PayloadTemplate),
		Description:     "Successful request with valid data",
		ExpectedOutcome: 200,
	}
	happyPathCases = append(happyPathCases, basicCase)

	// Full payload for POST/PUT
	if config.Method == "POST" || config.Method == "PUT" {
		fullPayloadCase := models.TestCase{
			Name:            fmt.Sprintf("%s Happy Path - Full Payload", strings.ToUpper(config.Method)),
			Method:          config.Method,
			URL:             config.URL,
			Headers:         stringifyHeaders(config.Headers),
			Payload:         stringifyPayload(generateFullPayload(config.PayloadTemplate)),
			Description:     "Successful request with complete payload",
			ExpectedOutcome: 201,
		}
		happyPathCases = append(happyPathCases, fullPayloadCase)
	}

	// Request with optional headers
	optionalHeadersCase := models.TestCase{
		Name:            fmt.Sprintf("%s Happy Path - Optional Headers", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(addOptionalHeaders(config.Headers)),
		Payload:         stringifyPayload(config.PayloadTemplate),
		Description:     "Successful request with additional optional headers",
		ExpectedOutcome: 200,
	}
	happyPathCases = append(happyPathCases, optionalHeadersCase)

	// Query parameters
	queryParamsCase := models.TestCase{
		Name:            fmt.Sprintf("%s Happy Path - Query Parameters", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL + "?key=value&key2=value2",
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(config.PayloadTemplate),
		Description:     "Successful request with query parameters",
		ExpectedOutcome: 200,
	}
	happyPathCases = append(happyPathCases, queryParamsCase)

	return happyPathCases
}

// generateNegativeTestCases creates test cases for failure scenarios
func generateNegativeTestCases(config struct {
	Method          string
	URL             string
	Headers         map[string]string
	PayloadTemplate map[string]interface{}
}) []models.TestCase {
	var negativeCases []models.TestCase

	// Missing required fields
	missingFieldsCase := models.TestCase{
		Name:            fmt.Sprintf("%s Negative - Missing Fields", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(generateMissingFieldsPayload(config.PayloadTemplate)),
		Description:     "Request with missing required fields",
		ExpectedOutcome: 400,
	}
	negativeCases = append(negativeCases, missingFieldsCase)

	// Invalid data types
	invalidDataTypeCase := models.TestCase{
		Name:            fmt.Sprintf("%s Negative - Invalid Data Types", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(generateInvalidDataTypePayload(config.PayloadTemplate)),
		Description:     "Request with invalid data types",
		ExpectedOutcome: 422,
	}
	negativeCases = append(negativeCases, invalidDataTypeCase)

	// Unauthorized access
	unauthorizedCase := models.TestCase{
		Name:            fmt.Sprintf("%s Negative - Unauthorized", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(map[string]string{"Authorization": "Invalid Token"}),
		Payload:         stringifyPayload(config.PayloadTemplate),
		Description:     "Request with invalid authorization",
		ExpectedOutcome: 401,
	}
	negativeCases = append(negativeCases, unauthorizedCase)

	// Invalid URL path
	invalidURLCase := models.TestCase{
		Name:            fmt.Sprintf("%s Negative - Invalid URL", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL + "/non-existent-path",
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(config.PayloadTemplate),
		Description:     "Request with invalid URL path",
		ExpectedOutcome: 404,
	}
	negativeCases = append(negativeCases, invalidURLCase)

	// Empty payload -> store as true null
	emptyPayloadCase := models.TestCase{
		Name:            fmt.Sprintf("%s Negative - Empty Payload", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         nil,
		Description:     "Request with empty payload",
		ExpectedOutcome: 400,
	}
	negativeCases = append(negativeCases, emptyPayloadCase)

	return negativeCases
}

// generateEdgeTestCases creates test cases for boundary conditions
func generateEdgeTestCases(config struct {
	Method          string
	URL             string
	Headers         map[string]string
	PayloadTemplate map[string]interface{}
}) []models.TestCase {
	var edgeCases []models.TestCase

	// Maximum payload size
	maxPayloadCase := models.TestCase{
		Name:            fmt.Sprintf("%s Edge - Maximum Payload", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(generateMaxPayload(config.PayloadTemplate)),
		Description:     "Request with maximum allowed payload size",
		ExpectedOutcome: 200,
	}
	edgeCases = append(edgeCases, maxPayloadCase)

	// Minimum required fields
	minFieldsCase := models.TestCase{
		Name:            fmt.Sprintf("%s Edge - Minimum Fields", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(generateMinPayload(config.PayloadTemplate)),
		Description:     "Request with minimum required fields",
		ExpectedOutcome: 200,
	}
	edgeCases = append(edgeCases, minFieldsCase)

	// Payload with unexpected fields
	unexpectedFieldsCase := models.TestCase{
		Name:            fmt.Sprintf("%s Edge - Unexpected Fields", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(addUnexpectedFields(config.PayloadTemplate)),
		Description:     "Request with unexpected fields in payload",
		ExpectedOutcome: 400,
	}
	edgeCases = append(edgeCases, unexpectedFieldsCase)

	// Special characters in payload
	specialCharsCase := models.TestCase{
		Name:            fmt.Sprintf("%s Edge - Special Characters", strings.ToUpper(config.Method)),
		Method:          config.Method,
		URL:             config.URL,
		Headers:         stringifyHeaders(config.Headers),
		Payload:         stringifyPayload(addSpecialCharsToPayload(config.PayloadTemplate)),
		Description:     "Request with special characters in payload",
		ExpectedOutcome: 400,
	}
	edgeCases = append(edgeCases, specialCharsCase)

	return edgeCases
}

// Utility functions

// parseHeadersNullable parses a *stringified JSON or null to map, returns nil if input is nil, empty, or "null"
func parseHeadersNullable(headers *string) map[string]string {
	if headers == nil || *headers == "" || *headers == "null" {
		return nil
	}
	var headersMap map[string]string
	_ = json.Unmarshal([]byte(*headers), &headersMap)
	return headersMap
}

// parsePayloadNullable parses a *stringified JSON or null to map, returns nil if input is nil, empty, or "null"
func parsePayloadNullable(payload *string) map[string]interface{} {
	if payload == nil || *payload == "" || *payload == "null" {
		return nil
	}
	var payloadMap map[string]interface{}
	_ = json.Unmarshal([]byte(*payload), &payloadMap)
	return payloadMap
}

// stringifyHeaders returns nil if input is nil, else pointer to stringified JSON
func stringifyHeaders(headers map[string]string) *string {
	if headers == nil || len(headers) == 0 {
		return nil
	}
	headersJSON, _ := json.Marshal(headers)
	s := string(headersJSON)
	if s == "{}" { // normalize empty object to null
		return nil
	}
	return &s
}

// stringifyPayload returns nil if input is nil, else pointer to stringified JSON
func stringifyPayload(payload map[string]interface{}) *string {
	if payload == nil || len(payload) == 0 {
		return nil
	}
	payloadJSON, _ := json.Marshal(payload)
	s := string(payloadJSON)
	if s == "{}" { // normalize empty object to null
		return nil
	}
	return &s
}

// isJSONString checks if a string is valid JSON
func isJSONString(s string) bool {
	var js json.RawMessage
	return json.Unmarshal([]byte(s), &js) == nil
}

// generateFullPayload creates a payload with all possible fields
func generateFullPayload(template map[string]interface{}) map[string]interface{} {
	fullPayload := make(map[string]interface{})
	for k, v := range template {
		// Add more detailed or comprehensive values based on type
		switch val := v.(type) {
		case string:
			fullPayload[k] = val + "_full"
		case int:
			fullPayload[k] = val * 2 // Example: doubling numeric values
		case bool:
			fullPayload[k] = !val // Example: toggling boolean values
		default:
			fullPayload[k] = val
		}
	}
	return fullPayload
}

// generateMissingFieldsPayload creates a payload with some fields removed
func generateMissingFieldsPayload(template map[string]interface{}) map[string]interface{} {
	missingPayload := make(map[string]interface{})
	keys := make([]string, 0, len(template))
	for k := range template {
		keys = append(keys, k)
	}

	// Keep only half of the fields
	for i := 0; i < len(keys)/2; i++ {
		missingPayload[keys[i]] = template[keys[i]]
	}
	return missingPayload
}

// generateInvalidDataTypePayload creates a payload with incorrect data types
func generateInvalidDataTypePayload(template map[string]interface{}) map[string]interface{} {
	invalidPayload := make(map[string]interface{})
	for k, v := range template {
		switch v.(type) {
		case string:
			invalidPayload[k] = 123 // Replace string with an integer
		case int:
			invalidPayload[k] = "invalid_number" // Replace integer with a string
		case bool:
			invalidPayload[k] = "not_a_boolean" // Replace boolean with a string
		default:
			invalidPayload[k] = nil // Replace unknown types with nil
		}
	}
	return invalidPayload
}

// generateMaxPayload creates a payload with maximum size
func generateMaxPayload(template map[string]interface{}) map[string]interface{} {
	maxPayload := make(map[string]interface{})
	for k, v := range template {
		switch val := v.(type) {
		case string:
			maxPayload[k] = strings.Repeat(val, 100) // Create very long string
		case int:
			maxPayload[k] = val * 1000000 // Scale numeric values
		default:
			maxPayload[k] = v
		}
	}
	return maxPayload
}

// generateMinPayload creates a payload with the minimum required fields
func generateMinPayload(template map[string]interface{}) map[string]interface{} {
	minPayload := make(map[string]interface{})
	for k := range template {
		// Select only the first field or a required field
		minPayload[k] = "min_value"
		break
	}
	return minPayload
}

// addOptionalHeaders appends optional headers to the existing headers
func addOptionalHeaders(headers map[string]string) map[string]string {
	if headers == nil {
		headers = make(map[string]string)
	}

	optionalHeaders := map[string]string{
		"X-Correlation-ID": "test-correlation-id-12345", // Useful for tracking requests
		"X-Request-ID":     "unique-request-id-67890",   // Unique identifier for the request
		"Content-Language": "en-US",                     // Indicating the language of the request
		"Cache-Control":    "no-cache",                  // Disables caching for testing purposes
	}

	// Combine the existing headers with the optional ones
	for key, value := range optionalHeaders {
		if _, exists := headers[key]; !exists { // Avoid overwriting existing headers
			headers[key] = value
		}
	}

	return headers
}

// addUnexpectedFields appends unexpected fields to an existing payload
func addUnexpectedFields(payload map[string]interface{}) map[string]interface{} {
	// Clone the original payload to avoid modifying the original
	updatedPayload := make(map[string]interface{})
	for k, v := range payload {
		updatedPayload[k] = v
	}

	// Add unexpected fields
	updatedPayload["unexpectedField1"] = "unexpectedValue1" // Unexpected string field
	updatedPayload["unexpectedField2"] = 12345              // Unexpected numeric field
	updatedPayload["unexpectedField3"] = true               // Unexpected boolean field
	updatedPayload["nestedUnexpectedField"] = map[string]interface{}{
		"nestedKey": "nestedUnexpectedValue",
	}

	return updatedPayload
}

// addSpecialCharsToPayload injects special characters into the payload fields
func addSpecialCharsToPayload(payload map[string]interface{}) map[string]interface{} {
	// Clone the original payload to avoid modifying the original
	updatedPayload := make(map[string]interface{})
	for k, v := range payload {
		switch value := v.(type) {
		case string:
			updatedPayload[k] = value + " !@#$%^&*()<>?{}[]|"
		case int:
			updatedPayload[k] = value // Leave numeric fields unchanged
		case bool:
			updatedPayload[k] = value // Leave boolean fields unchanged
		default:
			updatedPayload[k] = v // Copy any other types unchanged
		}
	}

	// Add a new field with special characters as a key
	updatedPayload["!@#$%^&*()<>?{}[]|"] = "valueWithSpecialChars"

	return updatedPayload
}
