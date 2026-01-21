#!/bin/bash
BASE_URL="http://localhost:3000"

echo "1. Register new user..."
REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test'$(date +%s)'@example.com","password":"password123"}')
TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
echo "Token: ${TOKEN:0:50}..."

echo -e "\n2. Create a section for testing..."
SECTION=$(curl -s -X POST $BASE_URL/api/prompt-sections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Section"}')
echo $SECTION | jq
SECTION_ID=$(echo $SECTION | jq -r '.id')
echo "Section ID: $SECTION_ID"

echo -e "\n3. List prompts (should be empty)..."
curl -s -X GET $BASE_URL/api/prompts \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n4. Create first prompt (unsectioned)..."
PROMPT1=$(curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meeting Summary","body":"Summarize the key points from this meeting transcript..."}')
echo $PROMPT1 | jq
PROMPT1_ID=$(echo $PROMPT1 | jq -r '.id')
echo "Prompt 1 ID: $PROMPT1_ID"

echo -e "\n5. Create second prompt (in section)..."
PROMPT2=$(curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Action Items","body":"Extract all action items and deadlines from this text...","section_id":"'$SECTION_ID'"}')
echo $PROMPT2 | jq
PROMPT2_ID=$(echo $PROMPT2 | jq -r '.id')
echo "Prompt 2 ID: $PROMPT2_ID"

echo -e "\n6. Create third prompt (in section, explicit position)..."
PROMPT3=$(curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Q&A Format","body":"Convert this content into a question and answer format...","section_id":"'$SECTION_ID'","position":10}')
echo $PROMPT3 | jq
PROMPT3_ID=$(echo $PROMPT3 | jq -r '.id')
echo "Prompt 3 ID: $PROMPT3_ID"

echo -e "\n7. List all prompts (should have 3)..."
curl -s -X GET $BASE_URL/api/prompts \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n8. List prompts in section..."
curl -s -X GET "$BASE_URL/api/prompts?section_id=$SECTION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n9. List unsectioned prompts (section_id=null)..."
curl -s -X GET "$BASE_URL/api/prompts?section_id=null" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n10. List prompts sorted by title desc..."
curl -s -X GET "$BASE_URL/api/prompts?sort=title&order=desc" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n11. List prompts with pagination..."
curl -s -X GET "$BASE_URL/api/prompts?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n12. Get single prompt..."
curl -s -X GET $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n13. Try get non-existent prompt (should 404)..."
curl -s -X GET $BASE_URL/api/prompts/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n14. Update prompt title..."
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Meeting Summary v2"}' | jq

echo -e "\n15. Update prompt body..."
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"body":"Updated: Summarize the key points and decisions from this meeting..."}' | jq

echo -e "\n16. Move prompt to section..."
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":"'$SECTION_ID'"}' | jq

echo -e "\n17. Move prompt to unsectioned..."
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":null}' | jq

echo -e "\n18. Try update with body too long (should 400)..."
LONG_BODY=$(printf 'x%.0s' {1..4001})
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"body":"'$LONG_BODY'"}' | jq

echo -e "\n19. Try update non-existent prompt (should 404)..."
curl -s -X PATCH $BASE_URL/api/prompts/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test"}' | jq

echo -e "\n20. Try update with invalid section (should 404)..."
curl -s -X PATCH $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":"00000000-0000-0000-0000-000000000000"}' | jq

echo -e "\n21. Reorder prompts in section..."
curl -s -X PATCH $BASE_URL/api/prompts/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":"'$SECTION_ID'","order":[{"id":"'$PROMPT2_ID'","position":1},{"id":"'$PROMPT3_ID'","position":0}]}' | jq

echo -e "\n22. List prompts in section after reorder..."
curl -s -X GET "$BASE_URL/api/prompts?section_id=$SECTION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n23. Try reorder with invalid prompt (should 404)..."
curl -s -X PATCH $BASE_URL/api/prompts/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":"'$SECTION_ID'","order":[{"id":"00000000-0000-0000-0000-000000000000","position":0}]}' | jq

echo -e "\n24. Try reorder with empty order (should 400)..."
curl -s -X PATCH $BASE_URL/api/prompts/reorder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"section_id":"'$SECTION_ID'","order":[]}' | jq

echo -e "\n25. Upload prompt from .md file..."
echo "This is a test prompt from a markdown file." > /tmp/test-prompt.md
curl -s -X POST $BASE_URL/api/prompts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-prompt.md" | jq

echo -e "\n26. Upload prompt with custom title..."
curl -s -X POST $BASE_URL/api/prompts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-prompt.md" \
  -F "title=Custom Title" | jq

echo -e "\n27. Upload prompt to section..."
curl -s -X POST $BASE_URL/api/prompts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-prompt.md" \
  -F "section_id=$SECTION_ID" | jq

echo -e "\n28. Try upload non-.md file (should 400)..."
echo "test" > /tmp/test.txt
curl -s -X POST $BASE_URL/api/prompts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt" | jq

echo -e "\n29. Try upload without file (should 400)..."
curl -s -X POST $BASE_URL/api/prompts/upload \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n30. Delete first prompt..."
curl -s -X DELETE $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n31. Try delete again (should 404)..."
curl -s -X DELETE $BASE_URL/api/prompts/$PROMPT1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n32. List prompts after delete..."
curl -s -X GET $BASE_URL/api/prompts \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n33. Try without auth (should 401)..."
curl -s -X GET $BASE_URL/api/prompts | jq

echo -e "\n34. Try create without title (should 400)..."
curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"body":"Some content"}' | jq

echo -e "\n35. Try create without body (should 400)..."
curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Some title"}' | jq

echo -e "\n36. Try create with invalid section (should 404)..."
curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","body":"Content","section_id":"00000000-0000-0000-0000-000000000000"}' | jq

# Cleanup
rm -f /tmp/test-prompt.md /tmp/test.txt

echo -e "\n✅ Test complete!"
