// src/services/dummy/data/chat-scripts.ts

export const COMMUNITY_CHAT_SCRIPTS: Record<
  string,
  { content: string; anon: boolean }[]
> = {
  HerniatedDiscs: [
    {
      content: "Hey everyone, welcome! How is everyone's back doing today?",
      anon: false,
    },
    {
      content:
        "Pretty stiff this morning. Did my morning stretches but it's not helping much yet.",
      anon: false,
    },
    {
      content:
        "I'm having a terrible flare-up. I didn't want to use my normal alias, but I can barely walk right now. I feel so defeated.",
      anon: true,
    },
    {
      content:
        "Oh no! Have you tried alternating ice and heat? That sometimes takes the edge off for me.",
      anon: false,
    },
    {
      content:
        "Just jumping in fully anonymously to add that a TENS machine saved me during my last bad flare-up.",
      anon: true,
    },
    {
      content:
        "Thanks for the support. I'm going to try the ice/heat method now.",
      anon: true,
    },
  ],
  ChronicFatigue: [
    {
      content:
        "Did anyone else completely crash after trying to do just one chore yesterday?",
      anon: false,
    },
    {
      content:
        "Yes! I literally just folded laundry and had to sleep for 3 hours.",
      anon: false,
    },
    {
      content:
        "I pushed myself too hard at work and now I'm paying the price. I feel so guilty for not being able to keep up.",
      anon: true,
    },
    {
      content:
        "Please don't feel guilty. Pacing is incredibly hard to master. We've all been there.",
      anon: false,
    },
    {
      content:
        "Agreed. Sometimes I just have to accept that 'zero percent days' exist and forgive myself.",
      anon: true,
    },
  ],
  MentalWellness: [
    { content: "Checking in. How is everyone's headspace today?", anon: false },
    {
      content:
        "A bit overwhelmed. The news has been incredibly triggering lately.",
      anon: false,
    },
    {
      content:
        "I'm having a really dark day. I don't even have the energy to explain it, just needed to put it out there safely.",
      anon: true,
    },
    {
      content:
        "I hear you, and you are totally valid. You don't need to explain anything to us. Just breathe.",
      anon: false,
    },
    {
      content: "Thank you. Just reading that helps ground me a bit.",
      anon: true,
    },
    {
      content:
        "Does anyone use the 5-4-3-2-1 grounding technique? It usually helps pull me out of a spiral.",
      anon: false,
    },
  ],
  PainSupport: [
    {
      content:
        "Pain scale is sitting at a solid 8 today. Nothing is touching it.",
      anon: false,
    },
    {
      content:
        "I'm so sorry. Is it weather related? The barometric pressure dropped drastically here.",
      anon: false,
    },
    {
      content:
        "Honestly, my pain meds aren't working anymore and I'm terrified to tell my doctor in case they think I'm drug-seeking.",
      anon: true,
    },
    {
      content:
        "That is such a common fear in the chronic pain community. You aren't alone in feeling that way.",
      anon: false,
    },
    {
      content:
        "I had to switch doctors three times before someone finally listened to me without judgment. Keep advocating for yourself!",
      anon: true,
    },
  ],
  DiabetesCare: [
    {
      content: "My CGM alarm kept going off all night. I am exhausted.",
      anon: false,
    },
    {
      content:
        "Compression lows? I swear I can't sleep on my left side anymore.",
      anon: false,
    },
    {
      content:
        "I completely messed up my carb counting at dinner and my sugar has been 250+ for hours. So frustrated with myself.",
      anon: true,
    },
    {
      content:
        "It happens to the best of us! Diabetes is unpredictable. Drink some water and take a walk if you can.",
      anon: false,
    },
    {
      content:
        "I once rage-bolused after a bad high and ended up crashing hard. Be careful correcting!",
      anon: true,
    },
  ],
  AsthmaLife: [
    { content: "The pollen index today is absolutely brutal.", anon: false },
    {
      content: "My rescue inhaler has been working overtime since I woke up.",
      anon: false,
    },
    {
      content:
        "I had an asthma attack at the gym and felt so embarrassed using my inhaler in front of everyone.",
      anon: true,
    },
    {
      content:
        "Never be embarrassed about breathing! People who judge don't understand what it feels like to suffocate.",
      anon: false,
    },
    {
      content:
        "Exactly. Anyone have recommendations for a good HEPA air purifier for the bedroom?",
      anon: true,
    },
  ],
  FibroFriends: [
    {
      content:
        "The brain fog is so intense today I put the milk in the pantry.",
      anon: false,
    },
    {
      content:
        "Haha! I once spent 10 minutes looking for my phone while using the flashlight on my phone to look for it.",
      anon: false,
    },
    {
      content:
        "I had to call out of work again because the body aches are so bad. I'm scared I'm going to get fired.",
      anon: true,
    },
    {
      content:
        "Document everything with HR if you can. Fibro is recognized as a disability in many places.",
      anon: false,
    },
    {
      content:
        "It's so isolating when you look 'fine' on the outside but feel like you've been hit by a truck.",
      anon: true,
    },
  ],
  ArthritisAid: [
    {
      content: "Woke up with hands so stiff I couldn't even turn the doorknob.",
      anon: false,
    },
    {
      content:
        "Warm water soaks first thing in the morning usually help me get some mobility back.",
      anon: false,
    },
    {
      content:
        "Does anyone else feel like a burden to their partner when they need help opening jars and bottles?",
      anon: true,
    },
    {
      content:
        "Yes, all the time. But my partner constantly reminds me they'd rather help than watch me be in pain.",
      anon: false,
    },
    {
      content:
        "I highly recommend getting one of those under-cabinet jar openers. Gave me a lot of independence back!",
      anon: true,
    },
  ],
  LongCovid: [
    {
      content:
        "Has anyone noticed their resting heart rate randomly spiking to 120+?",
      anon: false,
    },
    {
      content:
        "Yes! POTS-like symptoms are super common. Are you getting enough electrolytes?",
      anon: false,
    },
    {
      content:
        "I'm 14 months in and I feel like I'm never going to be the same person I was before getting sick.",
      anon: true,
    },
    {
      content:
        "Grieving your past self is a huge part of this journey. It's okay to mourn what you've lost while adjusting to the new normal.",
      anon: false,
    },
    {
      content:
        "It helps to know I'm not the only one experiencing this intense fatigue. Thank you all.",
      anon: true,
    },
  ],
  HypertensionHub: [
    {
      content: "Just checked my BP, it's finally in normal range! 118/75!",
      anon: false,
    },
    {
      content:
        "That's amazing news! What changes made the biggest difference for you?",
      anon: false,
    },
    {
      content:
        "I've been secretly struggling to quit smoking. It's so hard when stressed, but I know it's ruining my blood pressure.",
      anon: true,
    },
    {
      content:
        "Quitting is a marathon, not a sprint. Even cutting back is progress. You've got this.",
      anon: false,
    },
    {
      content:
        "Has anyone found good salt-free seasonings that actually taste good?",
      anon: true,
    },
  ],
  ThyroidTalk: [
    {
      content: "Just got my dosage adjusted again. Hate this waiting period.",
      anon: false,
    },
    {
      content:
        "The 6-week wait to see if the new dose works is absolute torture.",
      anon: false,
    },
    {
      content:
        "I gained 15 lbs this month despite changing nothing. The body image issues are hitting me really hard right now.",
      anon: true,
    },
    {
      content:
        "Thyroid weight gain is incredibly stubborn. Please give yourself some grace, it's physiological, not a lack of willpower.",
      anon: false,
    },
    {
      content:
        "Anyone else deal with extreme cold sensitivity? I'm wearing a sweater and it's 75 degrees outside.",
      anon: true,
    },
  ],
};
