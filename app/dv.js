function getMod11Dv(clave) {
  let sum = 0;
  let factor = 2;
  for (let i = clave.length - 1; i >= 0; i--) {
    sum += parseInt(clave[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return 0;
  if (mod === 10) return 1;
  return mod;
}

console.log("2025:", getMod11Dv("241220250717921035680012005001000209222040050011"));
console.log("2024:", getMod11Dv("241220240717921035680012005001000209222040050011"));
