import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ArrowLeft, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { orderSchema } from '../lib/validators';
import useOrderStore from '../store/orderStore';
import useOutletStore from '../store/outletStore';
import useSettingsStore from '../store/settingsStore';
import ItemRow from '../components/ItemRow';
import DeliverySlotPicker from '../components/DeliverySlotPicker';

const CHANNELS = ['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call'];
const METHODS  = ['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR'];

function orderToFormValues(order) {
  return {
    sender: {
      name:     order.sender?.name     || '',
      phone:    order.sender?.phone    || '',
      socialId: order.sender?.socialId || '',
      channel:  order.sender?.channel  || 'Instagram',
    },
    items: (order.items || []).map((item) => ({
      category:       item.category       || '',
      name:           item.name           || '',
      price:          item.price          ?? 0,
      flavor:         item.flavor         || '',
      size:           item.size           || '',
      shape:          item.shape          || '',
      layers:         item.layers         || '',
      cakeMessage:    item.cakeMessage    || '',
      theme:          item.theme          || '',
      arrangement:    item.arrangement    || '',
      flowerType:     item.flowerType     || '',
      stems:          item.stems          || '',
      color:          item.color          || '',
      includesVase:   item.includesVase   || '',
      giftType:       item.giftType       || '',
      wrapping:       item.wrapping       || '',
      giftMessage:    item.giftMessage    || '',
      plantType:      item.plantType      || '',
      potSize:        item.potSize        || '',
      potType:        item.potType        || '',
      brand:          item.brand          || '',
      boxType:        item.boxType        || '',
      quantity:       item.quantity       || '',
      specialNote:    item.specialNote    || '',
      referenceImages: Array.isArray(item.referenceImages) ? item.referenceImages : [],
    })),
    payment: {
      advance: order.payment?.advance ?? 0,
      method:  order.payment?.method  || '',
    },
    receiver: {
      name:     order.receiver?.name     || '',
      phone:    order.receiver?.phone    || '',
      city:     order.receiver?.city     || '',
      landmark: order.receiver?.landmark || '',
    },
    delivery: {
      date:    order.delivery?.date ? dayjs(order.delivery.date).format('YYYY-MM-DD') : '',
      slot:    order.delivery?.slot    || 'Anytime',
      partner: order.delivery?.partner || '',
      notes:   order.delivery?.notes   || '',
    },
    outlet: order.outlet?._id || order.outlet || '',
    note:   order.note || '',
  };
}

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOrder, updateOrder } = useOrderStore();
  const { outlets, loaded, fetchOutlets } = useOutletStore();
  const { fetchSettings, getValues } = useSettingsStore();
  const cities = getValues('delivery_cities', ['Birtamode', 'Damak', 'Dharan', 'Biratnagar', 'Itahari', 'Jhapa', 'Kathmandu', 'Other']);
  const [orderLoaded, setOrderLoaded] = useState(false);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      sender:   { channel: 'Instagram' },
      items:    [{ category: 'Cake', name: '', price: 0, referenceImages: [] }],
      payment:  { advance: 0 },
      receiver: {},
      delivery: { slot: 'Anytime' },
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items   = useWatch({ control, name: 'items' }) || [];
  const advance = useWatch({ control, name: 'payment.advance' }) || 0;
  const total   = items.reduce((s, i) => s + (Number(i?.price) || 0), 0);
  const due     = total - Number(advance);

  useEffect(() => {
    if (!loaded) fetchOutlets();
    fetchSettings();
    fetchOrder(id).then((order) => {
      if (order) {
        reset(orderToFormValues(order));
        setOrderLoaded(true);
      }
    });
  }, [id]);

  async function onSubmit(data) {
    try {
      const res = await updateOrder(id, data);
      if (res.success) {
        toast.success('Order updated');
        navigate(`/orders/${id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  }

  if (!orderLoaded) {
    return <div className="p-6 text-gray-400">Loading order...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/orders/${id}`)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Edit Order</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Sender */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Sender (Customer)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" {...register('sender.name')} />
              {errors.sender?.name && <p className="text-red-500 text-xs mt-1">{errors.sender.name.message}</p>}
            </div>
            <div>
              <label className="label">Phone * (97/98XXXXXXXX)</label>
              <input className="input" {...register('sender.phone')} />
              {errors.sender?.phone && <p className="text-red-500 text-xs mt-1">{errors.sender.phone.message}</p>}
            </div>
            <div>
              <label className="label">Social ID (@handle)</label>
              <input className="input" {...register('sender.socialId')} />
            </div>
            <div>
              <label className="label">Order Channel *</label>
              <select className="input" {...register('sender.channel')}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
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
          <h2 className="font-semibold text-lg mb-4">Receiver</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Receiver Name *</label>
              <input className="input" {...register('receiver.name')} />
              {errors.receiver?.name && <p className="text-red-500 text-xs mt-1">{errors.receiver.name.message}</p>}
            </div>
            <div>
              <label className="label">Receiver Phone *</label>
              <input className="input" {...register('receiver.phone')} />
              {errors.receiver?.phone && <p className="text-red-500 text-xs mt-1">{errors.receiver.phone.message}</p>}
            </div>
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
              <input className="input" {...register('receiver.landmark')} />
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">Delivery</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Delivery Date *</label>
              <input type="date" className="input" {...register('delivery.date')} />
              {errors.delivery?.date && <p className="text-red-500 text-xs mt-1">{errors.delivery.date.message}</p>}
            </div>
            <div>
              <label className="label">Delivery Partner / City</label>
              <input className="input" {...register('delivery.partner')} />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Time Slot</label>
            <DeliverySlotPicker
              value={watch('delivery.slot')}
              onChange={(v) => setValue('delivery.slot', v)}
            />
          </div>
          <div>
            <label className="label">Delivery Notes</label>
            <textarea className="input" rows={2} {...register('delivery.notes')} />
          </div>
        </div>

        {/* Outlet Assignment */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-brand-500" />
            <h2 className="font-semibold text-lg">Assign to Outlet</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[{ _id: '', name: 'Unassigned', city: 'Assign later' }, ...outlets.filter((o) => o.isActive)].map((outlet) => (
              <button
                key={outlet._id}
                type="button"
                onClick={() => setValue('outlet', outlet._id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors flex items-center gap-3 ${
                  watch('outlet') === outlet._id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  watch('outlet') === outlet._id ? 'border-brand-500' : 'border-gray-300'
                }`}>
                  {watch('outlet') === outlet._id && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{outlet.name}</div>
                  <div className="text-xs text-gray-400">{outlet.city}</div>
                </div>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('outlet')} />
        </div>

        {/* Internal Note */}
        <div className="card">
          <label className="label">Internal Note</label>
          <textarea className="input" rows={2} {...register('note')} />
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(`/orders/${id}`)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[140px]">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
