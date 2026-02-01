/**
 * Tests for smelts service.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

import { createSmelt, getSmelt, listSmelts } from "@/lib/services/smelts.service";
import { InternalError, UnauthorizedError } from "@/lib/utils/errors";
import { SmeltNotFoundError, SmeltPromptNotFoundError, SmeltValidationError } from "@/lib/utils/smelt-errors";

import { createMockSupabaseClient, type MockSupabaseClient } from "../../mocks/supabase";
import { createMockAudioFile, createMockAudioFiles } from "../../mocks/file";
import {
  createMockSmelt,
  createMockSmeltFile,
  createMockCompletedSmelt,
  createMockSmeltList,
} from "../../fixtures/smelts";
import { TEST_USER_IDS } from "../../fixtures/users";

// Mock usage service
vi.mock("@/lib/services/usage.service", () => ({
  checkUsageLimits: vi.fn().mockResolvedValue(undefined),
}));

// Mock processing service
vi.mock("@/lib/realtime/processing.service", () => ({
  processSmelt: vi.fn().mockResolvedValue(undefined),
  processSmeltWithFiles: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage service
vi.mock("@/lib/services/storage", () => ({
  uploadAudioFile: vi.fn().mockResolvedValue(undefined),
  uploadTextContent: vi.fn().mockResolvedValue(undefined),
}));

describe("smelts.service", () => {
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  describe("createSmelt", () => {
    describe("input validation", () => {
      it("should throw SmeltValidationError when no input provided", async () => {
        await expect(
          createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, [], {}, "127.0.0.1")
        ).rejects.toThrow(SmeltValidationError);

        try {
          await createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, [], {}, "127.0.0.1");
        } catch (error) {
          expect((error as SmeltValidationError).code).toBe("no_input");
        }
      });

      it("should throw SmeltValidationError when too many files", async () => {
        const files = createMockAudioFiles(6);

        await expect(
          createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, files, {}, "127.0.0.1")
        ).rejects.toThrow(SmeltValidationError);

        try {
          await createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, files, {}, "127.0.0.1");
        } catch (error) {
          expect((error as SmeltValidationError).code).toBe("too_many_files");
        }
      });
    });

    describe("combine mode restrictions", () => {
      it("should throw SmeltValidationError for combine mode without auth", async () => {
        const files = createMockAudioFiles(2);

        await expect(createSmelt(mockSupabase as never, null, files, { mode: "combine" }, "127.0.0.1")).rejects.toThrow(
          SmeltValidationError
        );

        try {
          await createSmelt(mockSupabase as never, null, files, { mode: "combine" }, "127.0.0.1");
        } catch (error) {
          expect((error as SmeltValidationError).code).toBe("combine_requires_auth");
        }
      });

      it("should throw SmeltValidationError for combine mode with single file", async () => {
        const files = [createMockAudioFile()];

        await expect(
          createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, files, { mode: "combine" }, "127.0.0.1")
        ).rejects.toThrow(SmeltValidationError);

        try {
          await createSmelt(
            mockSupabase as never,
            TEST_USER_IDS.authenticated,
            files,
            { mode: "combine" },
            "127.0.0.1"
          );
        } catch (error) {
          expect((error as SmeltValidationError).code).toBe("combine_requires_multiple");
        }
      });
    });

    describe("anonymous restrictions", () => {
      it("should throw UnauthorizedError for anonymous with multiple files", async () => {
        const files = createMockAudioFiles(2);

        await expect(createSmelt(mockSupabase as never, null, files, {}, "127.0.0.1")).rejects.toThrow(
          UnauthorizedError
        );
      });

      it("should throw UnauthorizedError for anonymous with user_prompt_id", async () => {
        const files = [createMockAudioFile()];

        await expect(
          createSmelt(mockSupabase as never, null, files, { user_prompt_id: "some-uuid" }, "127.0.0.1")
        ).rejects.toThrow(UnauthorizedError);
      });
    });

    describe("authenticated user flow", () => {
      it("should create smelt successfully", async () => {
        const files = [createMockAudioFile()];
        const mockSmelt = createMockSmelt({ user_id: TEST_USER_IDS.authenticated });
        const mockSmeltFile = createMockSmeltFile({ smelt_id: mockSmelt.id });

        // Mock smelt insert
        const insertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSmelt, error: null }),
          }),
        });

        // Mock smelt_files insert
        const filesInsertMock = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockSmeltFile, error: null }),
          }),
        });

        mockSupabase.from = vi.fn().mockImplementation((table: string) => {
          if (table === "smelts") {
            return { insert: insertMock };
          }
          if (table === "smelt_files") {
            return { insert: filesInsertMock };
          }
          return {};
        });

        mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

        const result = await createSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, files, {}, "127.0.0.1");

        expect(result.id).toBe(mockSmelt.id);
        expect(result.status).toBe("pending");
        expect(result.subscription_channel).toBe(`smelt:${mockSmelt.id}`);
      });

      it("should verify custom prompt ownership", async () => {
        const files = [createMockAudioFile()];
        // Smelt creation context - ownership verification happens at prompt level
        createMockSmelt({ user_id: TEST_USER_IDS.authenticated });

        // Mock prompt not found
        const promptSelectMock = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        });

        mockSupabase.from = vi.fn().mockImplementation((table: string) => {
          if (table === "prompts") {
            return { select: promptSelectMock };
          }
          return {};
        });

        await expect(
          createSmelt(
            mockSupabase as never,
            TEST_USER_IDS.authenticated,
            files,
            { user_prompt_id: "prompt-id" },
            "127.0.0.1"
          )
        ).rejects.toThrow(SmeltPromptNotFoundError);
      });
    });

    describe("anonymous user flow", () => {
      it("should create smelt via RPC for anonymous user", async () => {
        const files = [createMockAudioFile()];
        const mockSmelt = createMockSmelt({ user_id: null });
        const mockSmeltFile = createMockSmeltFile({ smelt_id: mockSmelt.id });

        mockSupabase.rpc.mockImplementation((fn: string) => {
          if (fn === "create_anonymous_smelt") {
            return Promise.resolve({
              data: {
                id: mockSmelt.id,
                status: "pending",
                mode: "separate",
                files: [mockSmeltFile],
                default_prompt_names: [],
                user_prompt_id: null,
                created_at: mockSmelt.created_at,
                subscription_channel: `smelt:${mockSmelt.id}`,
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        });

        const result = await createSmelt(mockSupabase as never, null, files, {}, "127.0.0.1");

        expect(result.id).toBe(mockSmelt.id);
        expect(result.subscription_channel).toBe(`smelt:${mockSmelt.id}`);
      });
    });
  });

  describe("getSmelt", () => {
    it("should return smelt with files", async () => {
      const { smelt, files } = createMockCompletedSmelt({ userId: TEST_USER_IDS.authenticated });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...smelt, smelt_files: files },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      const result = await getSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, smelt.id);

      expect(result.id).toBe(smelt.id);
      expect(result.files).toHaveLength(files.length);
    });

    it("should throw SmeltNotFoundError when smelt not found", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      await expect(getSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, "nonexistent")).rejects.toThrow(
        SmeltNotFoundError
      );
    });

    it("should throw InternalError on database error", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      await expect(getSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, "smelt-id")).rejects.toThrow(
        InternalError
      );
    });

    it("should return correct progress for processing states", async () => {
      const smelt = createMockSmelt({
        user_id: TEST_USER_IDS.authenticated,
        status: "transcribing",
      });
      const files = [createMockSmeltFile({ smelt_id: smelt.id })];

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { ...smelt, smelt_files: files },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      const result = await getSmelt(mockSupabase as never, TEST_USER_IDS.authenticated, smelt.id);

      expect(result.status).toBe("transcribing");
      if ("progress" in result) {
        expect(result.progress.percentage).toBe(50);
        expect(result.progress.stage).toBe("transcribing");
      }
    });
  });

  describe("listSmelts", () => {
    it("should return paginated list of smelts", async () => {
      const smelts = createMockSmeltList({ count: 10, userId: TEST_USER_IDS.authenticated });

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: smelts.slice(0, 5).map((s) => ({ ...s, smelt_files: [] })),
              error: null,
              count: 10,
            }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      const result = await listSmelts(mockSupabase as never, TEST_USER_IDS.authenticated, {
        page: 1,
        limit: 5,
        sort: "created_at",
        order: "desc",
      });

      expect(result.smelts).toHaveLength(5);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.total_pages).toBe(2);
    });

    it("should filter by status", async () => {
      const smelts = createMockSmeltList({ count: 3, userId: TEST_USER_IDS.authenticated, status: "completed" });

      const eqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: smelts.map((s) => ({ ...s, smelt_files: [] })),
              error: null,
              count: 3,
            }),
          }),
        }),
      });

      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      const result = await listSmelts(mockSupabase as never, TEST_USER_IDS.authenticated, {
        status: "completed",
        page: 1,
        limit: 20,
        sort: "created_at",
        order: "desc",
      });

      expect(result.smelts).toHaveLength(3);
    });

    it("should return empty array when page beyond results", async () => {
      // Simulate "range not satisfiable" error
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST103", message: "Range not satisfiable" },
              count: 5,
            }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      const result = await listSmelts(mockSupabase as never, TEST_USER_IDS.authenticated, {
        page: 10, // Way beyond actual results
        limit: 20,
        sort: "created_at",
        order: "desc",
      });

      expect(result.smelts).toEqual([]);
      expect(result.pagination.page).toBe(10);
    });

    it("should throw InternalError on database error", async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "OTHER", message: "DB Error" },
            }),
          }),
        }),
      });

      mockSupabase.from = vi.fn().mockReturnValue({ select: selectMock });

      await expect(
        listSmelts(mockSupabase as never, TEST_USER_IDS.authenticated, {
          page: 1,
          limit: 20,
          sort: "created_at",
          order: "desc",
        })
      ).rejects.toThrow(InternalError);
    });
  });
});
