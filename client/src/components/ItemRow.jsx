import { useWatch, useController } from 'react-hook-form';
import { Trash2, Upload, X, ImageIcon } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import useSettingsStore from '../store/settingsStore';

const CATEGORIES = ['Cake', 'Flower', 'Gifts', 'Plant', 'Chocolate', 'Combo'];

// Static fallbacks — overridden at runtime by dynamic settings from DB
const CATEGORY_FIELDS_BASE = {
  Cake: [
    { key: 'flavor', label: 'Flavor', type: 'select', dynamicKey: 'cake_flavors', options: ['Chocolate', 'Vanilla', 'Red Velvet', 'Butterscotch', 'Strawberry', 'Black Forest', 'Mango', 'Pineapple', 'Custom'] },
    { key: 'size',   label: 'Weight / Size', type: 'select', dynamicKey: 'cake_sizes', options: ['0.5 kg', '1 kg', '1.5 kg', '2 kg', '3 kg', '4 kg', 'Custom'] },
    { key: 'shape',  label: 'Shape', type: 'select', options: ['Round', 'Square', 'Heart', 'Number', 'Custom'] },
    { key: 'layers', label: 'Layers', type: 'select', options: ['1 Layer', '2 Layers', '3 Layers'] },
    { key: 'cakeMessage', label: 'Message on Cake', type: 'text', placeholder: 'e.g. Happy Birthday Sita!' },
    { key: 'theme',  label: 'Color / Theme', type: 'text', placeholder: 'e.g. Pink floral, superhero' },
  ],
  Flower: [
    { key: 'arrangement', label: 'Arrangement', type: 'select', options: ['Bouquet', 'Basket', 'Vase', 'Hand-tied', 'Garland', 'Box'] },
    { key: 'flowerType',  label: 'Flower Type', type: 'select', dynamicKey: 'flower_types', options: ['Red Roses', 'Mixed Flowers', 'Sunflowers', 'Lilies', 'Orchids', 'Tulips'] },
    { key: 'stems',       label: 'No. of Stems', type: 'select', options: ['6', '12', '18', '24', '50', '100', 'Custom'] },
    { key: 'color',       label: 'Color', type: 'text', placeholder: 'e.g. Red, Pink, White' },
    { key: 'includesVase', label: 'Includes Vase?', type: 'select', options: ['No', 'Yes'] },
  ],
  Gifts: [
    { key: 'giftType',    label: 'Gift Type', type: 'select', dynamicKey: 'gift_types', options: ['Teddy Bear', 'Photo Frame', 'Mug', 'Cushion', 'Jewelry', 'Perfume', 'Watch', 'Wallet', 'Hamper', 'Custom'] },
    { key: 'size',        label: 'Size', type: 'select', options: ['Small', 'Medium', 'Large', 'Extra Large'] },
    { key: 'wrapping',    label: 'Gift Wrapping', type: 'select', options: ['Yes', 'No'] },
    { key: 'giftMessage', label: 'Personalization / Message', type: 'text', placeholder: 'e.g. With love, Rabin' },
  ],
  Plant: [
    { key: 'plantType', label: 'Plant Type', type: 'select', options: ['Indoor', 'Outdoor', 'Succulent', 'Bonsai', 'Flowering', 'Air Plant', 'Custom'] },
    { key: 'name_hint', label: 'Plant Name', type: 'text', placeholder: 'e.g. Money Plant, Peace Lily' },
    { key: 'potSize',   label: 'Pot Size', type: 'select', options: ['Small (4")', 'Medium (6")', 'Large (8")', 'Extra Large (12"+)'] },
    { key: 'potType',   label: 'Pot Type', type: 'select', options: ['Ceramic', 'Terracotta', 'Plastic', 'Metal', 'Basket'] },
  ],
  Chocolate: [
    { key: 'brand',    label: 'Brand', type: 'select', options: ['Cadbury', 'Ferrero Rocher', 'Lindt', 'KitKat', 'Toblerone', 'Snickers', 'Local / Handmade', 'Custom'] },
    { key: 'boxType',  label: 'Box / Packaging', type: 'select', options: ['Heart Box', 'Regular Box', 'Hamper Basket', 'Bouquet', 'Loose'] },
    { key: 'quantity', label: 'Quantity / Weight', type: 'text', placeholder: 'e.g. 12 pieces, 500g' },
    { key: 'flavor',   label: 'Flavor', type: 'text', placeholder: 'e.g. Dark, Milk, Hazelnut' },
  ],
  Combo: [
    { key: 'arrangement', label: 'Combo Description', type: 'text', placeholder: 'e.g. Cake + Roses + Teddy Bear' },
    { key: 'theme',       label: 'Theme / Occasion', type: 'text', placeholder: 'e.g. Birthday, Anniversary' },
    { key: 'flavor',      label: 'Cake Flavor (if included)', type: 'text', placeholder: 'e.g. Chocolate' },
    { key: 'size',        label: 'Cake Size (if included)', type: 'text', placeholder: 'e.g. 1 kg' },
  ],
};

