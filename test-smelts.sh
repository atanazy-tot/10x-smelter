#!/bin/bash
BASE_URL="http://localhost:3000"

echo "============================================"
echo "SMELTS API TEST SCRIPT"
echo "============================================"

echo -e "\n1. Register new user..."
REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test'$(date +%s)'@example.com","password":"password123"}')
TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
echo "Token: ${TOKEN:0:50}..."

# Create a test audio file (small MP3 header - not a real audio but valid for format check)
echo -e "\n2. Create test audio files..."
# Create a minimal valid-looking file with .mp3 extension
dd if=/dev/urandom of=/tmp/test-audio1.mp3 bs=1024 count=10 2>/dev/null
dd if=/dev/urandom of=/tmp/test-audio2.mp3 bs=1024 count=10 2>/dev/null
dd if=/dev/urandom of=/tmp/test-audio3.mp3 bs=1024 count=10 2>/dev/null
echo "Created test audio files"

echo -e "\n============================================"
echo "POST /api/smelts TESTS"
echo "============================================"

echo -e "\n3. Create smelt with text input..."
SMELT1=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "text=This is a test transcript from a meeting about product roadmap. We discussed Q1 goals and assigned action items to team members." \
  -F "mode=separate" \
  -F "default_prompt_names[]=summarize")
echo $SMELT1 | jq
SMELT1_ID=$(echo $SMELT1 | jq -r '.id')
echo "Smelt 1 ID: $SMELT1_ID"
echo "Subscription channel: $(echo $SMELT1 | jq -r '.subscription_channel')"

echo -e "\n4. Create smelt with single audio file..."
SMELT2=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "mode=separate" \
  -F "default_prompt_names[]=summarize" \
  -F "default_prompt_names[]=action_items")
echo $SMELT2 | jq
SMELT2_ID=$(echo $SMELT2 | jq -r '.id')
echo "Smelt 2 ID: $SMELT2_ID"

echo -e "\n5. Create smelt with multiple audio files (combine mode)..."
SMELT3=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "files[]=@/tmp/test-audio2.mp3" \
  -F "mode=combine" \
  -F "default_prompt_names[]=detailed_notes")
echo $SMELT3 | jq
SMELT3_ID=$(echo $SMELT3 | jq -r '.id')
echo "Smelt 3 ID: $SMELT3_ID"

echo -e "\n6. Create smelt with three audio files (separate mode)..."
SMELT4=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "files[]=@/tmp/test-audio2.mp3" \
  -F "files[]=@/tmp/test-audio3.mp3" \
  -F "mode=separate")
echo $SMELT4 | jq
SMELT4_ID=$(echo $SMELT4 | jq -r '.id')
echo "Smelt 4 ID: $SMELT4_ID"

echo -e "\n============================================"
echo "POST /api/smelts ERROR CASES"
echo "============================================"

echo -e "\n7. Try create with no input (should 400 no_input)..."
curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "mode=separate" | jq

echo -e "\n8. Create smelt with both files AND text (mixed input now allowed)..."
SMELT_MIXED=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "text=Some text" \
  -F "mode=separate")
echo $SMELT_MIXED | jq
SMELT_MIXED_ID=$(echo $SMELT_MIXED | jq -r '.id')
echo "Mixed Smelt ID: $SMELT_MIXED_ID"

echo -e "\n9. Try combine mode with single file (should 400 combine_requires_multiple)..."
curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "mode=combine" | jq

echo -e "\n10. Try create with invalid file format (should 400 invalid_format)..."
echo "not an audio file" > /tmp/test.txt
curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "files[]=@/tmp/test.txt" \
  -F "mode=separate" | jq

echo -e "\n11. Try create with invalid user_prompt_id (should 404 prompt_not_found)..."
curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "text=Test text" \
  -F "mode=separate" \
  -F "user_prompt_id=00000000-0000-0000-0000-000000000000" | jq

echo -e "\n============================================"
echo "GET /api/smelts LIST TESTS"
echo "============================================"

echo -e "\n12. List all smelts..."
curl -s -X GET $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n13. List smelts with pagination (page 1, limit 2)..."
curl -s -X GET "$BASE_URL/api/smelts?page=1&limit=2" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n14. List smelts with pagination (page 2, limit 2)..."
curl -s -X GET "$BASE_URL/api/smelts?page=2&limit=2" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n15. List smelts filtered by status=pending..."
curl -s -X GET "$BASE_URL/api/smelts?status=pending" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n16. List smelts sorted by created_at asc..."
curl -s -X GET "$BASE_URL/api/smelts?sort=created_at&order=asc" \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n============================================"
echo "GET /api/smelts/:id TESTS"
echo "============================================"

