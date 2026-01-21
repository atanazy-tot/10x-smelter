#!/bin/bash
BASE_URL="http://localhost:3000"

echo "1. Register new user..."
REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test'$(date +%s)'@example.com","password":"password123"}')
TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
echo "Token: ${TOKEN:0:50}..."

echo -e "\n2. List sections (should be empty)..."
curl -s -X GET $BASE_URL/api/prompt-sections \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n3. Create first section..."
SECTION1=$(curl -s -X POST $BASE_URL/api/prompt-sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Work"}')
echo $SECTION1 | jq
SECTION1_ID=$(echo $SECTION1 | jq -r '.id')
echo "Section 1 ID: $SECTION1_ID"

echo -e "\n4. Create second section..."
SECTION2=$(curl -s -X POST $BASE_URL/api/prompt-sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Personal"}')
echo $SECTION2 | jq
SECTION2_ID=$(echo $SECTION2 | jq -r '.id')
echo "Section 2 ID: $SECTION2_ID"

echo -e "\n5. Create third section with explicit position..."
SECTION3=$(curl -s -X POST $BASE_URL/api/prompt-sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Archive","position":10}')
echo $SECTION3 | jq
SECTION3_ID=$(echo $SECTION3 | jq -r '.id')

echo -e "\n6. List sections (should have 3)..."
curl -s -X GET $BASE_URL/api/prompt-sections \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n7. List sections sorted by title desc..."
curl -s -X GET "$BASE_URL/api/prompt-sections?sort=title&order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n8. Update first section title..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/$SECTION1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Work Projects"}' | jq

echo -e "\n9. Update first section position..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/$SECTION1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"position":5}' | jq

echo -e "\n10. Try update with empty body (should 400)..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/$SECTION1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' | jq

echo -e "\n11. Try update non-existent section (should 404)..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test"}' | jq

echo -e "\n12. Reorder sections..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"order":[{"id":"'$SECTION1_ID'","position":2},{"id":"'$SECTION2_ID'","position":0},{"id":"'$SECTION3_ID'","position":1}]}' | jq

echo -e "\n13. List sections after reorder..."
curl -s -X GET $BASE_URL/api/prompt-sections \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n14. Try reorder with invalid section (should 404)..."
curl -s -X PATCH $BASE_URL/api/prompt-sections/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"order":[{"id":"00000000-0000-0000-0000-000000000000","position":0}]}' | jq

echo -e "\n15. Delete first section..."
curl -s -X DELETE $BASE_URL/api/prompt-sections/$SECTION1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n16. Try delete again (should 404)..."
curl -s -X DELETE $BASE_URL/api/prompt-sections/$SECTION1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n17. List sections (should have 2)..."
curl -s -X GET $BASE_URL/api/prompt-sections \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n18. Try without auth (should 401)..."
curl -s -X GET $BASE_URL/api/prompt-sections | jq

echo -e "\n19. Try create without title (should 400)..."
curl -s -X POST $BASE_URL/api/prompt-sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' | jq
