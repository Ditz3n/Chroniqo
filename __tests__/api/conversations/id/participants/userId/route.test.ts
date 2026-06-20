// __tests__/api/conversations/id/participants/userId/route.test.ts
import {
  DELETE,
  PUT,
} from "@/app/api/conversations/[id]/participants/[userId]/route";
import { auth } from "@/auth";
import {
  removeParticipant,
  updateParticipantNickname,
} from "@/services/chat.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/chat.service", () => ({
  updateParticipantNickname: jest.fn(),
  removeParticipant: jest.fn(),
}));

describe("PUT & DELETE /api/conversations/[id]/participants/[userId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Nick" }),
        },
      );

      const res = await PUT(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });

      expect(res.status).toBe(401);
      expect(updateParticipantNickname).not.toHaveBeenCalled();
    });

    it("should return 400 when payload validation fails", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "x".repeat(31) }),
        },
      );

      const res = await PUT(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(Array.isArray(data.details)).toBe(true);
      expect(updateParticipantNickname).not.toHaveBeenCalled();
    });

    it("should return 200 and updated participant on success", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (updateParticipantNickname as jest.Mock).mockResolvedValue({
        userId: "user-2",
        nickname: "Nick",
      });

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Nick" }),
        },
      );

      const res = await PUT(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.participant).toEqual({ userId: "user-2", nickname: "Nick" });
      expect(updateParticipantNickname).toHaveBeenCalledWith(
        "user-1",
        "conv-1",
        "user-2",
        { nickname: "Nick" },
      );
    });

    it("should return 400 when service throws", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (updateParticipantNickname as jest.Mock).mockRejectedValue(
        new Error("Participant not found"),
      );

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "PUT",
          body: JSON.stringify({ nickname: "Nick" }),
        },
      );

      const res = await PUT(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Participant not found");
    });
  });

  describe("DELETE", () => {
    it("should return 401 if unauthenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "DELETE",
        },
      );

      const res = await DELETE(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });

      expect(res.status).toBe(401);
      expect(removeParticipant).not.toHaveBeenCalled();
    });

    it("should return 200 and success on removal", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (removeParticipant as jest.Mock).mockResolvedValue({ success: true });

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "DELETE",
        },
      );

      const res = await DELETE(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(removeParticipant).toHaveBeenCalledWith(
        "user-1",
        "conv-1",
        "user-2",
      );
    });

    it("should return 400 when removeParticipant throws", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
      (removeParticipant as jest.Mock).mockRejectedValue(
        new Error("Cannot remove users from a 1:1 conversation"),
      );

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-1/participants/user-2",
        {
          method: "DELETE",
        },
      );

      const res = await DELETE(req, {
        params: Promise.resolve({ id: "conv-1", userId: "user-2" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Cannot remove users from a 1:1 conversation");
    });
  });
});
