package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"trafyx/backend/api/models"
	"trafyx/backend/config"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

// Execute Test Cases
func ExecuteTestCases(c *gin.Context) {
	apiId := c.Query("api_id")

	// Fetch test cases from mongoDb
	log.Println("Fetching test cases for api_id: " + apiId)
	testCases, err := fetchTestCases(apiId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	// Run the test cases through
	log.Println("Running test Cases for the apiId: " + apiId)
	results, err := runTestCases(testCases)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	// Save the test results in the DB
	log.Println("Saving test results for apiId: " + apiId)
	saved, err := saveResultsInDB(results)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	c.JSON(http.StatusOK, gin.H{"results": results, "success": saved})
}

func fetchTestCases(apiId string) ([]models.TestCase, error) {
	objectId, err := bson.ObjectIDFromHex(apiId)
	if err != nil {
		return []models.TestCase{}, err
	}

	collection := config.MongoDB.Collection("test_cases")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Finding all the test cases for the given user API
	cursor, err := collection.Find(ctx, bson.M{"api_id": objectId})
	if err != nil {
		log.Fatal(err)
		return []models.TestCase{}, err
	}
	defer cursor.Close(ctx)

	// Prepare the results response
	var testCases []models.TestCase
	if err = cursor.All(ctx, &testCases); err != nil {
		log.Fatal(err)
		return []models.TestCase{}, err
	}

	return testCases, nil
}

// Function to run the test cases
func runTestCases(testCases []models.TestCase) ([]models.TestResult, error) {
	var results []models.TestResult
	var wg sync.WaitGroup
	var mu = &sync.Mutex{}

	for _, testCase := range testCases {
		wg.Add(1)
		go func(tc models.TestCase) {
			defer wg.Done()

			start := time.Now()
			headers := make(map[string]string)
			if tc.Headers != nil && len(*tc.Headers) > 0 && *tc.Headers != "null" {
				if err := json.Unmarshal([]byte(*tc.Headers), &headers); err != nil {
					log.Println("Error in unmarshalling headers:", err)
					// Continue without headers rather than failing the whole case
				}
			}

			var bodyReader io.Reader
			if tc.Payload != nil && *tc.Payload != "" && *tc.Payload != "null" {
				bodyReader = bytes.NewBufferString(*tc.Payload)
			}

			req, err := http.NewRequest(tc.Method, tc.URL, bodyReader)
			if err != nil {
				log.Println("Error in creating new request:", err)
				return
			}

			for key, value := range headers {
				req.Header.Set(key, value)
			}

			client := &http.Client{}
			resp, err := client.Do(req)
			if err != nil {
				log.Println("Request failed:", err)
				mu.Lock()
				results = append(results, models.TestResult{
					TestCaseID:      tc.ID,
					StatusCode:      0,
					Response:        "Request Failed: " + err.Error(),
					ExpectedOutcome: tc.ExpectedOutcome,
					TestResult:      false,
					Duration:        time.Since(start).Seconds(),
					ExecutedAt:      bson.NewDateTimeFromTime(start),
				})
				mu.Unlock()
				return
			}
			defer resp.Body.Close()

			// Read the response body properly
			bodyBytes, err := io.ReadAll(resp.Body)
			if err != nil {
				log.Println("Error reading response body:", err)
				bodyBytes = []byte("Failed to read response body")
			}
			responseBody := string(bodyBytes)

			isTestPassed := resp.StatusCode == tc.ExpectedOutcome

			mu.Lock()
			results = append(results, models.TestResult{
				TestCaseID:      tc.ID,
				StatusCode:      resp.StatusCode,
				Response:        responseBody, // Store the response as string
				ExpectedOutcome: tc.ExpectedOutcome,
				TestResult:      isTestPassed,
				Duration:        time.Since(start).Seconds(),
				ExecutedAt:      bson.NewDateTimeFromTime(start),
			})
			mu.Unlock()
		}(testCase)
	}
	wg.Wait()
	return results, nil
}

// Function to save the results directly in the DB with updated RunCount
func saveResultsInDB(results []models.TestResult) (bool, error) {
	collection := config.MongoDB.Collection("test_results")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Extract all TestCaseIDs from the results to query existing run counts
	testCaseIDs := make([]bson.ObjectID, len(results))
	for i, result := range results {
		testCaseIDs[i] = result.TestCaseID
	}

	// Pipeline to find the maximum RunCount for each TestCaseID
	pipeline := bson.A{
		bson.D{{Key: "$match", Value: bson.D{{Key: "test_case_id", Value: bson.D{{Key: "$in", Value: testCaseIDs}}}}}},
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$test_case_id"},
			{Key: "maxRunCount", Value: bson.D{{Key: "$max", Value: "$run_count"}}},
		}}},
	}

	// Execute the aggregation to get max RunCounts
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		return false, err
	}
	defer cursor.Close(ctx)

	// Decode the aggregation results into a map
	var maxRunCounts []struct {
		ID          bson.ObjectID `bson:"_id"`
		MaxRunCount int           `bson:"maxRunCount"`
	}
	if err = cursor.All(ctx, &maxRunCounts); err != nil {
		return false, err
	}

	// Create a map from TestCaseID to its max RunCount
	maxRunCountMap := make(map[bson.ObjectID]int)
	for _, item := range maxRunCounts {
		maxRunCountMap[item.ID] = item.MaxRunCount
	}

	// Update each TestResult's RunCount based on the max found
	for i := range results {
		testCaseID := results[i].TestCaseID
		currentMax, exists := maxRunCountMap[testCaseID]
		if !exists {
			currentMax = 0 // If no previous runs, start at 1
		}
		results[i].RunCount = currentMax + 1
	}

	// Prepare documents for insertion
	var insertDocs []interface{}
	for _, result := range results {
		insertDocs = append(insertDocs, result)
	}

	// Insert the updated results
	_, err = collection.InsertMany(ctx, insertDocs)
	if err != nil {
		return false, err
	}

	return true, nil
}
