# Implementation Plan: Real-Time Progress (Supabase Realtime)

## 1. Overview

Real-time progress updates are delivered via Supabase Realtime subscriptions, not REST endpoints. Clients subscribe to a channel after creating a smelt and receive progress, completion, and error events.

This implementation covers:
- Client-side subscription setup
- Server-side event broadcasting
- Event payload structures
- Processing stage updates

---

## 2. Subscription Channel

### Channel Naming Convention

```
smelt:{smelt_id}
```

Example: `smelt:550e8400-e29b-41d4-a716-446655440000`

The channel name is returned in the `subscription_channel` field of the `POST /api/smelts` response.

---

## 3. Event Types

### From `src/types.ts`

```typescript
// Progress event
interface SmeltProgressEventDTO {
  event: "progress";
  payload: SmeltProgressEventPayloadDTO;
}

interface SmeltProgressEventPayloadDTO {
  smelt_id: string;
  status: SmeltStatus;
  progress: SmeltProgressDTO;
  files: SmeltFileProgressDTO[];
}

interface SmeltProgressDTO {
  percentage: number;
  stage: SmeltStatus;
  message: string;
}

interface SmeltFileProgressDTO {
  id: string;
  status: SmeltFileStatus;
  progress: number;
}

// Completion event
interface SmeltCompletedEventDTO {
  event: "completed";
  payload: SmeltCompletedEventPayloadDTO;
}

interface SmeltCompletedEventPayloadDTO {
  smelt_id: string;
  status: "completed";
  results: SmeltResultDTO[];
}

interface SmeltResultDTO {
  file_id: string;
  filename: string;
  content: string;
}

// Error event
interface SmeltFailedEventDTO {
  event: "failed";
  payload: SmeltFailedEventPayloadDTO;
}

interface SmeltFailedEventPayloadDTO {
  smelt_id: string;
  status: "failed";
  error_code: SmeltErrorCode;
  error_message: string;
}

// Union type
type SmeltRealtimeEventDTO =
  | SmeltProgressEventDTO
  | SmeltCompletedEventDTO
  | SmeltFailedEventDTO;
```

---

## 4. Processing Stages

| Stage | Percentage Range | Message |
|-------|------------------|---------|
| `pending` | 0% | Waiting to process... |
| `validating` | 0-10% | Validating files... |
| `decoding` | 10-20% | Decoding audio... |
| `transcribing` | 20-70% | Transcribing audio... |
| `synthesizing` | 70-100% | Generating output... |
| `completed` | 100% | Complete |
| `failed` | - | Processing failed |

---

## 5. Client-Side Implementation

### Create file: `src/lib/realtime/smelt-subscription.ts`

```typescript
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  SmeltRealtimeEventDTO,
  SmeltProgressEventPayloadDTO,
  SmeltCompletedEventPayloadDTO,
  SmeltFailedEventPayloadDTO,
} from "@/types";

export interface SmeltSubscriptionCallbacks {
  onProgress?: (payload: SmeltProgressEventPayloadDTO) => void;
  onCompleted?: (payload: SmeltCompletedEventPayloadDTO) => void;
  onFailed?: (payload: SmeltFailedEventPayloadDTO) => void;
  onError?: (error: Error) => void;
}

export class SmeltSubscription {
  private channel: RealtimeChannel | null = null;

  constructor(
    private supabase: SupabaseClient,
    private smeltId: string,
    private callbacks: SmeltSubscriptionCallbacks
  ) {}

  subscribe(): void {
    const channelName = `smelt:${this.smeltId}`;

    this.channel = this.supabase
      .channel(channelName)
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        this.callbacks.onProgress?.(payload as SmeltProgressEventPayloadDTO);
      })
      .on("broadcast", { event: "completed" }, ({ payload }) => {
        this.callbacks.onCompleted?.(payload as SmeltCompletedEventPayloadDTO);
        // Auto-unsubscribe on completion
        this.unsubscribe();
      })
      .on("broadcast", { event: "failed" }, ({ payload }) => {
        this.callbacks.onFailed?.(payload as SmeltFailedEventPayloadDTO);
        // Auto-unsubscribe on failure
        this.unsubscribe();
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to ${channelName}`);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.callbacks.onError?.(error ?? new Error(`Subscription ${status}`));
        }
      });
  }

  unsubscribe(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

// Factory function for easier usage
export function subscribeToSmelt(
  supabase: SupabaseClient,
  smeltId: string,
  callbacks: SmeltSubscriptionCallbacks
): SmeltSubscription {
  const subscription = new SmeltSubscription(supabase, smeltId, callbacks);
  subscription.subscribe();
  return subscription;
}
```

### React Hook for Smelt Subscription

**File**: `src/lib/hooks/useSmeltSubscription.ts`

```typescript
import { useEffect, useRef, useState } from "react";
import { subscribeToSmelt, type SmeltSubscription } from "@/lib/realtime/smelt-subscription";
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  SmeltProgressEventPayloadDTO,
  SmeltCompletedEventPayloadDTO,
  SmeltFailedEventPayloadDTO,
} from "@/types";

