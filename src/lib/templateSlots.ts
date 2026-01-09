type SlotMap = Record<string, string>;

export function applySlots(html: string, slots: SlotMap) {
  let output = html;

  for (const key in slots) {
    output = output.replaceAll(`{{${key}}}`, slots[key]);
  }

  return output;
}
