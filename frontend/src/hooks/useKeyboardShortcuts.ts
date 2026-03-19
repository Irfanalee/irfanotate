import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useImageStore } from '../store/imageStore';
import { useProjectStore } from '../store/projectStore';
import { useAnnotationStore } from '../store/annotationStore';
import { saveInvoiceAnnotation } from '../api/invoice';
import { saveAnnotation } from '../api/annotations';

export function useKeyboardShortcuts() {
  const { setTool, zoomIn, zoomOut } = useCanvasStore();
  const {
    selectedIds,
    deleteBox,
    isDirty: invoiceIsDirty,
    setSaving: invoiceSetSaving,
    markClean: invoiceMarkClean,
    buildSavePayload,
    createLineItem,
  } = useInvoiceStore();
  const { nextImage, prevImage, images, currentIndex, setIsAnnotated } = useImageStore();
  const { currentProject } = useProjectStore();
  const {
    isDirty: annotIsDirty,
    setSaving: annotSetSaving,
    markClean: annotMarkClean,
    buildSavePayload: annotBuildPayload,
  } = useAnnotationStore();

  const currentImage = images[currentIndex];
  const isProjectMode = (currentProject?.schema?.labels?.length ?? 0) > 0;

  const handleSave = useCallback(async () => {
    if (!currentImage) return;

    if (isProjectMode) {
      if (!annotIsDirty) return;
      annotSetSaving(true);
      try {
        await saveAnnotation(currentImage.filename, annotBuildPayload());
        annotMarkClean();
        setIsAnnotated(currentImage.filename, true);
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        annotSetSaving(false);
      }
    } else {
      if (!invoiceIsDirty) return;
      invoiceSetSaving(true);
      try {
        await saveInvoiceAnnotation(currentImage.filename, buildSavePayload());
        invoiceMarkClean();
        setIsAnnotated(currentImage.filename, true);
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        invoiceSetSaving(false);
      }
    }
  }, [
    currentImage,
    isProjectMode,
    invoiceIsDirty,
    annotIsDirty,
    buildSavePayload,
    annotBuildPayload,
    invoiceSetSaving,
    annotSetSaving,
    invoiceMarkClean,
    annotMarkClean,
    setIsAnnotated,
  ]);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          await handleSave();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'd':
          setTool('draw');
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            await handleSave();
          } else {
            setTool('select');
          }
          break;
        case 'p':
          setTool('polygon');
          break;
        case 'delete':
        case 'backspace':
          if (selectedIds.size > 0) {
            e.preventDefault();
            [...selectedIds].forEach((id) => deleteBox(id));
          }
          break;
        case 'g':
          if (selectedIds.size >= 2) {
            e.preventDefault();
            createLineItem([...selectedIds]);
          }
          break;
        case 'escape':
          useInvoiceStore.getState().clearSelection();
          useAnnotationStore.getState().clearSelection();
          window.getSelection()?.removeAllRanges();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (invoiceIsDirty || annotIsDirty) await handleSave();
          prevImage();
          break;
        case 'arrowright':
          e.preventDefault();
          if (invoiceIsDirty || annotIsDirty) await handleSave();
          nextImage();
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
      }
    },
    [
      setTool,
      selectedIds,
      deleteBox,
      createLineItem,
      nextImage,
      prevImage,
      handleSave,
      invoiceIsDirty,
      annotIsDirty,
      zoomIn,
      zoomOut,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (invoiceIsDirty || annotIsDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [invoiceIsDirty, annotIsDirty]);
}