interface SmeltState {
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    percentage: number;
    stage: string;
    message: string;
  } | null;
  results: Array<{
    file_id: string;
    filename: string;
    content: string;
  }> | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export function useSmeltSubscription(
  supabase: SupabaseClient,
  smeltId: string | null
): SmeltState {
  const subscriptionRef = useRef<SmeltSubscription | null>(null);
  const [state, setState] = useState<SmeltState>({
    status: "pending",
    progress: null,
    results: null,
    error: null,
  });

  useEffect(() => {
    if (!smeltId) return;

    // Subscribe to smelt updates
    subscriptionRef.current = subscribeToSmelt(supabase, smeltId, {
      onProgress: (payload: SmeltProgressEventPayloadDTO) => {
        setState((prev) => ({
          ...prev,
          status: "processing",
          progress: payload.progress,
        }));
      },
      onCompleted: (payload: SmeltCompletedEventPayloadDTO) => {
        setState((prev) => ({
          ...prev,
          status: "completed",
          progress: { percentage: 100, stage: "completed", message: "Complete" },
          results: payload.results,
        }));
      },
      onFailed: (payload: SmeltFailedEventPayloadDTO) => {
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: {
            code: payload.error_code,
            message: payload.error_message,
          },
        }));
      },
      onError: (error) => {
        console.error("Subscription error:", error);
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: {
            code: "connection_lost",
            message: "CONNECTION LOST. TRY AGAIN",
          },
        }));
      },
    });

    // Cleanup on unmount
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [supabase, smeltId]);

  return state;
}
```

---

## 6. Server-Side Broadcasting

### Create file: `src/lib/realtime/broadcast.ts`

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  SmeltProgressEventPayloadDTO,
  SmeltCompletedEventPayloadDTO,
  SmeltFailedEventPayloadDTO,
  SmeltStatus,
  SmeltFileProgressDTO,
  SmeltResultDTO,
  SmeltErrorCode,
} from "@/types";

export class SmeltBroadcaster {
  constructor(private supabase: SupabaseClient) {}

  async broadcastProgress(
    smeltId: string,
    status: SmeltStatus,
    percentage: number,
    message: string,
    files: SmeltFileProgressDTO[]
  ): Promise<void> {
    const channelName = `smelt:${smeltId}`;

    const payload: SmeltProgressEventPayloadDTO = {
      smelt_id: smeltId,
      status,
      progress: {
        percentage,
        stage: status,
        message,
      },
      files,
    };

    await this.supabase.channel(channelName).send({
      type: "broadcast",
      event: "progress",
      payload,
    });
  }

  async broadcastCompleted(
    smeltId: string,
    results: SmeltResultDTO[]
  ): Promise<void> {
    const channelName = `smelt:${smeltId}`;

    const payload: SmeltCompletedEventPayloadDTO = {
      smelt_id: smeltId,
      status: "completed",
      results,
    };

    await this.supabase.channel(channelName).send({
      type: "broadcast",
      event: "completed",
      payload,
    });
  }

  async broadcastFailed(
    smeltId: string,
    errorCode: SmeltErrorCode,
    errorMessage: string
  ): Promise<void> {
    const channelName = `smelt:${smeltId}`;

    const payload: SmeltFailedEventPayloadDTO = {
      smelt_id: smeltId,
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage,
    };

    await this.supabase.channel(channelName).send({
      type: "broadcast",
      event: "failed",
      payload,
    });
  }
}
```

### Processing Service Integration

**File**: `src/lib/services/processing.service.ts` (excerpt)

