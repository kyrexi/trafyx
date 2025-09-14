package models

import "go.mongodb.org/mongo-driver/v2/bson"

type TestCase struct {
	ID              bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	CreatedAt       bson.DateTime `bson:"created_at,omitempty" json:"created_at"`
	UpdatedAt       bson.DateTime `bson:"updated_at,omitempty" json:"updated_at"`
	APIID           bson.ObjectID `bson:"api_id,omitempty" json:"api_id"`
	Name            string        `bson:"name" json:"name"`
	Method          string        `bson:"method" json:"method"`
	URL             string        `bson:"url" json:"url"`
	Headers         *string       `bson:"headers" json:"headers"`
	Payload         *string       `bson:"payload" json:"payload"`
	Description     string        `bson:"description" json:"description"`
	ExpectedOutcome int           `bson:"expected_outcome" json:"expected_outcome"`
	CreatedBy       string        `bson:"created_by,omitempty" json:"created_by"`
}