echo -e "\n17. Get single smelt (text input)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT1_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n18. Get single smelt (single audio)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT2_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n19. Get single smelt (combine mode)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT3_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n20. Get single smelt (multiple files separate)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT4_ID \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n21. Try get non-existent smelt (should 404)..."
curl -s -X GET $BASE_URL/api/smelts/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n22. Try get with invalid UUID (should 404)..."
curl -s -X GET $BASE_URL/api/smelts/not-a-uuid \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n============================================"
echo "AUTHENTICATION TESTS"
echo "============================================"

echo -e "\n23. Try list smelts without auth (should 401)..."
curl -s -X GET $BASE_URL/api/smelts | jq

echo -e "\n24. Try get smelt without auth (should 401)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT1_ID | jq

echo -e "\n============================================"
echo "ANONYMOUS USER TESTS"
echo "============================================"

echo -e "\n25. Create smelt as anonymous user (single file)..."
ANON_SMELT=$(curl -s -X POST $BASE_URL/api/smelts \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "mode=separate")
echo $ANON_SMELT | jq
ANON_SMELT_ID=$(echo $ANON_SMELT | jq -r '.id')
echo "Anonymous Smelt ID: $ANON_SMELT_ID"

echo -e "\n26. Try anonymous second smelt (should 403 daily_limit)..."
curl -s -X POST $BASE_URL/api/smelts \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "mode=separate" | jq

echo -e "\n27. Try anonymous with multiple files (should 401)..."
curl -s -X POST $BASE_URL/api/smelts \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "files[]=@/tmp/test-audio2.mp3" \
  -F "mode=separate" | jq

echo -e "\n28. Try anonymous with combine mode and multiple files (should 401 - multiple files check first)..."
curl -s -X POST $BASE_URL/api/smelts \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "files[]=@/tmp/test-audio2.mp3" \
  -F "mode=combine" | jq

echo -e "\n29. Try anonymous with user_prompt_id (should 401)..."
curl -s -X POST $BASE_URL/api/smelts \
  -F "files[]=@/tmp/test-audio1.mp3" \
  -F "mode=separate" \
  -F "user_prompt_id=00000000-0000-0000-0000-000000000000" | jq

echo -e "\n============================================"
echo "CROSS-USER ACCESS TESTS"
echo "============================================"

echo -e "\n30. Register second user..."
REGISTER2=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test2'$(date +%s)'@example.com","password":"password123"}')
TOKEN2=$(echo $REGISTER2 | jq -r '.session.access_token')
echo "Token 2: ${TOKEN2:0:50}..."

echo -e "\n31. Try get first user's smelt with second user (should 404)..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT1_ID \
  -H "Authorization: Bearer $TOKEN2" | jq

echo -e "\n32. List second user's smelts (should be empty)..."
curl -s -X GET $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN2" | jq

echo -e "\n============================================"
echo "CUSTOM PROMPT TESTS"
echo "============================================"

echo -e "\n33. Create a custom prompt first..."
PROMPT=$(curl -s -X POST $BASE_URL/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"My Custom Prompt","body":"Analyze this content and provide insights..."}')
echo $PROMPT | jq
PROMPT_ID=$(echo $PROMPT | jq -r '.id')
echo "Custom Prompt ID: $PROMPT_ID"

echo -e "\n34. Create smelt with custom user_prompt_id..."
SMELT5=$(curl -s -X POST $BASE_URL/api/smelts \
  -H "Authorization: Bearer $TOKEN" \
  -F "text=Analyze this quarterly report for key metrics and trends." \
  -F "mode=separate" \
  -F "user_prompt_id=$PROMPT_ID")
echo $SMELT5 | jq
SMELT5_ID=$(echo $SMELT5 | jq -r '.id')
echo "Smelt 5 ID: $SMELT5_ID"

echo -e "\n35. Get smelt with custom prompt to verify user_prompt_id..."
curl -s -X GET $BASE_URL/api/smelts/$SMELT5_ID \
  -H "Authorization: Bearer $TOKEN" | jq

# Cleanup
rm -f /tmp/test-audio1.mp3 /tmp/test-audio2.mp3 /tmp/test-audio3.mp3 /tmp/test.txt

echo -e "\n============================================"
echo "SUMMARY"
echo "============================================"
echo "Created smelts:"
echo "  - Smelt 1 (text input): $SMELT1_ID"
echo "  - Smelt 2 (single audio): $SMELT2_ID"
echo "  - Smelt 3 (combine mode): $SMELT3_ID"
echo "  - Smelt 4 (multiple separate): $SMELT4_ID"
echo "  - Smelt 5 (custom prompt): $SMELT5_ID"
echo "  - Smelt 6 (mixed input): $SMELT_MIXED_ID"
echo "  - Anonymous smelt: $ANON_SMELT_ID"

echo -e "\n✅ Test complete!"
