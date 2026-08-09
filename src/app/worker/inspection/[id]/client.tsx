'use client'

import { toast } from '@/components/ui/toast'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, X, UploadCloud, CheckCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import { openDB } from 'idb'
import { submitCheckpoints } from '@/server/actions/worker'
import { QcVideoCapture } from '@/components/factory/QcVideoCapture'
import { Button as SoftButton } from '@/components/ui/primitives'
import { OrderSpecCard } from '@/components/factory/OrderSpecCard'

const getDB = async () => {
  return await openDB('factory-qc-db', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' })
      }
    }
  })
}

type Answer = { passFail: 'PASS' | 'FAIL' | null; remark: string; photo: string | null }

export default function InspectionClient({ batch, dict }: { batch: any, dict: any }) {
  const router = useRouter()
  const sections = batch.template.sections;
  const isHi = dict.locale === 'hi' || dict.locale === 'hinglish';

  const getSectionTitle = (sec: any) => {
    if (!sec) return "";
    if (dict.locale === 'hinglish') return sec.titleHinglish || sec.titleHi || sec.title;
    if (dict.locale === 'hi') return sec.titleHi || sec.title;
    return sec.title;
  };

  const getCheckpointName = (cp: any) => {
    if (!cp) return "";
    if (dict.locale === 'hinglish') return cp.nameHinglish || cp.nameHi || cp.name;
    if (dict.locale === 'hi') return cp.nameHi || cp.name;
    return cp.name;
  };

  const getCheckpointInstructions = (cp: any) => {
    if (!cp) return "";
    if (dict.locale === 'hinglish') return cp.instructionsHinglish || cp.instructionsHi || cp.instructions;
    if (dict.locale === 'hi') return cp.instructionsHi || cp.instructions;
    return cp.instructions;
  };
  
  // Flatten checkpoints list for submission mapping
  const checkpoints = sections.flatMap((s: any) => s.checkpoints);

  // Section / Step Indexing States
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const [isSummaryPage, setIsSummaryPage] = useState(false);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedSection = localStorage.getItem(`qc_sec_${batch.id}`);
    const savedCamera = localStorage.getItem(`qc_cam_${batch.id}`);
    const savedSummary = localStorage.getItem(`qc_sum_${batch.id}`);
    if (savedSection) setActiveSectionIdx(parseInt(savedSection, 10));
    if (savedCamera) setActiveCameraIdx(parseInt(savedCamera, 10));
    if (savedSummary) setIsSummaryPage(savedSummary === 'true');
  }, [batch.id]);

  const saveState = (secIdx: number, camIdx: number, sumPage: boolean) => {
    setActiveSectionIdx(secIdx);
    setActiveCameraIdx(camIdx);
    setIsSummaryPage(sumPage);
    localStorage.setItem(`qc_sec_${batch.id}`, String(secIdx));
    localStorage.setItem(`qc_cam_${batch.id}`, String(camIdx));
    localStorage.setItem(`qc_sum_${batch.id}`, String(sumPage));
  };

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [syncState, setSyncState] = useState<'IDLE' | 'PREPARING' | 'SYNCING' | 'SYNCED' | 'FAILED'>('IDLE');

  // Accent Color from Factory Settings
  const settings = (batch.factory?.settings as any) || {};
  const accentColor = settings.themeColor || "#007AFF";

  // File capture elements
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft or database submissions on mount
  useEffect(() => {
    const loadDraft = async () => {
      const db = await getDB()
      const draft = await db.get('drafts', batch.id)
      if (draft && draft.answers) {
        setAnswers(draft.answers)
      } else if (batch.inspection?.submissions) {
        const initialAnswers: Record<string, Answer> = {}
        for (const sub of batch.inspection.submissions) {
          initialAnswers[sub.checkpointId] = {
            passFail: sub.passFail || null,
            remark: sub.remarks || '',
            photo: sub.evidences?.[0]?.publicUrl || null
          }
        }
        setAnswers(initialAnswers)
      }
    }
    loadDraft()
  }, [batch.id, batch.inspection?.submissions])

  const updateAnswer = async (cpId: string, updates: Partial<Answer>) => {
    const nextAnswers = {
      ...answers,
      [cpId]: Object.assign(
        { passFail: null, remark: '', photo: null },
        answers[cpId] || {},
        updates
      )
    }
    setAnswers(nextAnswers)
    const db = await getDB()
    await db.put('drafts', { id: batch.id, answers: nextAnswers })
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, fallbackCpId: string) => {
    const cpId = photoTargetId || fallbackCpId;
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64Str = reader.result as string
        const img = new Image()
        img.src = base64Str
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxWidth = 1024
          let width = img.width
          let height = img.height

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const compressed = canvas.toDataURL("image/jpeg", 0.7)
            updateAnswer(cpId, { photo: compressed })
          } else {
            updateAnswer(cpId, { photo: base64Str })
          }
        }
        img.onerror = () => {
          updateAnswer(cpId, { photo: base64Str })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerCamera = (cpId: string) => {
    setPhotoTargetId(cpId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const syncOfflineData = async () => {
    setSyncState('SYNCING')
    try {
      const db = await getDB()
      const allSubmissions = await db.getAll('sync-queue')
      const batchSubmissions = allSubmissions.filter(s => s.batchId === batch.id)

      if (batchSubmissions.length === 0) {
        setSyncState('SYNCED')
        router.push('/worker')
        return
      }

      const processedSubmissions = []

      for (const sub of batchSubmissions) {
        processedSubmissions.push({
          checkpointId: sub.checkpointId,
          passFail: sub.passFail,
          remark: sub.remark,
          timestamp: sub.timestamp,
          photo: sub.photo,
          storagePath: `worker/${batch.factoryId}/${batch.id}/${sub.checkpointId}/${sub.timestamp}.webp`,
          contentType: sub.photo?.match(/^data:([^;]+);base64,/)?.[1] || 'image/webp'
        })
      }

      const result = await submitCheckpoints(batch.id, processedSubmissions)
      if (result.error) throw new Error(result.error)

      // Clear synced items & draft
      const tx = db.transaction(['sync-queue', 'drafts'], 'readwrite')
      for (const sub of batchSubmissions) {
        await tx.objectStore('sync-queue').delete(sub.id)
      }
      await tx.objectStore('drafts').delete(batch.id)
      await tx.done

      localStorage.removeItem(`qc_sec_${batch.id}`)
      localStorage.removeItem(`qc_cam_${batch.id}`)
      localStorage.removeItem(`qc_sum_${batch.id}`)
      setSyncState('SYNCED')
      router.push('/worker')
    } catch (e) {
      console.error("Sync failed:", e)
      setSyncState('FAILED')
    }
  }

  // QC steps cannot be skipped: every checkpoint needs an answer, and a
  // photo wherever the template demands one.
  // Submitted but not yet signed off — the worker may still amend and re-submit.
  const alreadySubmitted = ["WAITING_QC", "REWORK_REQUIRED"].includes(batch.inspection?.status ?? "");

  const everyStepAnswered = checkpoints.every((cp: any) => {
    // Optional checkpoints never block submission.
    if (cp.isRequired === false) return true;
    const ans = answers[cp.id];
    if (!ans || ans.passFail === null || ans.passFail === undefined) return false;
    if (cp.requireImage && !ans.photo) return false;
    return true;
  });
  // A template can require a walkthrough video; without it the inspection is
  // incomplete and cannot be submitted.
  const videoRequired = !!batch.template?.requiresVideo;
  const hasVideo = !!batch.inspection?.videoUrl;
  const allStepsAnswered = everyStepAnswered && (!videoRequired || hasVideo);

  const handleSubmitAll = async () => {
    if (!everyStepAnswered) {
      toast.error(isHi ? "सभी चरण पूरे करें — कोई स्टेप छोड़ा नहीं जा सकता" : "Complete every step - QC steps cannot be skipped");
      return;
    }
    if (videoRequired && !hasVideo) {
      toast.error(isHi ? "सबमिट करने से पहले वीडियो अपलोड करें" : "Record the walkthrough video before submitting");
      return;
    }
    setSyncState('PREPARING')

    // Save all to sync queue
    const db = await getDB();
    const tx = db.transaction('sync-queue', 'readwrite');
    for (const cp of checkpoints) {
      // No PASS fallback: an unanswered checkpoint must never be recorded as a
      // pass. allStepsAnswered above guarantees every one has a real answer.
      const ans = answers[cp.id];
      if (!ans?.passFail) continue;
      await tx.store.add({
        batchId: batch.id,
        factoryId: batch.factoryId,
        checkpointId: cp.id,
        photo: ans.photo,
        fileName: `${cp.id}.jpg`,
        size: ans.photo ? Math.max(0, Math.round((ans.photo.length * 3) / 4)) : 0,
        passFail: ans.passFail,
        remark: ans.remark || '',
        timestamp: batch.inspection?.submittedAt?.getTime?.() || batch.createdAt?.getTime?.() || 0
      });
    }
    await tx.done;
    await syncOfflineData();
  }

  if (syncState === 'SYNCING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-2 dark:bg-neutral-900 text-text-primary dark:text-neutral-50 p-8 text-center min-h-[100dvh]" style={{ '--brand': accentColor } as React.CSSProperties}>
        <div className="animate-bounce">
          <UploadCloud className="w-20 h-20 text-[var(--brand)] mb-6" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{dict.uploading || 'Syncing...'}</h2>
        <p className="text-text-secondary text-sm font-medium">{isHi ? 'क्लाउड में डेटा सुरक्षित रूप से सहेजा जा रहा है' : 'Saving data securely to the cloud'}</p>
      </div>
    )
  }

  if (syncState === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-2 dark:bg-neutral-900 text-text-primary dark:text-neutral-50 p-8 text-center min-h-[100dvh]" style={{ '--brand': accentColor } as React.CSSProperties}>
        <X className="w-20 h-20 text-danger mb-6" />
        <h2 className="text-2xl font-bold mb-2">{dict.syncFailed}</h2>
        <p className="text-text-secondary text-sm mb-8 font-medium">{dict.networkSaved}</p>
        <SoftButton variant="primary" onClick={syncOfflineData}>{dict.retry}</SoftButton>
      </div>
    )
  }

  const currentSection = !isSummaryPage ? sections[activeSectionIdx] : null;
  
  // Group checkpoints for the active section
  const activeCheckpoints = currentSection ? currentSection.checkpoints : [];
  const cameraCheckpoints = activeCheckpoints.filter((cp: any) => cp.requireImage);
  const yesNoCheckpoints = activeCheckpoints.filter((cp: any) => !cp.requireImage);

  // Check if Yes/No sub-stage is completed
  const yesNoCompleted = yesNoCheckpoints.every((cp: any) => cp.isRequired === false || answers[cp.id]?.passFail != null);

  // Determine current active layout view inside section
  const showYesNoList = yesNoCheckpoints.length > 0 && !yesNoCompleted;
  const showCameraStep = !showYesNoList && cameraCheckpoints.length > 0 && activeCameraIdx < cameraCheckpoints.length;

  // Active step info (for camera steps)
  const currentCameraCp = showCameraStep ? cameraCheckpoints[activeCameraIdx] : null;
  const cameraAns = currentCameraCp ? (answers[currentCameraCp.id] || { passFail: null, remark: '', photo: null }) : null;
  const cameraDbSub = currentCameraCp ? batch.inspection?.submissions?.find((s: any) => s.checkpointId === currentCameraCp.id) : null;

  // Check if active section's all checkpoints are completed
  const activeSectionCompleted = activeCheckpoints.every((cp: any) => {
    if (cp.isRequired === false) return true;
    const ans = answers[cp.id];
    if (!ans || ans.passFail === null) return false;
    if (cp.requireImage && !ans.photo) return false;
    return true;
  });

  const handleNextAction = () => {
    if (activeSectionIdx < sections.length - 1) {
      saveState(activeSectionIdx + 1, 0, false);
    } else {
      saveState(activeSectionIdx, 0, true);
    }
  };

  return (
    <div className="flex flex-col bg-surface-2 dark:bg-neutral-900 text-text-primary dark:text-neutral-50 min-h-[100dvh] relative pb-[calc(110px+env(safe-area-inset-bottom))]" style={{ '--brand': accentColor } as React.CSSProperties}>
      
      {/* Hidden File Capture Input */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => handlePhotoCapture(e, '')}
      />

      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-b border-border dark:border-neutral-800 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isSummaryPage) {
                saveState(sections.length - 1, 0, false);
              } else if (showCameraStep && activeCameraIdx > 0) {
                saveState(activeSectionIdx, activeCameraIdx - 1, false);
              } else if (activeSectionIdx > 0) {
                const prevSec = sections[activeSectionIdx - 1];
                const prevSecCams = prevSec.checkpoints.filter((cp: any) => cp.requireImage);
                saveState(activeSectionIdx - 1, prevSecCams.length > 0 ? prevSecCams.length - 1 : 0, false);
              } else {
                router.back();
              }
            }} 
            className="p-2 bg-surface-2 dark:bg-neutral-800 rounded-full hover:bg-surface-2 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-text-secondary dark:text-neutral-300" />
          </button>
          <div className="flex flex-col">
            <span className="text-base font-bold font-display text-text-primary leading-none">
              {batch.order?.itemName || `${batch.order?.productName || "Order"} #${batch.order?.orderNumber || ""}`}
            </span>
            <span className="text-[10px] text-text-secondary dark:text-neutral-400 font-medium mt-1 uppercase tracking-wider">
              {isSummaryPage ? (isHi ? 'विवरण समीक्षा' : 'Review Summary') : getSectionTitle(currentSection)}
            </span>
          </div>
        </div>
      </div>

      {/* Sections Tab Bar */}
      <div className="bg-white dark:bg-neutral-900/60 border-b border-border dark:border-neutral-800 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none sticky top-[53px] z-30">
        {sections.map((sec: any, idx: number) => {
          const isCurrent = !isSummaryPage && activeSectionIdx === idx;
          return (
            <button
              key={sec.id}
              onClick={() => saveState(idx, 0, false)}
              className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${
                isCurrent
                  ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm"
                  : "bg-surface-2 dark:bg-neutral-800 text-text-secondary dark:text-neutral-400 border-transparent hover:bg-surface-2"
              }`}
            >
              {getSectionTitle(sec)}
            </button>
          )
        })}
        <button
          onClick={() => saveState(activeSectionIdx, 0, true)}
          className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-full transition-all border ${
            isSummaryPage
              ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm"
              : "bg-surface-2 dark:bg-neutral-800 text-text-secondary dark:text-neutral-400 border-transparent hover:bg-surface-2"
          }`}
        >
          {isHi ? 'समीक्षा' : 'Review'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-w-md mx-auto w-full flex-1 flex flex-col justify-between">

        {/* Full build spec (collapsed by default so it doesn't push the
            checkpoint UI down) — the inspector needs to know what was ordered
            in order to judge what was built. */}
        <div className="mb-3">
          <OrderSpecCard order={batch.order} defaultOpen={false} />
        </div>

        {isSummaryPage ? (
          /* ──────────────── SUMMARY PAGE ──────────────── */
          <div className="space-y-4 w-full">
            <div className="bg-white dark:bg-neutral-800 border border-border dark:border-neutral-700 rounded-[24px] p-5 shadow-sm">
              {/* The summary must reflect the real state: it used to show a
                  "completed" tick and mark every unanswered checkpoint as Pass,
                  so a half-finished inspection looked ready to submit. */}
              {(() => {
                const answered = checkpoints.filter((cp: any) => answers[cp.id]?.passFail).length;
                const remaining = checkpoints.length - answered;
                return (
                  <div className="text-center py-3">
                    {allStepsAnswered ? (
                      <CheckCircle className="w-14 h-14 text-success mx-auto mb-2" />
                    ) : (
                      <AlertTriangle className="w-14 h-14 text-warning mx-auto mb-2" />
                    )}
                    <h3 className="text-lg font-bold text-text-primary dark:text-neutral-50">
                      {allStepsAnswered
                        ? (isHi ? 'जांच पूरी हुई!' : 'Checks completed!')
                        : (isHi ? `${remaining} चरण बाकी` : `${remaining} check${remaining === 1 ? "" : "s"} still to do`)}
                    </h3>
                    <p className="text-text-secondary dark:text-neutral-400 text-xs mt-0.5">
                      {allStepsAnswered
                        ? (isHi ? 'कृपया समीक्षा करें और गुणवत्ता रिपोर्ट जमा करें' : 'Please review and submit the quality report')
                        : (isHi ? 'हर चरण का उत्तर दें — तभी जमा कर सकते हैं' : 'Tap any unchecked step below to complete it')}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-text-tertiary">
                      {answered}/{checkpoints.length} {isHi ? 'पूर्ण' : 'answered'}
                    </p>
                  </div>
                );
              })()}

              <div className="mt-4 space-y-2">
                {checkpoints.map((cp: any, idx: number) => {
                  const cpAns = answers[cp.id] || { passFail: null, remark: '', photo: null };
                  const hasFailed = cpAns.passFail === 'FAIL';
                  const unanswered = !cpAns.passFail;
                  return (
                    <button
                      key={cp.id}
                      onClick={() => {
                        // Find section index this checkpoint belongs to
                        const secIndex = sections.findIndex((s: any) => s.checkpoints.some((c: any) => c.id === cp.id));
                        if (secIndex !== -1) {
                          if (cp.requireImage) {
                            const secCams = sections[secIndex].checkpoints.filter((c: any) => c.requireImage);
                            const camIdx = secCams.findIndex((c: any) => c.id === cp.id);
                            saveState(secIndex, camIdx !== -1 ? camIdx : 0, false);
                          } else {
                            saveState(secIndex, 0, false);
                          }
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 bg-surface-2 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-800/80 hover:border-[var(--brand)]/30 hover:bg-[var(--brand)]/5 active:scale-[0.99] transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        <span className="text-[10px] font-bold text-text-tertiary w-4 shrink-0">{idx + 1}</span>
                        <span className="text-xs font-semibold text-text-primary dark:text-neutral-200 truncate flex-1">
                          {getCheckpointName(cp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${
                          unanswered
                            ? 'bg-surface-2 text-text-tertiary border border-border'
                            : hasFailed
                              ? 'bg-warning-soft text-warning dark:bg-amber-900/30 dark:text-warning'
                              : 'bg-success-soft text-success dark:bg-green-900/30 dark:text-success'
                        }`}>
                          {unanswered ? (isHi ? 'बाकी' : 'Not checked') : hasFailed ? (isHi ? 'फेल' : 'Fail') : (isHi ? 'पास' : 'Pass')}
                        </span>
                        {cpAns.photo && (
                          <img src={cpAns.photo} className="w-6 h-6 rounded object-cover border border-border dark:border-neutral-850 shrink-0" alt="Evidence" />
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QC walkthrough video — the whole-item evidence that photos of
                individual checkpoints cannot give. */}
            {batch.inspection?.id && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <QcVideoCapture
                  inspectionId={batch.inspection.id}
                  videoUrl={batch.inspection.videoUrl}
                  durationSec={batch.inspection.videoDurationSec}
                />
              </div>
            )}

            {/* Submit Final Button */}
            <div className="pt-2">
              {!allStepsAnswered && (
                <p className="mb-2 flex items-start gap-1.5 text-[11px] font-semibold text-warning">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  {!everyStepAnswered
                    ? (isHi ? 'हर चरण का उत्तर देने के बाद ही जमा कर सकते हैं' : 'Answer every check above before you can submit')
                    : (isHi ? 'सबमिट करने से पहले वॉकथ्रू वीडियो रिकॉर्ड करें' : 'Record the walkthrough video before you can submit')}
                </p>
              )}
              {alreadySubmitted && allStepsAnswered && (
                <p className="mb-2 text-[11px] font-semibold text-text-tertiary">
                  {isHi
                    ? 'पहले जमा किया जा चुका है — बदलाव करके दोबारा जमा करें'
                    : 'Already submitted — you can amend and re-submit until it is approved'}
                </p>
              )}
              <button
                onClick={handleSubmitAll}
                disabled={syncState !== 'IDLE' || !allStepsAnswered}
                className="w-full h-14 text-white font-bold rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                style={{ backgroundColor: accentColor }}
              >
                {syncState === 'PREPARING' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{dict.uploading || 'Uploading...'}</span>
                  </>
                ) : (
                  <span>{alreadySubmitted ? (isHi ? 'दोबारा जमा करें' : 'Re-submit') : (dict.submit || 'Submit Batch')}</span>
                )}
              </button>
            </div>
          </div>
        ) : showYesNoList ? (
          /* ──────────────── YES/NO LIST VIEW ──────────────── */
          <div className="flex-1 flex flex-col justify-between w-full space-y-4">
            <div className="space-y-3 flex-1">
              {yesNoCheckpoints.map((cp: any, idx: number) => {
                const cpAns = answers[cp.id] || { passFail: null, remark: '', photo: null };
                const isPass = cpAns.passFail === 'PASS';
                const isFail = cpAns.passFail === 'FAIL';

                return (
                  <div key={cp.id} className="bg-white dark:bg-neutral-800 border border-border dark:border-neutral-700 rounded-[20px] p-4 shadow-xs flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-bold text-[var(--brand)] tracking-widest uppercase">
                          {isHi ? `जांच ${idx + 1}` : `Check ${idx + 1}`}
                        </span>
                        <h4 className="text-sm font-bold text-text-primary dark:text-neutral-50 leading-tight mt-0.5">
                          {getCheckpointName(cp)}
                        </h4>
                        {(cp.instructions || cp.instructionsHi || cp.instructionsHinglish) && (
                          <p className="text-[11px] text-text-secondary mt-1">
                            {getCheckpointInstructions(cp)}
                          </p>
                        )}
                        {cp.isRequired === false && (
                          <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-text-tertiary">Optional</span>
                        )}
                        {cp.referenceImageUrl && (
                          /* Reference photo of the correct result, to compare against. */
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={cp.referenceImageUrl} alt="reference" className="mt-2 h-20 w-20 rounded-lg border border-border object-cover" />
                        )}
                      </div>

                      {/* Pass / Fail Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateAnswer(cp.id, { passFail: 'PASS', remark: '' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isPass
                              ? "bg-success text-white shadow-xs"
                              : "bg-surface-2 dark:bg-neutral-900 text-text-secondary dark:text-text-tertiary hover:bg-surface-2"
                          }`}
                        >
                          {isHi ? 'पास' : 'Pass'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAnswer(cp.id, { passFail: 'FAIL' })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isFail
                              ? "bg-warning text-white shadow-xs"
                              : "bg-surface-2 dark:bg-neutral-900 text-text-secondary dark:text-text-tertiary hover:bg-surface-2"
                          }`}
                        >
                          {isHi ? 'फेल' : 'Fail'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Fail remarks and optional photo verification */}
                    {isFail && (
                      <div className="pt-2 border-t border-slate-100 dark:border-neutral-850 flex items-center gap-2">
                        <input
                          type="text"
                          value={cpAns.remark}
                          onChange={(e) => updateAnswer(cp.id, { remark: e.target.value })}
                          placeholder={isHi ? 'समस्या का विवरण...' : 'Issue remark...'}
                          className="flex-1 px-3 py-1.5 bg-surface-2 dark:bg-neutral-900 border border-border dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:border-warning"
                        />
                        {cpAns.photo ? (
                          <div className="relative w-8 h-8 rounded overflow-hidden border border-border dark:border-neutral-800 shrink-0">
                            <img src={cpAns.photo} className="w-full h-full object-cover" alt="Remark" />
                            <button
                              type="button"
                              onClick={() => triggerCamera(cp.id)}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerCamera(cp.id)}
                            className="w-8 h-8 rounded border border-border dark:border-neutral-800 flex items-center justify-center bg-surface-2 dark:bg-neutral-900 text-text-secondary shrink-0 hover:border-warning"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Navigation Button */}
            <div className="pt-4 sticky bottom-0 z-20 bg-surface-2/80 dark:bg-neutral-900/80 backdrop-blur-md pb-2">
              <button
                onClick={handleNextAction}
                disabled={!yesNoCompleted}
                className="w-full h-12 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 text-sm"
                style={{ backgroundColor: accentColor }}
              >
                <span>{isHi ? 'आगे बढ़ें' : 'Next Step'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : showCameraStep ? (
          /* ──────────────── CAMERA VERIFICATION CARD (As It Is) ──────────────── */
          <div className="flex-1 flex flex-col justify-between w-full space-y-4">
            <div className="bg-white dark:bg-neutral-800 border border-border dark:border-neutral-700 rounded-[28px] p-6 shadow-sm flex-1 flex flex-col justify-between">
              
              <div>
                {/* Step Progress Line */}
                <div className="w-full bg-surface-2 dark:bg-neutral-900 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div 
                    className="bg-[var(--brand)] h-full transition-all duration-300" 
                    style={{ width: `${((activeCameraIdx + 1) / cameraCheckpoints.length) * 100}%` }}
                  />
                </div>

                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--brand)]">
                  {isHi ? 'कैमरा सत्यापन' : 'Camera Verification Step'}
                </span>
                
                <h3 className="text-lg font-bold text-text-primary leading-tight mt-1 mb-2">
                  {getCheckpointName(currentCameraCp)}
                </h3>
                
                {cameraDbSub?.verificationStatus === 'REJECTED' && (
                  <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger font-medium flex flex-col gap-1">
                    <span className="font-bold flex items-center gap-1.5">
                      ⚠️ Rejected by Inspector
                    </span>
                    {cameraDbSub.inspectorComment && (
                      <span className="text-text-secondary dark:text-neutral-300 italic">
                        "{cameraDbSub.inspectorComment}"
                      </span>
                    )}
                  </div>
                )}
                
                {(currentCameraCp.instructions || currentCameraCp.instructionsHi || currentCameraCp.instructionsHinglish) && (
                  <p className="text-text-secondary dark:text-neutral-400 text-xs mb-3 font-medium leading-relaxed">
                    {getCheckpointInstructions(currentCameraCp)}
                  </p>
                )}
                {currentCameraCp.referenceImageUrl && (
                  <div className="mb-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary mb-1">Reference</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentCameraCp.referenceImageUrl} alt="reference" className="h-28 w-28 rounded-xl border border-border object-cover" />
                  </div>
                )}
              </div>

              {/* Camera Evidence Capture Card */}
              <div className="mt-2 shrink-0">
                {cameraAns?.photo ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] w-full border border-border dark:border-neutral-800 shadow-sm group">
                    <img src={cameraAns.photo} className="absolute inset-0 w-full h-full object-cover" alt="Captured proof" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                      <button 
                        type="button"
                        onClick={() => triggerCamera(currentCameraCp.id)}
                        className="bg-white dark:bg-neutral-900 text-text-primary dark:text-neutral-50 font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        {dict.retake || 'Wapas Photo Lein'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => triggerCamera(currentCameraCp.id)}
                    className="w-full aspect-[4/3] border-2 border-dashed border-border dark:border-neutral-800 rounded-2xl text-text-tertiary dark:text-neutral-500 hover:text-[var(--brand)] hover:border-[var(--brand)]/30 hover:bg-[var(--brand)]/5 transition-all flex flex-col items-center justify-center gap-3 bg-surface-2 dark:bg-neutral-900/50 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center shadow-md animate-pulse">
                      <Camera className="w-5 h-5 text-text-secondary dark:text-neutral-400" />
                    </div>
                    <span className="text-xs font-semibold">
                      {isHi ? 'फोटो खींचना अनिवार्य है' : 'Capture photo proof first'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Camera Actions */}
            <div className="mt-4 flex gap-3">
              <button 
                disabled={!cameraAns?.photo}
                onClick={() => {
                  updateAnswer(currentCameraCp.id, { passFail: 'FAIL' });
                  // Advance step
                  if (activeCameraIdx < cameraCheckpoints.length - 1) {
                    saveState(activeSectionIdx, activeCameraIdx + 1, false);
                  } else {
                    handleNextAction();
                  }
                }}
                className="flex-1 h-14 bg-warning/10 text-warning dark:text-warning border border-warning/20 active:bg-warning/20 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center font-bold gap-2 text-base transition-colors"
              >
                <X className="w-5 h-5" />
                <span>{isHi ? 'फेल' : 'Fail'}</span>
              </button>

              <button 
                disabled={!cameraAns?.photo}
                onClick={() => {
                  updateAnswer(currentCameraCp.id, { passFail: 'PASS', remark: '' });
                  // Advance step
                  if (activeCameraIdx < cameraCheckpoints.length - 1) {
                    saveState(activeSectionIdx, activeCameraIdx + 1, false);
                  } else {
                    handleNextAction();
                  }
                }}
                className="flex-1 h-14 bg-[var(--brand)] text-white shadow-lg shadow-brand/20 active:opacity-90 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center font-bold gap-2 text-base transition-all cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                <Check className="w-5 h-5" />
                <span>{isHi ? 'पास' : 'Pass'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ──────────────── FALLBACK SECTION READY TO GO NEXT ──────────────── */
          <div className="bg-white dark:bg-neutral-800 border border-border dark:border-neutral-700 rounded-[28px] p-6 shadow-sm text-center py-10 w-full space-y-4">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <h3 className="text-xl font-bold">
              {isHi ? 'यह अनुभाग पूरा हो गया है!' : 'Section Completed!'}
            </h3>
            <button
              onClick={handleNextAction}
              className="w-full h-12 text-white font-bold rounded-xl shadow-md transition-all text-sm"
              style={{ backgroundColor: accentColor }}
            >
              {isHi ? 'अगले अनुभाग पर जाएं' : 'Proceed to Next Section'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
