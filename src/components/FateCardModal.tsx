import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { FATE_CARD_SIZE, fateCardFilename, fateCardPngFilename, renderFateCardPngBlob, saveBlob } from '../features/fateCard';
import { download } from '../features/project';
import { useI18n } from '../i18n';
import { Modal } from './Dialogs';

/** Midnight stage preview of one fate card, with SVG and 2× PNG downloads. The preview, SVG and PNG all come from the same SVG text. */
export function FateCardModal({ svg, visitorId, name, onClose }: { svg: string; visitorId: string; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const card = t.encore.fateCard;
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);
  const exporting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  // The Blob URL lives exactly as long as the SVG it shows: it is released on close, on change and on unmount.
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    setPreviewUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [svg]);
  async function downloadPng() {
    if (exporting.current) return;
    exporting.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const blob = await renderFateCardPngBlob(svg);
      if (mounted.current) saveBlob(fateCardPngFilename(visitorId), blob);
    } catch (error) {
      console.warn('Fate card PNG export failed.', error);
      if (mounted.current) setFailed(true);
    } finally {
      exporting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <Modal title={card.dialogTitle} onClose={onClose} wide>
    <div className="modal-body fate-card-stage">
      <p className="dialog-description inline">{card.previewHint}</p>
      <div className="fate-card-frame">
        {previewUrl && <img className="fate-card-preview" src={previewUrl} width={FATE_CARD_SIZE.width} height={FATE_CARD_SIZE.height} alt={card.description(name)} draggable={false} />}
      </div>
      <p role="alert" className="form-error">{failed ? card.pngFailed : ''}</p>
    </div>
    <div className="modal-footer">
      <button type="button" className="btn ghost" onClick={() => download(fateCardFilename(visitorId), svg, 'image/svg+xml;charset=utf-8')}><Download size={14} aria-hidden="true" />{card.downloadSvg}</button>
      <button type="button" className="btn primary" disabled={busy} aria-busy={busy} onClick={downloadPng}><Download size={14} aria-hidden="true" />{busy ? card.pngWorking : card.downloadPng}</button>
      <button type="button" className="btn ghost" onClick={onClose}>{t.common.close}</button>
    </div>
  </Modal>;
}
