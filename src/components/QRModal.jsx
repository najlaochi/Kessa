import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function QRModal({ storyTitle, storyUrl, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const handleDownload = () => {
        const canvas = document.getElementById('qr-canvas-el');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `mama-tales-qr.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(safeUrl);
            alert('✅ Link copied!');
        } catch {
            alert(safeUrl);
        }
    };

    const safeUrl = storyUrl || window.location.origin;

    return (
        <div className="qr-modal-backdrop" onClick={handleBackdropClick}>
            <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="qr-modal-close" onClick={onClose} aria-label="Close">✕</button>

                <span className="qr-modal-emoji">📱</span>
                <h3 className="qr-modal-title">
                    {storyTitle || "Mama's Tales"}
                </h3>
                <p className="qr-modal-subtitle">Scan to open on any device!</p>

                {/* QR Code */}
                <div className="qr-modal-code">
                    <QRCodeCanvas
                        id="qr-canvas-el"
                        value={safeUrl}
                        size={210}
                        bgColor="#ffffff"
                        fgColor="#1a0a3c"
                        level="M"
                        marginSize={2}
                    />
                </div>

                <p className="qr-modal-hint">
                    📸 Point your phone camera at this code!
                </p>

                {/* URL pill */}
                <div className="qr-modal-url" onClick={handleCopyLink} style={{ cursor: 'pointer' }} title="Click to copy">
                    <span>🔗 {safeUrl}</span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="qr-download-btn" onClick={handleDownload}>
                        ⬇️ Save QR
                    </button>
                    <button className="qr-download-btn" onClick={handleCopyLink}
                        style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                        📋 Copy Link
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QRModal;