function CategoryField({ fieldDef, index, register, dynamicOptions }) {
  const name = fieldDef.key === 'name_hint' ? `items.${index}.name` : `items.${index}.${fieldDef.key}`;
  const options = (fieldDef.dynamicKey && dynamicOptions?.[fieldDef.dynamicKey]) || fieldDef.options || [];

  if (fieldDef.type === 'select') {
    return (
      <div>
        <label className="label">{fieldDef.label}</label>
        <select className="input" {...register(name)}>
          <option value="">Select</option>
          {options.map((o) => <option key={o}>{o}</option>)}
          {!options.includes('Custom') && <option>Custom</option>}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="label">{fieldDef.label}</label>
      <input className="input" placeholder={fieldDef.placeholder} {...register(name)} />
    </div>
  );
}

// Uses useController so it is a proper RHF-registered field — value always included in handleSubmit
function ReferenceImageUpload({ index, control }) {
  const [uploading, setUploading] = useState(false);

  const { field } = useController({
    name: `items.${index}.referenceImages`,
    control,
    defaultValue: [],
  });

  const urls = field.value || [];

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      const { data } = await api.post('/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      field.onChange([...urls, data.url]);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function remove(i) {
    field.onChange(urls.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="label flex items-center gap-1.5"><ImageIcon size={13} /> Reference Images</label>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={i} className="relative w-16 h-16 group">
            <img
              src={url.includes('cloudinary.com') ? url.replace('/upload/', '/upload/w_120,h_120,c_fill/') : url}
              alt=""
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} />
            </button>
          </div>
        ))}
        <label className={`w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 mt-0.5">{uploading ? '...' : 'Add'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}

export default function ItemRow({ index, control, register, errors, remove }) {
  const category = useWatch({ control, name: `items.${index}.category` });
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => { fetchSettings(); }, []);

  // Build dynamic options map: { cake_flavors: [...], delivery_cities: [...], ... }
  const dynamicOptions = Object.fromEntries(
    Object.entries(settings).map(([k, v]) => [k, v.values])
  );

  const fields = CATEGORY_FIELDS_BASE[category] || [];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-gray-700">Item {index + 1}</span>
        <button type="button" onClick={remove} className="text-red-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Category</label>
          <select className="input" {...register(`items.${index}.category`)}>
            <option value="">Select category</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {!fields.find((f) => f.key === 'name_hint') && (
          <div>
            <label className="label">
              {category === 'Cake' ? 'Cake Name' :
               category === 'Flower' ? 'Bouquet / Arrangement Name' :
               category === 'Gifts' ? 'Gift Name' :
               category === 'Chocolate' ? 'Chocolate Name' :
               category === 'Combo' ? 'Combo Name' : 'Item Name'} *
            </label>
            <input
              className="input"
              placeholder={
                category === 'Cake' ? 'e.g. Chocolate Truffle Cake' :
                category === 'Flower' ? 'e.g. Red Rose Bouquet' :
                category === 'Gifts' ? 'e.g. Giant Teddy Bear' :
                category === 'Chocolate' ? 'e.g. Ferrero Rocher Box' :
                category === 'Combo' ? 'e.g. Birthday Combo Pack' : 'Item name'
              }
              {...register(`items.${index}.name`)}
            />
            {errors?.items?.[index]?.name && (
              <p className="text-red-500 text-xs mt-1">{errors.items[index].name.message}</p>
            )}
          </div>
        )}
      </div>

      {category && fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {fields.map((fd) => (
            <CategoryField key={fd.key} fieldDef={fd} index={index} register={register} dynamicOptions={dynamicOptions} />
          ))}
        </div>
      )}

      {!category && (
        <p className="text-sm text-gray-400 italic mb-3">Select a category to see relevant fields.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">Price (NPR) *</label>
          <input type="number" min="0" className="input" placeholder="0" {...register(`items.${index}.price`)} />
          {errors?.items?.[index]?.price && (
            <p className="text-red-500 text-xs mt-1">{errors.items[index].price.message}</p>
          )}
        </div>
        <div>
          <label className="label">Special Instructions</label>
          <input className="input" placeholder="Any extra notes for this item" {...register(`items.${index}.specialNote`)} />
        </div>
      </div>

      <ReferenceImageUpload index={index} control={control} />
    </div>
  );
}
