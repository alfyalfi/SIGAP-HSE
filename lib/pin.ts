export const ADMIN_PIN_MIN = 6;
export const ADMIN_PIN_MAX = 8;

export function isValidAdminPin(pin: string) {
  return new RegExp(`^\\d{${ADMIN_PIN_MIN},${ADMIN_PIN_MAX}}$`).test(pin);
}
