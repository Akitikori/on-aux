import { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/layout/Header';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { DjWorkspace } from './components/workspace/DjWorkspace';
import { LearnPage } from './components/learn/LearnPage';
import { type DeckData } from './components/mixer/DualDeckView';
import { useTrackLibrary } from './hooks/useTrackLibrary';
import { useAudioAnalysis } from './hooks/useAudioAnalysis';
import { useSession } from './hooks/useSession';
import { getAllAnalysis } from './db/analysis';
import { saveTrack } from './db/tracks';
import type { Track, AnalysisResult } from './types/track';
import type { AppView, DeckId } from './types/session';

export default function App() {
  const { tracks, loading: tracksLoading, addTrack, deleteTrack, loadTrackWithAnalysis, refresh } = useTrackLibrary();
  const { analyze, status: analysisStatus, progress: analysisProgress, reset: resetAnalysis } = useAudioAnalysis();
  const {
    session,
    loading: sessionLoading,
    createSession,
    updateDeckPosition,
    updateCrossfader,
    updateDeckVolume,
    completeOnboarding,
    dismissTip,
    isOnboardingComplete,
  } = useSession();

  const [view, setView] = useState<AppView>('loading');
  const [deckA, setDeckA] = useState<DeckData | null>(null);
  const [deckB, setDeckB] = useState<DeckData | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Map<string, AnalysisResult>>(new Map());
  const [pendingDeck, setPendingDeck] = useState<DeckId>('A');

  // Legacy: keep single-track state for onboarding flow
  const [onboardingTrack, setOnboardingTrack] = useState<{ track: Track; blob: Blob } | null>(null);
  const [onboardingAnalysis, setOnboardingAnalysis] = useState<AnalysisResult | null>(null);

  // Load all analysis data for library display
  const refreshAnalysisMap = useCallback(async () => {
    const all = await getAllAnalysis();
    const map = new Map<string, AnalysisResult>();
    all.forEach(a => map.set(a.trackId, a));
    setAnalysisMap(map);
  }, []);

  useEffect(() => {
    if (!tracksLoading) refreshAnalysisMap();
  }, [tracksLoading, refreshAnalysisMap]);

  // Determine initial view
  useEffect(() => {
    if (tracksLoading || sessionLoading) return;
    if (isOnboardingComplete) {
      setView('learn');
    } else {
      setView('onboarding');
    }
  }, [tracksLoading, sessionLoading, isOnboardingComplete]);

  // Library with analysis for BPM mismatch suggestions
  const libraryWithAnalysis = useMemo(() => {
    return tracks
      .map(track => {
        const analysis = analysisMap.get(track.id);
        return analysis ? { track, analysis } : null;
      })
      .filter(Boolean) as { track: Track; analysis: AnalysisResult }[];
  }, [tracks, analysisMap]);

  // Load a track to a specific deck
  const handleLoadToDeck = useCallback(async (trackId: string, deck: DeckId) => {
    const data = await loadTrackWithAnalysis(trackId);
    if (!data) return;

    const deckData: DeckData = {
      track: data.track,
      blob: data.blob,
      analysis: data.analysis ?? null,
    };

    if (deck === 'A') setDeckA(deckData);
    else setDeckB(deckData);

    // Reset playback position for the new track
    await updateDeckPosition(deck, 0);
    await createSession(deck, trackId, true);

    // Analyze if needed
    if (!data.analysis) {
      setPendingDeck(deck);
      const analysis = await analyze(trackId, data.blob);
      if (analysis) {
        const updatedDeck = { ...deckData, analysis };
        if (deck === 'A') setDeckA(updatedDeck);
        else setDeckB(updatedDeck);
        await refreshAnalysisMap();
      }
    }
  }, [loadTrackWithAnalysis, createSession, analyze, refreshAnalysisMap, updateDeckPosition]);

  // Upload file — add to library only (user can then load to a deck manually)
  const handleWorkspaceUpload = useCallback(async (file: File) => {
    setPendingDeck('A'); // just for progress display
    resetAnalysis();

    const result = await addTrack(file);
    if ('error' in result) {
      alert(result.error);
      return;
    }

    // Analyze the track in the background
    const analysis = await analyze(result.track.id, result.blob);
    if (analysis) {
      await refreshAnalysisMap();
    }
  }, [addTrack, analyze, resetAnalysis, refreshAnalysisMap]);

  // Upload directly to a specific deck: save to library + immediately load
  const handleUploadAndLoadToDeck = useCallback(async (file: File, deck: DeckId) => {
    const result = await addTrack(file);
    if ('error' in result) {
      alert(result.error);
      return;
    }
    await handleLoadToDeck(result.track.id, deck);
    // Analyze in background
    const analysis = await analyze(result.track.id, result.blob);
    if (analysis) await refreshAnalysisMap();
  }, [addTrack, handleLoadToDeck, analyze, refreshAnalysisMap]);

  // Select track from library (smart-route to first empty deck)
  const handleSelectTrack = useCallback(async (trackId: string) => {
    const targetDeck: DeckId = !deckA ? 'A' : 'B';
    await handleLoadToDeck(trackId, targetDeck);
  }, [deckA, handleLoadToDeck]);

  // Resume session — restore both decks
  const handleResumeSession = useCallback(async () => {
    if (!session) return;
    if (session.deckA) {
      await handleLoadToDeck(session.deckA.trackId, 'A');
    }
    if (session.deckB) {
      await handleLoadToDeck(session.deckB.trackId, 'B');
    }
  }, [session, handleLoadToDeck]);

  // Open deck load — in unified view, this is a no-op since library is always visible
  // but we keep it for DeckLoadButton click handler compatibility
  const handleDeckLoadRequest = useCallback((_deck: DeckId) => {
    // Library is always visible in unified view — no navigation needed
    // Could optionally scroll to library panel or highlight it
  }, []);

  // Handle onboarding track upload (legacy single-deck flow)
  const handleOnboardingTrackUploaded = useCallback(async (track: Track, blob: Blob) => {
    await saveTrack(track, blob);
    await refresh();
    setOnboardingTrack({ track, blob });
    await createSession('A', track.id, false);

    const analysis = await analyze(track.id, blob);
    if (analysis) {
      setOnboardingAnalysis(analysis);
      await refreshAnalysisMap();
    }
  }, [analyze, createSession, refresh, refreshAnalysisMap]);

  const handleOnboardingComplete = useCallback(async () => {
    await completeOnboarding();
    // Transition onboarding track to deck A
    if (onboardingTrack) {
      setDeckA({
        track: onboardingTrack.track,
        blob: onboardingTrack.blob,
        analysis: onboardingAnalysis,
      });
    }
    setView('learn');
  }, [completeOnboarding, onboardingTrack, onboardingAnalysis]);

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-muted animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <Header />
      <main className="flex-1">
        {view === 'onboarding' && (
          <OnboardingFlow
            onComplete={handleOnboardingComplete}
            onTrackUploaded={handleOnboardingTrackUploaded}
            onAnalysisComplete={(a) => setOnboardingAnalysis(a)}
            uploadedTrack={onboardingTrack}
            analysis={onboardingAnalysis}
            analysisStatus={analysisStatus}
            analysisProgress={analysisProgress}
            onPositionChange={(pos) => updateDeckPosition('A', pos)}
            onDismissTip={dismissTip}
            dismissedTips={session?.dismissedTips}
          />
        )}

        {view === 'learn' && (
          <LearnPage
            deckA={deckA}
            tracks={tracks}
            analysisMap={analysisMap}
            analysisStatus={analysisStatus}
            analysisProgress={analysisProgress}
            pendingDeck={pendingDeck}
            onLoadTrackToDeck={handleLoadToDeck}
            onSelectTrack={(trackId) => handleLoadToDeck(trackId, 'A')}
            onDeleteTrack={deleteTrack}
            onUploadFile={handleWorkspaceUpload}
            onPositionChange={(deck, pos) => updateDeckPosition(deck, pos)}
            onGoToMix={() => setView('main')}
          />
        )}

        {view === 'main' && (
          <DjWorkspace
            deckA={deckA}
            deckB={deckB}
            library={libraryWithAnalysis}
            session={session}
            initialPositionA={session?.deckA?.playbackPosition ?? 0}
            initialPositionB={session?.deckB?.playbackPosition ?? 0}
            initialCrossfader={session?.crossfaderPosition ?? 0.5}
            tracks={tracks}
            analysisMap={analysisMap}
            analysisStatus={analysisStatus}
            analysisProgress={analysisProgress}
            pendingDeck={pendingDeck}
            onPositionChange={(deck, pos) => updateDeckPosition(deck, pos)}
            onLoadToDeck={handleDeckLoadRequest}
            onLoadTrackToDeck={handleLoadToDeck}
            onSelectTrack={handleSelectTrack}
            onDeleteTrack={deleteTrack}
            onUploadFile={handleWorkspaceUpload}
            onUploadFileToDeck={handleUploadAndLoadToDeck}
            tutorialEnabled={true}
            onResumeSession={handleResumeSession}
            onDismissTip={dismissTip}
            dismissedTips={session?.dismissedTips}
            onCrossfaderChange={updateCrossfader}
            onVolumeChange={updateDeckVolume}
            onGoToLearn={() => setView('learn')}
          />
        )}
      </main>
    </div>
  );
}
