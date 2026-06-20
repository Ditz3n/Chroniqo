// src/lib/anonymous-animals.ts
// Dummy implementation for anonymous animal utilities

export function formatAnonymousDisplayName(animalName: string, suffix: string) {
  return `${animalName} ${suffix}`;
}

export function formatAnonymousUsername(animalName: string, suffix: string) {
  return `${animalName.toLowerCase()}_${suffix}`;
}

export function pickRandomAnonymousIdentity() {
  // Dummy data for demonstration
  const animals = [
    { animalName: "Fox", animalEmoji: "🦊", bgColor: "#FFA500" },
    { animalName: "Panda", animalEmoji: "🐼", bgColor: "#222" },
    { animalName: "Tiger", animalEmoji: "🐯", bgColor: "#FFB300" },
    { animalName: "Koala", animalEmoji: "🐨", bgColor: "#B0C4DE" },
  ];
  const suffixes = ["One", "Two", "Three", "Four"];
  const pick = animals[Math.floor(Math.random() * animals.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return { ...pick, suffix };
}
