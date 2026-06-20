// src/services/dummy/data/posts.ts
export const EXHAUSTIVE_MARKDOWN = `# Welcome to the exhaustive formatting showcase
This post demonstrates all supported markdown features including **bold**, *italic*, ~~strikethrough~~, and even superscript like this: E=mc^2^.

You can also include links such as this [link to Chroniqo](https://chroniqo.com) directly inside text.

# Headings
Below are all heading levels to verify spacing, hierarchy, and styling:

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

# Text Formatting
These examples show how different inline styles render inside normal paragraphs.

## Bold
**This text is bold** and is often used to highlight important information.

## Italic
*This text is italic* and is useful for subtle emphasis.

## Strikethrough
~~This text is crossed out~~ which is helpful when editing or correcting content.

## Superscript
You can also write formulas using superscript like: E=mc^2^

# Lists
Lists are useful for structuring information clearly.

## Unordered List
* Managing fatigue
* Tracking pain levels
* Finding support

## Ordered List
1. Wake up
2. Check daily status
3. Connect with others

# Quotes and Spoilers
These elements help with conversations and hiding sensitive content.

## Quotes
> This is a blockquote. It represents a deep thought or a reply to someone else's idea.

## Spoilers
And here is a spoiler to protect sensitive content: >!You found the hidden secret!!<

# Code
Markdown also supports inline code and full code blocks.

## Inline Code
You can write \`inline code\` for quick references inside a sentence.

## Code Block
\`\`\`
const isTired = true;
if (isTired) {
  rest();
}
\`\`\`

# Tables
Tables are useful for structured data like tracking symptoms:
| Symptom | Severity | Notes |
| :--- | :---: | ---: |
| Headache | High | Needed medication |
| Fatigue | Medium | Rested for 2 hours |
`;

