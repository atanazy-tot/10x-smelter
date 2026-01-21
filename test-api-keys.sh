#!/bin/bash
  BASE_URL="http://localhost:3000"

  echo "1. Register new user..."
  REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$(date +%s)'@example.com","password":"password123"}')
  TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
  echo "Token: $TOKEN"

  echo -e "\n2. Test invalid key format..."
  curl -s -X POST $BASE_URL/api/api-keys \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"api_key":"invalid"}' | jq

  echo -e "\n3. Check status (should have no key)..."
  curl -s -X GET $BASE_URL/api/api-keys/status \
    -H "Authorization: Bearer $TOKEN" | jq

  echo -e "\n4. Store valid key (replace with real key)..."
  curl -s -X POST $BASE_URL/api/api-keys \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"api_key":"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"}' | jq

  echo -e "\n5. Check status (should have key)..."
  curl -s -X GET $BASE_URL/api/api-keys/status \
    -H "Authorization: Bearer $TOKEN" | jq

  echo -e "\n6. Delete key..."
  curl -s -X DELETE $BASE_URL/api/api-keys \
    -H "Authorization: Bearer $TOKEN" | jq

  echo -e "\n7. Try deleting again (should 404)..."
  curl -s -X DELETE $BASE_URL/api/api-keys \
    -H "Authorization: Bearer $TOKEN" | jq