```typescript
import type { SupabaseClient } from "@/db/supabase.client";
import { SmeltBroadcaster } from "@/lib/realtime/broadcast";
import type { SmeltFileProgressDTO, SmeltResultDTO } from "@/types";

export class ProcessingService {
  private broadcaster: SmeltBroadcaster;

  constructor(private supabase: SupabaseClient) {
    this.broadcaster = new SmeltBroadcaster(supabase);
  }

  async processSmelt(smeltId: string): Promise<void> {
    try {
      // Stage 1: Validating
      await this.updateStatus(smeltId, "validating");
      await this.broadcaster.broadcastProgress(
        smeltId,
        "validating",
        5,
        "Validating files...",
        await this.getFileProgress(smeltId)
      );

      // Validate files...

      // Stage 2: Decoding (if needed)
      await this.updateStatus(smeltId, "decoding");
      await this.broadcaster.broadcastProgress(
        smeltId,
        "decoding",
        15,
        "Decoding audio...",
        await this.getFileProgress(smeltId)
      );

      // Decode audio files...

      // Stage 3: Transcribing
      await this.updateStatus(smeltId, "transcribing");

      // Transcribe with progress updates
      for (let i = 0; i < 100; i += 10) {
        await this.broadcaster.broadcastProgress(
          smeltId,
          "transcribing",
          20 + (i * 0.5), // 20-70%
          "Transcribing audio...",
          await this.getFileProgress(smeltId)
        );
        // Actual transcription work...
      }

      // Stage 4: Synthesizing
      await this.updateStatus(smeltId, "synthesizing");
      await this.broadcaster.broadcastProgress(
        smeltId,
        "synthesizing",
        85,
        "Generating output...",
        await this.getFileProgress(smeltId)
      );

      // Apply prompts and generate output...

      // Stage 5: Completed
      const results = await this.generateResults(smeltId);
      await this.updateStatus(smeltId, "completed");
      await this.broadcaster.broadcastCompleted(smeltId, results);

    } catch (error) {
      // Handle failure
      const errorCode = this.mapErrorCode(error);
      const errorMessage = this.mapErrorMessage(error);

      await this.updateStatus(smeltId, "failed", errorCode, errorMessage);
      await this.broadcaster.broadcastFailed(smeltId, errorCode, errorMessage);
    }
  }

  private async updateStatus(
    smeltId: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (status === "completed" || status === "failed") {
      update.completed_at = new Date().toISOString();
    }
    if (errorCode) update.error_code = errorCode;
    if (errorMessage) update.error_message = errorMessage;

    await this.supabase
      .from("smelts")
      .update(update)
      .eq("id", smeltId);
  }

  private async getFileProgress(smeltId: string): Promise<SmeltFileProgressDTO[]> {
    const { data } = await this.supabase
      .from("smelt_files")
      .select("id, status")
      .eq("smelt_id", smeltId)
      .order("position");

    return (data ?? []).map((f) => ({
      id: f.id,
      status: f.status,
      progress: this.statusToProgress(f.status),
    }));
  }

  private statusToProgress(status: string): number {
    switch (status) {
      case "pending": return 0;
      case "processing": return 50;
      case "completed": return 100;
      case "failed": return 0;
      default: return 0;
    }
  }

  private async generateResults(smeltId: string): Promise<SmeltResultDTO[]> {
    // Fetch files and generate results
    const { data: files } = await this.supabase
      .from("smelt_files")
      .select("id, filename")
      .eq("smelt_id", smeltId)
      .order("position");

    // TODO: Fetch actual processed content
    return (files ?? []).map((f) => ({
      file_id: f.id,
      filename: f.filename,
      content: "# Processed Content\n\nGenerated output...",
    }));
  }

  private mapErrorCode(error: unknown): string {
    // Map error to error code
    return "internal_error";
  }

  private mapErrorMessage(error: unknown): string {
    // Map error to user message
    return "SOMETHING WENT WRONG. TRY AGAIN";
  }
}
```

---

## 7. Security Considerations

1. **Channel Authentication**:
   - Supabase Realtime uses the same JWT as REST API
   - Anonymous smelts use public channel (read-only)
   - Authenticated smelts verify user ownership

2. **Broadcast-Only Pattern**:
   - Server broadcasts to channel
   - Clients only receive, cannot broadcast
   - Prevents injection of fake progress events

3. **Auto-Cleanup**:
   - Subscription auto-unsubscribes on completion/failure
   - Prevents stale connections