export const DUMMY_POST_DEFINITIONS: Array<{
  title: string;
  type: string;
  authorIndex: number | "initiator";
  communityIndex: number | null;
  content?: string;
  isAnonymous?: boolean;
  metadata?: Record<string, unknown>;
}> = [
  {
    title: "Comprehensive Formatting Test",
    type: "text",
    authorIndex: "initiator",
    communityIndex: null,
    content: EXHAUSTIVE_MARKDOWN,
  },
  {
    title: "My health journey so far",
    type: "text",
    authorIndex: "initiator",
    communityIndex: null,
    content:
      "It's been a long road, but tracking my daily status and talking to people here has really helped me stay grounded. Thanks everyone! ❤️",
  },
  {
    title: "MRI results and next steps",
    type: "text",
    authorIndex: "initiator",
    communityIndex: 0, // HerniatedDiscs
    content:
      "Just got my MRI results: herniated disc at L4-L5. Anyone else been through this? What helped you most?",
  },
  {
    title: "Physical therapy progress",
    type: "text",
    authorIndex: 1,
    communityIndex: 0,
    content:
      "Physical therapy has been tough but I'm seeing slow progress. How long did it take for you to notice improvement?",
  },
  {
    title: "Surgery or conservative treatment?",
    type: "poll",
    authorIndex: 2,
    communityIndex: 0,
    isAnonymous: true,
    metadata: {
      closesIn: "48h",
      totalVotes: 8,
      options: [
        { id: "opt1", text: "Surgery", votes: 3 },
        { id: "opt2", text: "Conservative", votes: 5 },
      ],
    },
  },
  {
    title: "Managing fatigue with pacing",
    type: "text",
    authorIndex: 3,
    communityIndex: 1, // ChronicFatigue
    content:
      "I've found that pacing myself throughout the day helps reduce crashes. Anyone else use pacing strategies?",
  },
  {
    title: "Supplements for energy?",
    type: "text",
    authorIndex: 4,
    communityIndex: 1,
    isAnonymous: true,
    content: "Has anyone tried CoQ10 or B12 for chronic fatigue? Did it help?",
  },
  {
    title: "Coping with anxiety at work",
    type: "text",
    authorIndex: 5,
    communityIndex: 2, // MentalWellness
    content:
      "Work stress triggers my anxiety. What are your best coping mechanisms for the office?",
  },
  {
    title: "Favorite mental health podcasts?",
    type: "link",
    authorIndex: 6,
    communityIndex: 2,
    metadata: {
      url: "https://www.mentalhealth.org.uk/podcasts-and-videos",
      siteName: "Mental Health Foundation",
      metaTitle: "Mental Health Podcasts",
      metaDescription: "A curated list of podcasts for mental health support.",
      metaImage: "https://picsum.photos/seed/podcast1/600/300",
    },
  },
  {
    title: "Pain tracking apps?",
    type: "text",
    authorIndex: 7,
    communityIndex: 3, // PainSupport
    content:
      "Has anyone found a good app for tracking pain levels? Recommendations?",
  },
  {
    title: "Best stretches for chronic pain",
    type: "youtube",
    authorIndex: 8,
    communityIndex: 3,
    metadata: { videoId: "2VuLBYrgG94" },
  },
  {
    title: "Managing blood sugar swings",
    type: "text",
    authorIndex: 9,
    communityIndex: 4, // DiabetesCare
    content: "What snacks do you keep on hand for lows?",
  },
  {
    title: "How to use a CGM",
    type: "video",
    authorIndex: 1,
    communityIndex: 4,
    metadata: {
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      thumbnailUrl: "https://picsum.photos/seed/diabetes1/800/600",
      duration: 10,
    },
  },
  {
    title: "Dealing with pollen season",
    type: "text",
    authorIndex: 2,
    communityIndex: 5, // AsthmaLife
    content:
      "Anyone else struggling with allergies this week? Tips for managing symptoms?",
  },
  {
    title: "Best inhalers for exercise-induced asthma?",
    type: "poll",
    authorIndex: 3,
    communityIndex: 5,
    isAnonymous: true,
    metadata: {
      closesIn: "24h",
      totalVotes: 5,
      options: [
        { id: "opt1", text: "Albuterol", votes: 2 },
        { id: "opt2", text: "Levalbuterol", votes: 1 },
        { id: "opt3", text: "Other", votes: 2 },
      ],
    },
  },
  {
    title: "Coping with flare-ups",
    type: "text",
    authorIndex: 4,
    communityIndex: 6, // FibroFriends
    content: "What helps you during a fibro flare? Any tips for pain relief?",
  },
  {
    title: "Favorite fibro memes",
    type: "image",
    authorIndex: 5,
    communityIndex: 6,
    metadata: {
      images: ["https://picsum.photos/seed/fibro1/800/600"],
    },
  },
  {
    title: "Joint pain relief tips",
    type: "text",
    authorIndex: 6,
    communityIndex: 7, // ArthritisAid
    content: "Share your best home remedies for arthritis pain.",
  },
  {
    title: "Best gloves for arthritis",
    type: "link",
    authorIndex: 7,
    communityIndex: 7,
    metadata: {
      url: "https://www.arthritis.org/health-wellness/healthy-living/managing-pain/joint-protection/best-gloves-for-arthritis",
      siteName: "Arthritis Foundation",
      metaTitle: "Best Gloves for Arthritis",
      metaDescription: "A review of the best gloves for arthritis relief.",
      metaImage: "https://picsum.photos/seed/gloves1/600/300",
    },
  },
  {
    title: "Brain fog strategies",
    type: "text",
    authorIndex: 8,
    communityIndex: 8, // LongCovid
    isAnonymous: true,
    content: "How do you manage brain fog on bad days?",
  },
  {
    title: "Long COVID research roundup",
    type: "link",
    authorIndex: 9,
    communityIndex: 8,
    metadata: {
      url: "https://www.nature.com/articles/d41586-022-03614-6",
      siteName: "Nature",
      metaTitle: "Latest Long COVID Research",
      metaDescription: "A summary of the latest research on long COVID.",
      metaImage: "https://picsum.photos/seed/longcovid1/600/300",
    },
  },
  {
    title: "Blood pressure tracking apps",
    type: "text",
    authorIndex: 2,
    communityIndex: 9, // HypertensionHub
    content: "Any recommendations for easy-to-use tracking apps?",
  },
  {
    title: "Salt substitutes: yay or nay?",
    type: "poll",
    authorIndex: 3,
    communityIndex: 9,
    isAnonymous: true,
    metadata: {
      closesIn: "24h",
      totalVotes: 6,
      options: [
        { id: "opt1", text: "Yay", votes: 4 },
        { id: "opt2", text: "Nay", votes: 2 },
      ],
    },
  },
  {
    title: "Levothyroxine side effects",
    type: "text",
    authorIndex: 4,
    communityIndex: 10, // ThyroidTalk
    content: "Anyone else have trouble adjusting to thyroid meds?",
  },
  {
    title: "Best thyroid-friendly recipes",
    type: "link",
    authorIndex: 5,
    communityIndex: 10,
    metadata: {
      url: "https://example.com/thyroidrecipes",
      siteName: "Thyroid Kitchen",
      metaTitle: "Delicious Thyroid-Friendly Recipes",
      metaDescription: "Easy and healthy recipes for thyroid health.",
      metaImage: "https://picsum.photos/seed/thyroid1/600/300",
    },
  },
];
