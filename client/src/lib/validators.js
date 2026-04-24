import { z } from 'zod';

const phoneRegex = /^(97|98)\d{8}$/;

export const orderSchema = z.object({
  sender: z.object({
    name:     z.string().min(1, 'Name required'),
    phone:    z.string().regex(phoneRegex, 'Enter valid Nepal mobile (97/98XXXXXXXX)'),
    socialId: z.string().optional(),
    channel:  z.enum(['Instagram', 'Facebook', 'WhatsApp', 'Website', 'Walk-in', 'Phone Call']),
  }),
  items: z.array(z.object({
    category:       z.string().optional(),
    name:           z.string().min(1, 'Item name required'),
    price:          z.coerce.number().min(0, 'Price must be positive'),
    // Cake
    flavor:         z.string().optional(),
    size:           z.string().optional(),
    shape:          z.string().optional(),
    layers:         z.string().optional(),
    cakeMessage:    z.string().optional(),
    theme:          z.string().optional(),
    // Flower
    arrangement:    z.string().optional(),
    flowerType:     z.string().optional(),
    stems:          z.string().optional(),
    color:          z.string().optional(),
    includesVase:   z.string().optional(),
    // Gifts
    giftType:       z.string().optional(),
    wrapping:       z.string().optional(),
    giftMessage:    z.string().optional(),
    // Plant
    plantType:      z.string().optional(),
    potSize:        z.string().optional(),
    potType:        z.string().optional(),
    // Chocolate
    brand:          z.string().optional(),
    boxType:        z.string().optional(),
    quantity:       z.string().optional(),
    // Shared
    specialNote:    z.string().optional(),
    referenceImages: z.array(z.string()).optional(),
  })).min(1, 'Add at least one item'),
  payment: z.object({
    advance: z.coerce.number().min(0).default(0),
    method:  z.enum(['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR']).optional(),
    splits:  z.array(z.object({
      method: z.enum(['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'QR']),
      amount: z.coerce.number().min(1, 'Amount required'),
    })).optional(),
  }),
  fulfillmentType: z.enum(['delivery', 'pickup']).default('delivery'),
  receiver: z.object({
    name:     z.string().min(1, 'Receiver name required'),
    phone:    z.string().regex(phoneRegex, 'Enter valid Nepal mobile'),
    city:     z.string().optional(),
    landmark: z.string().optional(),
  }),
  delivery: z.object({
    date:    z.string().min(1, 'Delivery date required'),
    slot:    z.enum(['7AM–10AM', '10AM–1PM', '1PM–4PM', '4PM–7PM', '7PM–9PM', 'Anytime']).optional(),
    partner: z.string().optional(),
    notes:   z.string().optional(),
  }),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.fulfillmentType !== 'pickup' && !data.receiver?.city) {
    ctx.addIssue({ code: 'custom', path: ['receiver', 'city'], message: 'City required for delivery' });
  }
});
