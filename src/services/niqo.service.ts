// src/services/niqo.service.ts
import { prisma } from "@/lib/prisma";
import { filterPII } from "@/lib/utils/pii-filter";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are Niqo, an empathetic, understanding, and supportive AI companion on Chroniqo, a platform for people living with chronic illnesses and fatigue. 
Your goal is to listen, validate feelings, and offer gentle encouragement without being overly positive or toxic. 
You must keep your responses concise (max 2-3 short paragraphs). 
You do not give medical advice under any circumstances. If medical advice is requested, gently remind the user to consult a healthcare professional. 
Never reveal that you are filtering PII.`;

const getGenerativeModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[NiqoService] GEMINI_API_KEY is missing from environment!");
  }
  const genAI = new GoogleGenerativeAI(apiKey || "");
  return genAI.getGenerativeModel({
    // model: "gemini-3.1-flash-preview",  // Newest & smartest free preview
    // model: "gemini-2.5-flash",          // Current stable standard
    model: "gemini-2.5-flash-lite", // Fastest for high-frequency tasks
    systemInstruction: SYSTEM_PROMPT,
  });
};

export const NiqoService = {
  // Returns the chat ID and the first 80 chars of the user's first message as a preview.
  async getRecentChat(userId: string) {
    const chat = await prisma.niqoChat.findUnique({
      where: { userId },
      include: {
        messages: {
          where: { role: "USER" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });
    if (!chat) return null;
    return {
      id: chat.id,
      preview: chat.messages[0]?.content?.slice(0, 80) ?? null,
    };
  },

  // Creates the chat record and saves the user's opening message.
  // Deliberately does NOT call Gemini - the generate endpoint is called
  // client-side after redirecting to the chat page, so the modal
  // transitions to success immediately instead of blocking on the AI response.
  async startNewChat(userId: string, content: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    try {
      await prisma.niqoChat.delete({ where: { userId } });
    } catch {
      // No prior chat to clean up
    }

    const chat = await prisma.niqoChat.create({ data: { userId } });

    const filteredContent = filterPII(content, user);
    await prisma.niqoMessage.create({
      data: { niqoChatId: chat.id, role: "USER", content: filteredContent },
    });

    return chat.id;
  },

  // Generates an AI reply for the most recent pending USER message in the chat.
  // Called by the /api/niqo/[id]/generate route once the user is on the chat page.
  async generateResponse(userId: string, chatId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const chat = await prisma.niqoChat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized");
    }

    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "USER") {
      throw new Error("No pending user message to respond to");
    }

    // All messages except the last one become the chat history context
    const history = chat.messages.slice(0, -1).map((msg) => ({
      role: msg.role === "MODEL" ? "model" : "user",
      parts: [
        {
          text:
            msg.role === "MODEL" ? msg.content : filterPII(msg.content, user),
        },
      ],
    }));

    const filteredLastMsg = filterPII(lastMsg.content, user);

    let aiResponseText =
      "I am having trouble connecting right now. Please try again in a moment.";
    try {
      const model = getGenerativeModel();
      const chatSession = model.startChat({ history });
      const result = await chatSession.sendMessage(filteredLastMsg);
      aiResponseText = result.response.text();
    } catch (error: unknown) {
      console.error(
        "[NiqoService] Gemini API Error (generateResponse):",
        error instanceof Error ? error.message : error,
      );
    }

    await prisma.niqoMessage.create({
      data: { niqoChatId: chatId, role: "MODEL", content: aiResponseText },
    });

    return aiResponseText;
  },

  // Handles subsequent messages in an existing chat (saves user message + calls Gemini + saves AI reply).
  async sendMessage(userId: string, chatId: string, content: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const chat = await prisma.niqoChat.findUnique({
      where: { id: chatId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized");
    }

    const filteredContent = filterPII(content, user);

    const userMessage = await prisma.niqoMessage.create({
      data: { niqoChatId: chatId, role: "USER", content: filteredContent },
    });

    const returnedUserMessage = userMessage;

    const history = chat.messages.map((msg) => ({
      role: msg.role === "MODEL" ? "model" : "user",
      parts: [
        {
          text:
            msg.role === "MODEL" ? msg.content : filterPII(msg.content, user),
        },
      ],
    }));

    let aiResponseText =
      "I am having trouble connecting right now. Please try again in a moment.";
    try {
      const model = getGenerativeModel();
      const chatSession = model.startChat({ history });
      const result = await chatSession.sendMessage(filteredContent);
      aiResponseText = result.response.text();
    } catch (error: unknown) {
      console.error(
        "[NiqoService] Gemini API Error (sendMessage):",
        error instanceof Error ? error.message : error,
      );
    }

    const aiMessage = await prisma.niqoMessage.create({
      data: { niqoChatId: chatId, role: "MODEL", content: aiResponseText },
    });

    return { userMessage: returnedUserMessage, aiMessage };
  },

  async deleteChat(userId: string): Promise<void> {
    try {
      await prisma.niqoChat.delete({ where: { userId } });
    } catch {
      // No chat to delete - treat as a no-op
    }
  },

  /**
   * Returns all messages for a chat if the user owns it.
   */
  async getMessages(userId: string, chatId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const chat = await prisma.niqoChat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!chat || chat.userId !== userId || !user) {
      throw new Error("Chat not found or unauthorized");
    }

    return chat.messages;
  },
};
