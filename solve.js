const fs = require('fs');

// Convert a number string from a given base to BigInt
function convertToBigInt(str, base) {
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 0n;
  for (let char of str.toLowerCase()) {
    const val = BigInt(digits.indexOf(char));
    result = result * BigInt(base) + val;
  }
  return result;
}

// Modular inverse using Extended Euclidean Algorithm
function modInverse(a, m) {
  let m0 = m, t, q;
  let x0 = 0n, x1 = 1n;
  if (m === 1n) return 0n;
  while (a > 1n) {
    q = a / m;
    t = m;
    m = a % m;
    a = t;
    t = x0;
    x0 = x1 - q * x0;
    x1 = t;
  }
  if (x1 < 0n) x1 += m0;
  return x1;
}

// Lagrange Interpolation at x = 0
function lagrangeInterpolation(shares, prime) {
  let secret = 0n;
  for (let i = 0; i < shares.length; i++) {
    let [xi, yi] = shares[i];
    xi = BigInt(xi);
    yi = BigInt(yi);
    let numerator = 1n;
    let denominator = 1n;
    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        let xj = BigInt(shares[j][0]);
        numerator = (numerator * -xj) % prime;
        denominator = (denominator * (xi - xj)) % prime;
      }
    }
    let term = yi * numerator * modInverse(denominator, prime);
    secret = (secret + term) % prime;
  }
  return (secret + prime) % prime;
}

// Parse JSON and return shares as [[x, y], ...]
function parseShares(jsonData) {
  const { n, k } = jsonData.keys;
  const shares = [];
  for (let key in jsonData) {
    if (key === 'keys') continue;
    const x = BigInt(key);
    const base = parseInt(jsonData[key].base);
    const y = convertToBigInt(jsonData[key].value, base);
    shares.push([x, y]);
  }
  return { shares, k };
}

// Generate all combinations of k from array
function combinations(arr, k) {
  const result = [];
  const comb = (start, path) => {
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      comb(i + 1, [...path, arr[i]]);
    }
  };
  comb(0, []);
  return result;
}

function solveWithValidation(path) {
  const raw = fs.readFileSync(path);
  const json = JSON.parse(raw);
  const { shares, k } = parseShares(json);
  const PRIME = 2n ** 521n - 1n;

  const allComb = combinations(shares, k);
  const frequencyMap = {};
  const combinationSecrets = [];

  allComb.forEach((combo, idx) => {
    const secret = lagrangeInterpolation(combo, PRIME).toString();
    combinationSecrets.push({ combo, secret });
    frequencyMap[secret] = (frequencyMap[secret] || 0) + 1;
  });

  // Find most frequent secret
  let expectedSecret = null;
  let maxCount = 0;
  for (let secret in frequencyMap) {
    if (frequencyMap[secret] > maxCount) {
      expectedSecret = secret;
      maxCount = frequencyMap[secret];
    }
  }

  console.log(`\n File: ${path}`);
  console.log(` Expected Secret (Most Frequent): ${expectedSecret}\n`);

  console.log(" All Secret Calculations:");
  combinationSecrets.forEach(({ combo, secret }, i) => {
    const indexes = combo.map(([x]) => x.toString());
    const status = (secret === expectedSecret) ? "OK" : "WRONG";
    console.log(`${status} Combo ${indexes.join(", ")} -> Secret: ${secret}`);
  });

  // Identify wrong shares
  const correctCombos = combinationSecrets.filter(s => s.secret === expectedSecret);
  const correctIndices = new Set();
  correctCombos.forEach(({ combo }) => {
    combo.forEach(([x]) => correctIndices.add(x.toString()));
  });

  const allIndices = new Set(shares.map(([x]) => x.toString()));
  const wrongShares = [...allIndices].filter(x => !correctIndices.has(x));

  console.log(`\n Wrong Shares Detected (should be ignored): ${wrongShares.join(", ") || "None"}\n`);
  return expectedSecret;
}

// MAIN
const secret1 = solveWithValidation('test1.json');
const secret2 = solveWithValidation('test2.json');

console.log(`\n Final Secrets`);
console.log(`test1.json -> Secret: ${secret1}`);
console.log(`test2.json -> Secret: ${secret2}`);
