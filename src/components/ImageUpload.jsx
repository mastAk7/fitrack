import { useRef, useState } from 'react';

/**
 * Resizes image to max 1024px width using canvas, returns base64 data URI.
 */
async function resizeImage(file, maxWidth = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ onImage, label = 'Add Photo', accept = 'image/*', compact = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await resizeImage(file);
      setPreview(base64);
      onImage?.(base64, file);
    } catch (err) {
      console.error('Image resize error:', err);
    } finally {
      setLoading(false);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }

  function clear(e) {
    e.stopPropagation();
    setPreview(null);
    onImage?.(null, null);
  }

  if (compact && preview) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={preview}
          alt="preview"
          style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #1e1e2a' }}
        />
        <button
          onClick={clear}
          style={{
            position: 'absolute', top: -6, right: -6,
            background: '#ff5252', color: '#fff', border: 'none',
            borderRadius: '50%', width: 18, height: 18, cursor: 'pointer',
            fontSize: 12, lineHeight: '18px', textAlign: 'center', padding: 0,
          }}
        >×</button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {preview ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="preview"
            style={{
              maxHeight: 80,
              maxWidth: '100%',
              borderRadius: 10,
              border: '1px solid #1e1e2a',
              display: 'block',
            }}
          />
          <button
            onClick={clear}
            style={{
              position: 'absolute', top: -8, right: -8,
              background: '#ff5252', color: '#fff', border: 'none',
              borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
              fontSize: 14, lineHeight: '22px', textAlign: 'center', padding: 0,
            }}
          >×</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          style={{
            background: '#13131a',
            border: '1px dashed #3a3a4a',
            borderRadius: 10,
            padding: '8px 14px',
            color: '#7a7a8a',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>📷</span>
          {loading ? 'Processing...' : label}
        </button>
      )}
    </div>
  );
}
