export function generateTestEmail() {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  return `Test${id}@example.com`;
}