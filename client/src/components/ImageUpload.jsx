import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ImageUpload({ urls = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      const { data } = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange([...urls, data.url]);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(idx) {
    onChange(urls.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url, i) => (
          <div key={i} className="relative w-20 h-20">
            <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => removeUrl(i)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <label className={`w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={18} className="text-gray-400" />
          <span className="text-xs text-gray-400 mt-1">{uploading ? 'Uploading...' : 'Upload'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}
