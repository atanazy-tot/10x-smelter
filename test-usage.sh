#!/bin/bash
BASE_URL="http://localhost:3000"

echo "============================================"
echo "USAGE API TEST SCRIPT"
echo "============================================"

echo -e "\n1. Test anonymous user usage..."
curl -s -X GET $BASE_URL/api/usage | jq

echo -e "\n2. Register new user..."
REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usage-test'$(date +%s)'@example.com","password":"password123"}')
TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
echo "Token: ${TOKEN:0:50}..."

echo -e "\n3. Test authenticated user usage (should be 'authenticated' type)..."
curl -s -X GET $BASE_URL/api/usage \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n4. Test with invalid token (should return anonymous)..."
curl -s -X GET $BASE_URL/api/usage \
  -H "Authorization: Bearer invalid_token_here" | jq

echo -e "\n============================================"
echo "SUMMARY"
echo "============================================"
echo "Expected responses:"
echo "  - Anonymous: type='anonymous', smelts_used_today, daily_limit, can_process, resets_at"
echo "  - Authenticated: type='authenticated', credits_remaining, weekly_credits_max, can_process, resets_at, days_until_reset"
echo "  - Unlimited: type='unlimited', api_key_status='valid', can_process=true"

echo -e "\n✅ Test complete!"
