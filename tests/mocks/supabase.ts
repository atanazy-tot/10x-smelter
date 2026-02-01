/**
 * Supabase client mock factory for testing.
 * Provides chainable query builder mocks with configurable responses.
 */
import { vi } from "vitest";

import type { Database } from "@/db/database.types";

type TableName = keyof Database["public"]["Tables"];

/**
 * Mock response type for query builder methods
 */
interface MockQueryResponse<T = unknown> {
  data: T | null;
  error: { message: string; code: string } | null;
  count?: number;
}

/**
 * Creates a chainable mock query builder with configurable response.
 */
export function createMockQueryBuilder<T = unknown>(response: MockQueryResponse<T> = { data: null, error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: vi.fn((resolve) => resolve(response)),
  };

  // Make all methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (!["single", "maybeSingle", "then"].includes(key)) {
      (builder as Record<string, unknown>)[key] = vi.fn().mockReturnValue(builder);
    }
  });

  return builder;
}

/**
 * Creates mock storage client
 */
export function createMockStorage() {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test/file.mp3" }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.supabase.co/storage/test" } }),
    }),
  };
}

/**
 * Creates mock auth client
 */
export function createMockAuth(options?: {
  user?: { id: string; email: string; created_at: string; email_confirmed_at?: string };
  session?: { access_token: string; refresh_token: string };
  error?: { message: string; code: string };
}) {
  const mockUser = options?.user ?? null;
  const mockSession = options?.session ?? null;
  const mockError = options?.error ?? null;

  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: mockError,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockSession ? { ...mockSession, user: mockUser } : null },
      error: mockError,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: mockError,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: mockError,
    }),
    signOut: vi.fn().mockResolvedValue({
      error: mockError,
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({
      data: {},
      error: mockError,
    }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: mockError,
    }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: mockError,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: mockError,
    }),
    resend: vi.fn().mockResolvedValue({
      data: {},
      error: mockError,
    }),
  };
}

/**
 * Table-specific response configurations
 */
interface TableResponses {
  user_profiles?: MockQueryResponse;
  smelts?: MockQueryResponse;
  smelt_files?: MockQueryResponse;
  prompts?: MockQueryResponse;
  prompt_sections?: MockQueryResponse;
  user_api_keys?: MockQueryResponse;
  anonymous_usage?: MockQueryResponse;
}

/**
 * Creates a fully mocked Supabase client with configurable table responses.
 */
export function createMockSupabaseClient(options?: {
  auth?: Parameters<typeof createMockAuth>[0];
  tableResponses?: TableResponses;
  rpcResponses?: Record<string, MockQueryResponse>;
}) {
  const tableResponses = options?.tableResponses ?? {};
  const rpcResponses = options?.rpcResponses ?? {};

  const fromMock = vi.fn((table: TableName) => {
    const response = tableResponses[table] ?? { data: null, error: null };
    return createMockQueryBuilder(response);
  });

  const rpcMock = vi.fn((fn: string, params?: Record<string, unknown>) => {
    const response = rpcResponses[fn] ?? { data: null, error: null };
    // Return a promise-like object that also has common builder methods
    const builder = {
      ...createMockQueryBuilder(response),
      then: (resolve: (value: MockQueryResponse) => void) => resolve(response),
    };
    // For immediate resolution
    void params;
    return Promise.resolve(response).then(() => builder);
  });

  // Create a simpler RPC mock that just returns the response directly
  const simpleRpcMock = vi.fn((fn: string, _params?: Record<string, unknown>) => {
    const response = rpcResponses[fn] ?? { data: null, error: null };
    return Promise.resolve(response);
  });

  return {
    auth: createMockAuth(options?.auth),
    storage: createMockStorage(),
    from: fromMock,
    rpc: simpleRpcMock,
    // Keep reference to the underlying mocks for assertions
    _mocks: {
      from: fromMock,
      rpc: rpcMock,
    },
  };
}

/**
 * Type-safe mock client type
 */
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

/**
 * Helper to configure mock query builder response for a specific flow
 */
export function mockTableQuery<T>(
  client: MockSupabaseClient,
  table: TableName,
  response: MockQueryResponse<T>
): ReturnType<typeof createMockQueryBuilder<T>> {
  const builder = createMockQueryBuilder<T>(response);
  (client.from as ReturnType<typeof vi.fn>).mockImplementation((t: TableName) => {
    if (t === table) return builder;
    return createMockQueryBuilder({ data: null, error: null });
  });
  return builder;
}