4. **Result Delivery**:
   - Results are broadcast to channel
   - Anonymous users receive results via realtime only
   - Authenticated users can also poll GET /api/smelts/:id

---

## 8. Error Handling

### Connection Errors

| Error | Action |
|-------|--------|
| `CHANNEL_ERROR` | Retry subscription or show error to user |
| `TIMED_OUT` | Retry with exponential backoff |
| Connection lost | Attempt to reconnect, poll REST endpoint as fallback |

### Retry Logic

```typescript
export function subscribeWithRetry(
  supabase: SupabaseClient,
  smeltId: string,
  callbacks: SmeltSubscriptionCallbacks,
  maxRetries = 3
): SmeltSubscription {
  let retryCount = 0;

  const wrappedCallbacks: SmeltSubscriptionCallbacks = {
    ...callbacks,
    onError: (error) => {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying subscription (${retryCount}/${maxRetries})...`);
        setTimeout(() => {
          subscription.subscribe();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        callbacks.onError?.(error);
      }
    },
  };

  const subscription = new SmeltSubscription(supabase, smeltId, wrappedCallbacks);
  subscription.subscribe();
  return subscription;
}
```

---

## 9. Performance Considerations

1. **Throttle Progress Updates**:
   - Don't broadcast every millisecond
   - Update every 1-2 seconds or on stage change

2. **Minimal Payload**:
   - Only include necessary fields
   - Don't repeat static data in every event

3. **Connection Pooling**:
   - Supabase client handles connection pooling
   - Single connection per client for all channels

4. **Cleanup on Completion**:
   - Unsubscribe immediately on completion/failure
   - Free up server resources

---

## 10. File Structure

```
src/
├── lib/
│   ├── realtime/
│   │   ├── smelt-subscription.ts    (client-side)
│   │   └── broadcast.ts             (server-side)
│   ├── hooks/
│   │   └── useSmeltSubscription.ts  (React hook)
│   └── services/
│       └── processing.service.ts    (uses broadcaster)
```

---

## 11. Usage Examples

### Client-Side (React Component)

```tsx
import { useSmeltSubscription } from "@/lib/hooks/useSmeltSubscription";
import { supabaseClient } from "@/db/supabase.client";

function SmeltProgress({ smeltId }: { smeltId: string }) {
  const { status, progress, results, error } = useSmeltSubscription(
    supabaseClient,
    smeltId
  );

  if (error) {
    return <div className="error">{error.message}</div>;
  }

  if (status === "completed" && results) {
    return (
      <div>
        <h2>Complete!</h2>
        {results.map((result) => (
          <div key={result.file_id}>
            <h3>{result.filename}</h3>
            <pre>{result.content}</pre>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="progress-bar" style={{ width: `${progress?.percentage ?? 0}%` }} />
      <p>{progress?.message ?? "Starting..."}</p>
    </div>
  );
}
```

### Client-Side (Vanilla JS)

```typescript
import { subscribeToSmelt } from "@/lib/realtime/smelt-subscription";
import { supabaseClient } from "@/db/supabase.client";

const subscription = subscribeToSmelt(supabaseClient, "smelt-uuid", {
  onProgress: (payload) => {
    console.log(`Progress: ${payload.progress.percentage}%`);
    updateProgressBar(payload.progress.percentage);
  },
  onCompleted: (payload) => {
    console.log("Complete!", payload.results);
    displayResults(payload.results);
  },
  onFailed: (payload) => {
    console.error("Failed:", payload.error_message);
    showError(payload.error_message);
  },
});

// Later, to unsubscribe manually:
// subscription.unsubscribe();
```

---

## 12. Testing Checklist

- [ ] Client successfully subscribes to channel
- [ ] Progress events are received in order
- [ ] Percentage increases monotonically
- [ ] Stage transitions are logical (pending → validating → decoding → transcribing → synthesizing)
- [ ] Completion event contains all results
- [ ] Failed event contains error code and message
- [ ] Client auto-unsubscribes on completion
- [ ] Client auto-unsubscribes on failure
- [ ] Connection errors trigger onError callback
- [ ] Retry logic works with exponential backoff
- [ ] React hook updates state correctly
- [ ] Multiple files show individual progress
- [ ] Server broadcasts use correct channel name
- [ ] Anonymous smelts receive events
- [ ] Authenticated smelts receive events
