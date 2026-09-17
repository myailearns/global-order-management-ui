import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BillTemplateConfiguration, BillTemplateField, BillTemplateSection } from './billing-template.models';

@Component({
  selector: 'gom-bill-preview',
  standalone: true,
  templateUrl: './bill-preview.component.html',
  styleUrl: './bill-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillPreviewComponent {
  readonly configuration = input.required<BillTemplateConfiguration>();
  readonly compact = input(false);
  readonly values = input<Record<string, string> | null>(null);
  readonly items = input<Array<Record<string, string>> | null>(null);

  readonly sampleValues: Record<string, string> = {
    'business.logoUrl': 'STORE',
    'business.name': 'ABC STORE',
    'business.address': '123 MG Road, Hyderabad',
    'business.phone': '+91 98765 43210',
    'business.email': 'billing@example.com',
    'business.gstin': '36ABCDE1234F1Z5',
    'order.orderNo': 'INV-1025',
    'order.date': '05/09/2026',
    'order.time': '2:35 PM',
    'order.cashier': 'Cashier 01',
    'order.type': 'In-Store',
    'order.channel': 'Shop Counter',
    'order.notes': 'Handle with care',
    'customer.name': 'Sample Customer',
    'customer.phone': '91234 56789',
    'customer.email': 'customer@example.com',
    'customer.address': 'Madhapur, Hyderabad',
    'customer.gstin': '36ABCDE9876G1Z2',
    'delivery.address': 'Plot 12, Madhapur, Hyderabad',
    'delivery.landmark': 'Near Metro Station',
    'delivery.phone': '91234 56789',
    'delivery.instructions': 'Call on arrival',
    'totals.subtotal': '₹625.00',
    'totals.discount': '-₹25.00',
    'totals.tax': '₹30.00',
    'totals.taxSummary': 'CGST ₹15 · SGST ₹15',
    'totals.deliveryCharge': '₹20.00',
    'totals.grandTotal': '₹650.00',
    'payment.method': 'UPI',
    'payment.amountReceived': '₹650.00',
    'payment.change': '₹0.00',
    'footer.thankYouMessage': 'Thank you! Visit again.',
    'footer.notes': 'This is a sample preview.',
    'footer.returnPolicy': 'Returns accepted as per store policy.',
  };

  readonly sampleItems = [
    { name: 'Basmati Rice', hsnSac: '1006', quantity: '2', unit: 'kg', price: '₹240', discount: '₹10', taxableValue: '₹470', cgst: '₹12', sgst: '₹12', igst: '—', tax: '₹24', amount: '₹480' },
    { name: 'Sunflower Oil', hsnSac: '1512', quantity: '1', unit: 'L', price: '₹170', discount: '₹15', taxableValue: '₹145', cgst: '₹3', sgst: '₹3', igst: '—', tax: '₹6', amount: '₹150' },
  ];

  get previewItems(): Array<Record<string, string>> {
    const provided = this.items();
    return Array.isArray(provided) && provided.length ? provided : this.sampleItems;
  }

  visibleSections(): BillTemplateSection[] {
    return [...this.configuration().sections].filter((section) => section.visible).sort((a, b) => a.order - b.order);
  }

  visibleFields(section: BillTemplateSection): BillTemplateField[] {
    return section.fields.filter((field) => field.visible);
  }

  valueFor(field: BillTemplateField): string {
    const providedValues = this.values();
    if (providedValues && typeof providedValues === 'object') {
      const custom = providedValues[field.source];
      if (typeof custom === 'string' && custom.trim()) {
        return custom;
      }
    }

    if (field.source === 'footer.thankYouMessage') return this.configuration().footer.thankYouMessage;
    if (field.source === 'footer.notes') return this.configuration().footer.notes;
    if (field.source === 'footer.returnPolicy') return this.configuration().footer.returnPolicy;
    return this.sampleValues[field.source] || '—';
  }

  itemValue(item: Record<string, string>, field: BillTemplateField): string {
    const key = field.source.replace('items.', '');
    return item[key] || '—';
  }

  logoUrlFor(field: BillTemplateField): string | null {
    const value = String(this.valueFor(field) || '').trim();
    if (!value || value === '—' || value.toUpperCase() === 'STORE') {
      return null;
    }
    return value;
  }

  logoFallbackText(): string {
    const providedValues = this.values();
    const name = String(providedValues?.['business.name'] || this.sampleValues['business.name'] || 'STORE').trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
    return initials || 'ST';
  }
}
