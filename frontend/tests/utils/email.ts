export function generateTestEmail(): string {
  const randomPart = Math.random().toString(36).slice(2, 8); 
  const digit = Math.floor(Math.random() * 10);             
  const upper = String.fromCharCode(65 + Math.floor(Math.random() * 26)); 
  return `${upper}${randomPart}${digit}@example.com`;
}