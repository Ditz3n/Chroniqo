// src/lib/message-dummy-data.ts
import { Message } from "@/types/app-types";

// Midlertidig mock-data for at sikre at layoutet kan kompilere og testes
export const MOCK_CONVERSATIONS = [
  {
    id: "1",
    username: "Jane Doe",
    active: true,
    verified: true,
    lastMessage: "Tak for snakken i dag!",
    timeAgo: "2m",
    unread: true,
  },
  {
    id: "2",
    username: "Support Gruppe",
    active: false,
    verified: false,
    lastMessage: "Nogen der er vågne?",
    timeAgo: "1t",
    unread: false,
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "them",
    senderName: "Jane Doe",
    text: "Hej! Hvordan har du det i dag?",
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "m2",
    sender: "me",
    senderName: "Mig",
    text: "Det går okay, har lidt færre smerter i dag heldigvis. Hvad med dig?",
    timestamp: new Date(Date.now() - 3500000),
    reactions: [{ emoji: "❤️", users: [{ id: "u1", name: "Jane Doe" }] }],
  },
  {
    id: "m3",
    sender: "them",
    senderName: "Jane Doe",
    text: "Dejligt at høre! Jeg kæmper lidt med energien, men tager den med ro.",
    timestamp: new Date(Date.now() - 3400000),
    replyTo:
      "Det går okay, har lidt færre smerter i dag heldigvis. Hvad med dig?",
  },
];
