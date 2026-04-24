import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ArrowLeft, Store, Truck, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderSchema } from '../lib/validators';
import useOrderStore from '../store/orderStore';
import useOutletStore from '../store/outletStore';
import useSettingsStore from '../store/settingsStore';
import ItemRow from '../components/ItemRow';
import DeliverySlotPicker from '../components/DeliverySlotPicker';
import api from '../lib/api';

const CHANNELS = ['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call'];
const METHODS  = ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'];

function OutletOption({ label, sublabel, selected, onClick, kitchen, prepArea }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3 transition-colors ${
        selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-brand-500' : 'border-gray-300'
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-brand-500" />}
        </div>
        <span className="font-medium text-gray-800">{label}</span>
        {sublabel && <span className="text-sm text-gray-400">· {sublabel}</span>}
      </div>
      {(kitchen || prepArea) && (
        <div className="ml-6 flex gap-4 mt-1">
          {kitchen?.responsible && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              🍳 Kitchen: {kitchen.responsible}
            </span>
          )}
          {prepArea?.responsible && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              📦 Prep: {prepArea.responsible}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { createOrder } = useOrderStore();
  const { outlets, loaded, fetchOutlets } = useOutletStore();
  const { fetchSettings, getValues } = useSettingsStore();
  const cities = getValues('delivery_cities', ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Other']);

  useEffect(() => { if (!loaded) fetchOutlets(); fetchSettings(); }, []);

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      fulfillmentType: 'delivery',
      sender:   { channel: 'Instagram' },
      items:    [{ category: 'Cake', name: '', price: 0, referenceImages: [] }],
      payment:  { advance: 0 },
      receiver: {},
      delivery: { slot: 'Anytime' },
    },
  });

  const fulfillmentType = watch('fulfillmentType');
  const isPickup = fulfillmentType === 'pickup';

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items   = useWatch({ control, name: 'items' }) || [];
  const advance = useWatch({ control, name: 'payment.advance' }) || 0;
  const total   = items.reduce((s, i) => s + (Number(i?.price) || 0), 0);
  const due     = total - Number(advance);

  async function onSubmit(data) {
    try {
      const res = await createOrder(data);
      if (res.success) {
        toast.success(`Order ${res.order.orderNumber} created!`);
        const sendWA = window.confirm(`Send WhatsApp confirmation to ${data.sender.name}?`);
        if (sendWA) {
          try { await api.post(`/orders/${res.order._id}/notify`); } catch {}
        }
        navigate(`/orders/${res.order._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">New Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Sender */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Sender (Customer)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" {...register('sender.name')} />
              {errors.sender?.name && <p className="text-red-500 text-xs mt-1">{errors.sender.name.message}</p>}
            </div>
            <div>
              <label className="label">Phone * (97/98XXXXXXXX)</label>
              <input className="input" placeholder="98XXXXXXXX" {...register('sender.phone')} />
              {errors.sender?.phone && <p className="text-red-500 text-xs mt-1">{errors.sender.phone.message}</p>}
            </div>
            <div>
              <label className="label">Social ID (@handle)</label>
              <input className="input" placeholder="@username" {...register('sender.socialId')} />
            </div>
            <div>
              <label className="label">Order Channel *</label>
              <select className="input" {...register('sender.channel')}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Fulfillment Type */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Fulfillment</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('fulfillmentType', 'delivery', { shouldValidate: true })}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                !isPickup ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!isPickup ? 'border-brand-500' : 'border-gray-300'}`}>
                {!isPickup && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
              </div>
              <Truck size={18} className={!isPickup ? 'text-brand-500' : 'text-gray-400'} />
              <div className="text-left">
                <p className={`font-semibold text-sm ${!isPickup ? 'text-brand-700' : 'text-gray-600'}`}>Delivery</p>
                <p className="text-xs text-gray-400">Send to customer</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setValue('fulfillmentType', 'pickup', { shouldValidate: true })}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                isPickup ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isPickup ? 'border-brand-500' : 'border-gray-300'}`}>
                {isPickup && <div className="w-2.5 h-2.5 rounded-full bg-brand-500" />}
              </div>
              <ShoppingBag size={18} className={isPickup ? 'text-brand-500' : 'text-gray-400'} />
              <div className="text-left">
                <p className={`font-semibold text-sm ${isPickup ? 'text-brand-700' : 'text-gray-600'}`}>Store Pickup</p>
                <p className="text-xs text-gray-400">Customer collects</p>
              </div>
            </button>
          </div>
          <input type="hidden" {...register('fulfillmentType')} />
        </div>

        {/* Items */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Items</h2>
          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              remove={() => remove(index)}
            />
          ))}
          <button
            type="button"
            onClick={() => append({ category: 'Cake', name: '', price: 0, referenceImages: [] })}
            className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
          >
            <Plus size={16} /> Add Item
          </button>
          <div className="mt-4 text-right text-lg font-bold">
            Total: NPR {total.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Payment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Total (NPR)</label>
              <input className="input bg-gray-50" value={total.toLocaleString('en-IN')} readOnly />
            </div>
            <div>
              <label className="label">Advance Paid (NPR)</label>
              <input type="number" min="0" className="input" {...register('payment.advance')} />
            </div>
            <div>
              <label className="label">Due on Delivery (NPR)</label>
              <input className="input bg-gray-50" value={due.toLocaleString('en-IN')} readOnly />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" {...register('payment.method')}>
                <option value="">Select</option>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Receiver */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">{isPickup ? 'Pickup Person' : 'Receiver'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{isPickup ? 'Pickup Person Name *' : 'Receiver Name *'}</label>
              <input className="input" {...register('receiver.name')} />
              {errors.receiver?.name && <p className="text-red-500 text-xs mt-1">{errors.receiver.name.message}</p>}
            </div>
            <div>
              <label className="label">{isPickup ? 'Pickup Person Phone *' : 'Receiver Phone *'}</label>
              <input className="input" placeholder="98XXXXXXXX" {...register('receiver.phone')} />
              {errors.receiver?.phone && <p className="text-red-500 text-xs mt-1">{errors.receiver.phone.message}</p>}
            </div>
            {!isPickup && (
              <>
                <div>
                  <label className="label">City *</label>
                  <select className="input" {...register('receiver.city')}>
                    <option value="">Select city</option>
                    {cities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  {errors.receiver?.city && <p className="text-red-500 text-xs mt-1">{errors.receiver.city.message}</p>}
                </div>
                <div>
                  <label className="label">Landmark</label>
                  <input className="input" placeholder="Near X, beside Y" {...register('receiver.landmark')} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delivery / Pickup Schedule */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">{isPickup ? 'Pickup Schedule' : 'Delivery'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">{isPickup ? 'Pickup Date *' : 'Delivery Date *'}</label>
              <input type="date" className="input" {...register('delivery.date')} />
              {errors.delivery?.date && <p className="text-red-500 text-xs mt-1">{errors.delivery.date.message}</p>}
            </div>
          </div>
          <div className="mb-4">
            <label className="label">{isPickup ? 'Pickup Time Slot' : 'Time Slot'}</label>
            <DeliverySlotPicker
              value={watch('delivery.slot')}
              onChange={(v) => setValue('delivery.slot', v)}
            />
          </div>
          <div>
            <label className="label">{isPickup ? 'Pickup Notes' : 'Delivery Notes'}</label>
            <textarea className="input" rows={2} placeholder={isPickup ? 'Any pickup instructions...' : 'Any special delivery instructions...'} {...register('delivery.notes')} />
          </div>
        </div>

        {/* Outlet Assignment */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-brand-500" />
            <h2 className="font-semibold text-lg">Assign to Outlet</h2>
          </div>
          {outlets.filter((o) => o.isActive).length === 0 ? (
            <p className="text-sm text-gray-400 italic">No active outlets. Add outlets in Settings first.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {/* Unassigned option */}
              <OutletOption
                label="Unassigned"
                sublabel="Assign later"
                value=""
                selected={!watch('outlet')}
                onClick={() => setValue('outlet', '')}
              />
              {outlets.filter((o) => o.isActive).map((outlet) => (
                <OutletOption
                  key={outlet._id}
                  label={outlet.name}
                  sublabel={outlet.city}
                  value={outlet._id}
                  selected={watch('outlet') === outlet._id}
                  onClick={() => setValue('outlet', outlet._id)}
                  kitchen={outlet.kitchen}
                  prepArea={outlet.prepArea}
                />
              ))}
            </div>
          )}
          <input type="hidden" {...register('outlet')} />
        </div>

        {/* Internal Note */}
        <div className="card">
          <label className="label">Internal Note</label>
          <textarea className="input" rows={2} placeholder="Staff-only notes..." {...register('note')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[140px]">
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
