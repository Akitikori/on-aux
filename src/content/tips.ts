import type { LearningTip } from '../types/tips';

export const tipCatalog: Record<string, LearningTip[]> = {
  intro: [
    {
      id: 'intro-1',
      title: 'The Intro',
      body: 'This is the intro — it eases listeners in with simpler elements. DJs use intros to blend the previous track out smoothly.',
      segmentType: 'intro',
    },
    {
      id: 'intro-2',
      title: 'Mixing In Point',
      body: 'A long intro is perfect for mixing. Start playing this track while the previous one is in its outro for a seamless transition.',
      segmentType: 'intro',
    },
  ],
  buildup: [
    {
      id: 'buildup-1',
      title: 'The Build-up',
      body: 'Energy is rising here! Build-ups create tension and anticipation before the main section hits.',
      segmentType: 'buildup',
    },
    {
      id: 'buildup-2',
      title: 'Timing Your Mix',
      body: 'Avoid starting a transition during a build-up — the energy shift can clash with the incoming track.',
      segmentType: 'buildup',
    },
  ],
  chorus: [
    {
      id: 'chorus-1',
      title: 'The Drop / Chorus',
      body: 'This is the highest-energy section — the main event! Let it play out fully to keep the crowd engaged.',
      segmentType: 'chorus',
    },
    {
      id: 'chorus-2',
      title: 'Energy Peak',
      body: 'This section has the most energy. Your next track should match or complement this intensity.',
      segmentType: 'chorus',
    },
  ],
  breakdown: [
    {
      id: 'breakdown-1',
      title: 'The Breakdown',
      body: 'A quieter moment between high-energy sections. This creates contrast and gives the listener a breather.',
      segmentType: 'breakdown',
    },
    {
      id: 'breakdown-2',
      title: 'Sneaky Mix Point',
      body: 'Breakdowns are great for subtle transitions — the lower energy makes it easier to blend another track in.',
      segmentType: 'breakdown',
    },
  ],
  outro: [
    {
      id: 'outro-1',
      title: 'The Outro',
      body: 'The track is winding down. This is where most DJs begin their transition to the next song.',
      segmentType: 'outro',
    },
    {
      id: 'outro-2',
      title: 'Transition Zone',
      body: 'Start your next track here! The simpler elements make it easy to blend two tracks together.',
      segmentType: 'outro',
    },
  ],
  general: [
    {
      id: 'general-bpm',
      title: 'What is BPM?',
      body: 'BPM (Beats Per Minute) is the speed of the music. Matching BPMs between tracks makes mixing sound smooth and natural.',
    },
    {
      id: 'general-phrasing',
      title: 'Phrasing',
      body: 'Most music is organized in 8 or 16-bar phrases. Mixing at phrase boundaries sounds more natural because changes align with the music\'s structure.',
    },
    {
      id: 'general-structure',
      title: 'Song Structure',
      body: 'Most tracks follow a pattern: Intro → Build-up → Chorus/Drop → Breakdown → Chorus → Outro. Understanding this helps you plan transitions.',
    },
  ],
};

export const transitionTechniques = [
  {
    id: 'fade',
    name: 'Volume Fade',
    description: 'Gradually lower the volume of the outgoing track while raising the incoming one. The simplest technique — great for beginners.',
    difficulty: 'beginner',
  },
  {
    id: 'eq-swap',
    name: 'EQ Swap',
    description: 'Cut the bass on the incoming track, then swap: bring in the new bass while cutting the old. Creates a cleaner blend than a simple fade.',
    difficulty: 'intermediate',
  },
  {
    id: 'intro-over-outro',
    name: 'Intro Over Outro',
    description: 'Play the next track\'s intro over the current track\'s outro. The two sections are designed to work with other tracks, making this very natural.',
    difficulty: 'beginner',
  },
  {
    id: 'echo-out',
    name: 'Echo Out',
    description: 'Apply an echo/delay effect to the outgoing track, creating a fading trail while the new track comes in clean. Dramatic and effective.',
    difficulty: 'intermediate',
  },
];
