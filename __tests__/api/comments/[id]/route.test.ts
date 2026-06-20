// __tests__/api/comments/[id]/route.test.ts
import { DELETE, GET, PATCH } from "@/app/api/comments/[id]/route";
import { auth } from "@/auth";
import {
  getIsolatedCommentThread,
  softDeleteComment,
  updateComment,
} from "@/services/comment.service";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/services/comment.service");

const mockAuth = auth as jest.Mock;

const mockUpdateComment = updateComment as jest.MockedFunction<
  typeof updateComment
>;
const mockSoftDeleteComment = softDeleteComment as jest.MockedFunction<
  typeof softDeleteComment
>;
const mockGetIsolatedCommentThread =
  getIsolatedCommentThread as jest.MockedFunction<
    typeof getIsolatedCommentThread
  >;

// Wraps the dynamic param in a resolved promise, matching Next.js App Router signature
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockSession = { user: { id: "user-1", role: "USER" } } as never;

afterEach(() => jest.clearAllMocks());

// PATCH - edit comment

describe("PATCH /api/comments/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "Edited" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when content is an empty string (Zod validation)", async () => {
    mockAuth.mockResolvedValue(mockSession);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when content exceeds 3000 characters (Zod validation)", async () => {
    mockAuth.mockResolvedValue(mockSession);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "a".repeat(3001) }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with the updated comment on success", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockUpdateComment.mockResolvedValue({
      id: "c-1",
      content: "Edited",
      editedAt: new Date(),
    } as never);

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "Edited" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.comment.content).toBe("Edited");
    expect(mockUpdateComment).toHaveBeenCalledWith("user-1", "c-1", {
      content: "Edited",
    });
  });

  it("returns 403 when service throws Unauthorized", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockUpdateComment.mockRejectedValue(new Error("Unauthorized"));

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "Edited" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when the comment does not exist", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockUpdateComment.mockRejectedValue(new Error("Comment not found"));

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "Edited" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(404);
  });

  it("returns 500 on unexpected service errors", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockUpdateComment.mockRejectedValue(new Error("Database connection lost"));

    const req = new Request("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ content: "Edited" }),
    });

    const res = await PATCH(req, makeParams("c-1"));
    expect(res.status).toBe(500);
  });
});

// DELETE - soft-delete comment

describe("DELETE /api/comments/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      makeParams("c-1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 on successful deletion", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockSoftDeleteComment.mockResolvedValue({ id: "c-1" } as never);

    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      makeParams("c-1"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 when service throws Unauthorized", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockSoftDeleteComment.mockRejectedValue(new Error("Unauthorized"));

    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      makeParams("c-1"),
    );
    expect(res.status).toBe(403);
  });
});

// GET - isolated comment thread

describe("GET /api/comments/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as never);

    const res = await GET(new Request("http://localhost"), makeParams("c-1"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with the comment thread on success", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockGetIsolatedCommentThread.mockResolvedValue({ id: "c-1" } as never);

    const res = await GET(new Request("http://localhost"), makeParams("c-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.commentThread.id).toBe("c-1");
  });

  it("returns 404 when the comment does not exist", async () => {
    mockAuth.mockResolvedValue(mockSession);
    mockGetIsolatedCommentThread.mockRejectedValue(
      new Error("Comment not found"),
    );

    const res = await GET(new Request("http://localhost"), makeParams("c-1"));
    expect(res.status).toBe(404);
  });
});
