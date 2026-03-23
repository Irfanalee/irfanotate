import { useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { Toolbar } from './components/Toolbar';
import { ImageSidebar } from './components/ImageSidebar';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { FieldLabelDropdown } from './components/FieldLabelDropdown';
import { InvoicePanel } from './components/InvoicePanel';
import { AnnotationPanel } from './components/AnnotationPanel';
import { ProjectDashboard } from './components/ProjectDashboard';
import { TextSidebar } from './components/TextSidebar';
import { TextAnnotator } from './components/TextAnnotator';
import { AudioSidebar } from './components/AudioSidebar';
import { AudioAnnotator } from './components/AudioAnnotator';
import { VideoSidebar } from './components/VideoSidebar';
import { VideoAnnotator } from './components/VideoAnnotator';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useImageStore } from './store/imageStore';
import { useInvoiceStore } from './store/invoiceStore';
import { useProjectStore } from './store/projectStore';
import { useTextStore } from './store/textStore';
import { useAudioStore } from './store/audioStore';
import { useVideoStore } from './store/videoStore';
import { fetchImages } from './api/images';
import { fetchTextDocs } from './api/text';
import { fetchAudioFiles } from './api/audio';
import { fetchVideoFiles } from './api/video';
import { fetchInvoiceAnnotation, saveInvoiceAnnotation } from './api/invoice';
import { getOcrCache, runOcr } from './api/ocr';
import type { Project } from './types';

type AppView = 'dashboard' | 'workspace';

function AudioWorkspaceView() {
  const { setFiles, setIsLoading, setError } = useAudioStore();
  const { currentProject } = useProjectStore();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const files = await fetchAudioFiles(currentProject?.id);
        setFiles(files);
      } catch (err) {
        console.error('Failed to load audio files:', err);
        setError('Failed to load audio files');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentProject?.id, setFiles, setIsLoading, setError]);

  return (
    <Layout>
      <AudioSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AudioAnnotator />
      </div>
    </Layout>
  );
}

function VideoWorkspaceView() {
  const { setFiles, setIsLoading, setError } = useVideoStore();
  const { currentProject } = useProjectStore();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const files = await fetchVideoFiles(currentProject?.id);
        setFiles(files);
      } catch (err) {
        console.error('Failed to load video files:', err);
        setError('Failed to load video files');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentProject?.id, setFiles, setIsLoading, setError]);

  return (
    <Layout>
      <VideoSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <VideoAnnotator />
      </div>
    </Layout>
  );
}

function TextWorkspaceView() {
  const { setDocs, setIsLoading, setError } = useTextStore();
  const { currentProject } = useProjectStore();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const docs = await fetchTextDocs(currentProject?.id);
        setDocs(docs);
      } catch (err) {
        console.error('Failed to load text docs:', err);
        setError('Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentProject?.id, setDocs, setIsLoading, setError]);

  return (
    <Layout>
      <TextSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <TextAnnotator />
        </div>
      </div>
      <AnnotationPanel />
    </Layout>
  );
}

function WorkspaceView() {
  const { images, currentIndex, setImages, setLoading, setError, setOcrStatus, setIsAnnotated } =
    useImageStore();
  const { clearAll, loadInvoiceAnnotation, setOcrBoxes, buildSavePayload, isDirty, setSaving } =
    useInvoiceStore();
  const { labels: projectLabels } = useProjectStore();

  const isProjectMode = projectLabels.length > 0;

  const prevIndexRef = useRef<number | null>(null);
  const currentImage = images[currentIndex];
  const currentFilename = currentImage?.filename;

  useKeyboardShortcuts();

  // Load images on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchImages();
        setImages(data);
      } catch (error) {
        console.error('Failed to load images:', error);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setImages, setLoading, setError]);

  // On image change: save prev, load annotation + OCR for new
  useEffect(() => {
    if (!currentFilename) {
      clearAll();
      return;
    }

    let cancelled = false;
    const prevIdx = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    const run = async () => {
      // Auto-save previous image if dirty (invoice mode only)
      if (prevIdx !== null && prevIdx !== currentIndex && isDirty && !isProjectMode) {
        const prevImage = images[prevIdx];
        if (prevImage) {
          setSaving(true);
          try {
            await saveInvoiceAnnotation(prevImage.filename, buildSavePayload());
            if (!cancelled) setIsAnnotated(prevImage.filename, true);
          } catch (e) {
            console.error('Failed to auto-save:', e);
          } finally {
            if (!cancelled) setSaving(false);
          }
        }
      }

      if (cancelled) return;
      clearAll();

      if (!isProjectMode) {
        // Invoice mode: load existing annotation
        try {
          const annotation = await fetchInvoiceAnnotation(currentFilename);
          if (!cancelled) loadInvoiceAnnotation(annotation);
        } catch (e) {
          console.error('Failed to load annotation:', e);
        }
      }

      if (cancelled) return;

      // Load OCR: try cache first, run if missing
      try {
        const cached = await getOcrCache(currentFilename);
        if (!cancelled) {
          setOcrBoxes(cached);
          setOcrStatus(currentFilename, 'done');
        }
      } catch {
        // 404 → run OCR
        if (cancelled) return;
        setOcrStatus(currentFilename, 'running');
        try {
          const boxes = await runOcr(currentFilename);
          if (!cancelled) {
            setOcrBoxes(boxes);
            setOcrStatus(currentFilename, 'done');
          }
        } catch (e) {
          console.error('OCR failed:', e);
          if (!cancelled) setOcrStatus(currentFilename, 'error');
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [currentFilename, currentIndex, isProjectMode]);

  return (
    <Layout>
      <ImageSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden relative">
          <AnnotationCanvas />
          {!isProjectMode && <FieldLabelDropdown />}
        </div>
      </div>
      {isProjectMode ? <AnnotationPanel /> : <InvoicePanel />}
    </Layout>
  );
}

function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const { setCurrentProject, currentProject } = useProjectStore();

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    setView('workspace');
  };

  const handleBackToDashboard = () => {
    setCurrentProject(null);
    setView('dashboard');
  };

  if (view === 'dashboard') {
    return <ProjectDashboard onOpenProject={handleOpenProject} />;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-th-bg-card border-b border-th-border px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleBackToDashboard}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          ← Projects
        </button>
        <div className="h-4 w-px bg-th-border-strong" />
        <span className="text-sm text-th-text-primary font-medium">
          {currentProject?.name ?? 'Workspace'}
        </span>
      </div>
      <div className="flex-1 h-full overflow-hidden">
        {currentProject?.data_type === 'text' ? <TextWorkspaceView /> :
         currentProject?.data_type === 'audio' ? <AudioWorkspaceView /> :
         currentProject?.data_type === 'video' ? <VideoWorkspaceView /> :
         <WorkspaceView />}
      </div>
    </div>
  );
}

export default App;
