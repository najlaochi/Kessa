import { useEffect, useRef, useState } from 'react';
import { uploadStoryFile } from '../../services/uploadService';
import { pickMimeType } from '../../services/recordingStore';

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * "Kessa voice" for one version of a story (English, Arabic boy, Arabic girl):
 * record it here in the browser, or upload an audio file recorded by you or another narrator.
 * Families can choose it instead of recording the story themselves.
 */
function NarrationField({ label, url, onChange, nameHint, dir = 'ltr' }) {
    const [phase, setPhase] = useState('idle'); // idle | recording | review | uploading
    const [seconds, setSeconds] = useState(0);
    const [draftUrl, setDraftUrl] = useState('');
    const [error, setError] = useState('');
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const blobRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => () => {
        clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
    }, []);

    const start = async () => {
        setError('');
        const mimeType = pickMimeType();
        if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
            setError('Recording is not supported in this browser. Try Chrome, or upload a file instead.');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            streamRef.current = stream;
            // 64 kbps keeps a 15-minute story well under the upload limit
            const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
                blobRef.current = blob;
                setDraftUrl(URL.createObjectURL(blob));
                setPhase('review');
            };
            recorderRef.current = recorder;
            recorder.start(1000);
            setSeconds(0);
            setPhase('recording');
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } catch {
            setError('Please allow the microphone to record.');
        }
    };

    const stop = () => {
        clearInterval(timerRef.current);
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };

    const uploadBlob = async (blob, name) => {
        setPhase('uploading');
        setError('');
        try {
            const file = new File([blob], name, { type: blob.type || 'audio/webm' });
            onChange(await uploadStoryFile(file, 'narration'));
            setPhase('idle');
            setDraftUrl('');
        } catch (e) {
            setError('Upload failed: ' + e.message);
            setPhase(blobRef.current ? 'review' : 'idle');
        }
    };

    const saveRecording = () => {
        const ext = (blobRef.current?.type || '').includes('mp4') ? 'm4a' : 'webm';
        uploadBlob(blobRef.current, `narration.${ext}`);
    };

    return (
        <div className="form-group" style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem' }}>
            <label className="form-label">{label}</label>
            <p style={{ fontSize: '0.85rem', opacity: 0.75, marginBottom: '0.75rem' }}>
                Optional. Record the story here in your voice, or upload a recording by another narrator (MP3, M4A…).
                Families can then choose this voice instead of recording the story themselves.
                {nameHint && <> When you reach the child's name, say <strong dir={dir}>{nameHint}</strong>.</>}
            </p>

            {url && phase === 'idle' && (
                <div style={{ marginBottom: '0.75rem' }}>
                    <audio controls src={url} style={{ width: '100%' }} />
                    <button type="button" className="btn" style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => onChange('')}>Remove this voice</button>
                </div>
            )}

            {phase === 'idle' && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="button" className="btn btn-primary" onClick={start}>
                        🎙️ {url ? 'Record again' : 'Record with my voice'}
                    </button>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        📁 Upload a recording
                        <input type="file" accept="audio/*" style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && uploadBlob(e.target.files[0], e.target.files[0].name)} />
                    </label>
                </div>
            )}

            {phase === 'recording' && (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>🔴 {formatTime(seconds)}</p>
                    <button type="button" className="btn btn-primary" onClick={stop}>⏹️ Finish</button>
                </div>
            )}

            {phase === 'review' && (
                <div>
                    <audio controls src={draftUrl} style={{ width: '100%', marginBottom: '0.75rem' }} />
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary" onClick={saveRecording}>💾 Use this recording</button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setPhase('idle'); setDraftUrl(''); }}>
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {phase === 'uploading' && <p style={{ opacity: 0.8 }}>Uploading…</p>}
            {error && <p style={{ color: 'var(--error)', marginTop: '0.5rem' }}>{error}</p>}
            {url && phase === 'idle' && (
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>Remember to click “Update Story” to save.</p>
            )}
        </div>
    );
}

export default NarrationField;
