#!/bin/bash

# Test script for real-time progress system
# Tests broadcasting and subscription of smelt processing events

BASE_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "REALTIME PROGRESS SYSTEM TEST"
echo "============================================"

# Load env vars
if [ -f .env ]; then
  export $(grep -E "^SUPABASE_URL=|^SUPABASE_KEY=" .env | xargs)
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env"
  exit 1
fi

echo "Supabase URL: $SUPABASE_URL"

echo -e "\n1. Registering test user..."
REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"realtime-test-'$(date +%s)'@example.com","password":"password123"}')

TOKEN=$(echo $REGISTER | jq -r '.session.access_token')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to register user"
  echo $REGISTER | jq
  exit 1
fi
echo "Token: ${TOKEN:0:50}..."

# Generate a smelt ID ahead of time (we'll use the channel name pattern)
SMELT_ID_PREVIEW="smelt:pending-$(date +%s)"
echo -e "\n2. Creating subscriber script..."

# Create a temporary Node.js script for subscription (in project dir for node_modules access)
cat > .tmp-realtime-subscriber.mjs << 'NODESCRIPT'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const channelName = process.argv[2];
const timeout = parseInt(process.argv[3] || '30000');

if (!supabaseUrl || !supabaseKey || !channelName) {
  console.error('Usage: SUPABASE_URL=... SUPABASE_KEY=... node subscriber.mjs <channel> [timeout_ms]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
let eventCount = 0;
let completed = false;

console.log(`Subscribing to channel: ${channelName}`);
console.log(`Timeout: ${timeout}ms`);
console.log('---');

const channel = supabase
  .channel(channelName)
  .on('broadcast', { event: 'progress' }, (message) => {
    eventCount++;
    const p = message.payload;
    console.log(`[PROGRESS] ${p.progress.percentage}% - ${p.progress.message}`);
    console.log(`  Status: ${p.status}`);
    console.log(`  Files: ${JSON.stringify(p.files)}`);
  })
  .on('broadcast', { event: 'completed' }, (message) => {
    eventCount++;
    completed = true;
    const p = message.payload;
    console.log(`[COMPLETED] Smelt ${p.smelt_id} finished!`);
    console.log(`  Results: ${p.results.length} file(s)`);
    p.results.forEach(r => {
      console.log(`    - ${r.filename}: ${r.content.substring(0, 50)}...`);
    });
    cleanup();
  })
  .on('broadcast', { event: 'failed' }, (message) => {
    eventCount++;
    completed = true;
    const p = message.payload;
    console.log(`[FAILED] Smelt ${p.smelt_id} failed!`);
    console.log(`  Error code: ${p.error_code}`);
    console.log(`  Message: ${p.error_message}`);
    cleanup();
  })
  .subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      console.log('Subscription active, waiting for events...');
      console.log('(Create smelt now to trigger processing)');
      console.log('---');
      // Signal that we're ready
      console.log('READY');
    } else if (status === 'CHANNEL_ERROR') {
      console.error('Channel error:', error);
      cleanup();
    }
  });

function cleanup() {
  setTimeout(() => {
    supabase.removeChannel(channel);
    console.log('---');
    console.log(`Total events received: ${eventCount}`);
    console.log(`Processing completed: ${completed}`);
    process.exit(completed ? 0 : 1);
  }, 500);
}

// Timeout handler
setTimeout(() => {
  if (!completed) {
    console.log('---');
    console.log('Timeout reached - no completion event received');
    cleanup();
  }
}, timeout);
NODESCRIPT

# Create a test that pre-generates a UUID and subscribes before creating
echo -e "\n3. Running integrated test with pre-subscription..."

cat > .tmp-realtime-test.mjs << 'NODESCRIPT'
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const token = process.env.AUTH_TOKEN;
const timeout = parseInt(process.env.TIMEOUT || '30000');

if (!supabaseUrl || !supabaseKey || !token) {
  console.error('Missing required env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
let eventCount = 0;
let completed = false;
let smeltId = null;
let channel = null;

async function createSmelt() {
  const formData = new FormData();
  formData.append('text', 'This is a test transcript for the real-time progress system.');
  formData.append('mode', 'separate');
  formData.append('default_prompt_names[]', 'summarize');

  const response = await fetch(`${baseUrl}/api/smelts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create smelt: ${response.status} ${error}`);
  }

  return response.json();
}

async function subscribeAndCreate() {
  // First create the smelt to get its ID
  console.log('Creating smelt...');
  const smelt = await createSmelt();
  smeltId = smelt.id;
  const channelName = smelt.subscription_channel;

  console.log(`Smelt ID: ${smeltId}`);
  console.log(`Channel: ${channelName}`);
  console.log('---');

  // Subscribe to channel (processing already started but might still have events)
  console.log('Subscribing to channel...');

  channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'progress' }, (message) => {
      eventCount++;
      const p = message.payload;
      console.log(`[PROGRESS] ${p.progress.percentage}% - ${p.progress.message}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Files: ${p.files.map(f => `${f.id.slice(0,8)}:${f.status}`).join(', ')}`);
    })
    .on('broadcast', { event: 'completed' }, (message) => {
      eventCount++;
      completed = true;
      const p = message.payload;
      console.log(`[COMPLETED] Smelt ${p.smelt_id.slice(0,8)}... finished!`);
      console.log(`  Results: ${p.results.length} file(s)`);
      p.results.forEach(r => {
        console.log(`    - ${r.filename}: "${r.content.substring(0, 50)}..."`);
      });
      cleanup();
    })
    .on('broadcast', { event: 'failed' }, (message) => {
      eventCount++;
      completed = true;
      const p = message.payload;
      console.log(`[FAILED] Smelt ${p.smelt_id.slice(0,8)}... failed!`);
      console.log(`  Error: ${p.error_code} - ${p.error_message}`);
      cleanup();
    })
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscription active');
        console.log('---');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Channel error:', error);
        cleanup();
      }
    });
}

function cleanup() {
  setTimeout(async () => {
    if (channel) {
      await supabase.removeChannel(channel);
    }
    console.log('---');
    console.log(`Total events received: ${eventCount}`);

    // Check final status via API
    if (smeltId) {
      const response = await fetch(`${baseUrl}/api/smelts/${smeltId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const final = await response.json();
      console.log(`Final status: ${final.status}`);
    }

    process.exit(completed ? 0 : 1);
  }, 1000);
}

// Timeout handler
setTimeout(() => {
  if (!completed) {
    console.log('---');
    console.log('Timeout - checking final status...');
    cleanup();
  }
}, timeout);

// Run
subscribeAndCreate().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
NODESCRIPT

# Run the integrated test
AUTH_TOKEN="$TOKEN" BASE_URL="$BASE_URL" TIMEOUT=30000 node .tmp-realtime-test.mjs

# Cleanup
rm -f .tmp-realtime-subscriber.mjs .tmp-realtime-test.mjs

echo -e "\n============================================"
echo "TEST COMPLETE"
echo "============================================"
