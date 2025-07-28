const fs = require('fs');

function lagrangeInterpolation(points) {
    let secret = 0n;

    for (let i = 0; i < points.length; i++) {
        let xi = BigInt(points[i][0]);
        let yi = BigInt(points[i][1]);

        let num = 1n;
        let den = 1n;

        for (let j = 0; j < points.length; j++) {
            if (i !== j) {
                let xj = BigInt(points[j][0]);
                num *= -xj;
                den *= (xi - xj);
            }
        }

        let li = num / den;
        secret += yi * li;
    }

    return secret.toString();
}

function parseInput(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    const n = data.keys.n;
    const k = data.keys.k;

    let shares = [];

    for (let key in data) {
        if (key === "keys") continue;

        const x = parseInt(key);
        const base = parseInt(data[key].base);
        const valueStr = data[key].value;

        // Parse y using BigInt in the given base
        const y = BigInt(parseInt(valueStr, base));
        shares.push([x, y]);
    }

    return { k, shares };
}

function combinations(arr, k) {
    let result = [];
    const helper = (start, path) => {
        if (path.length === k) {
            result.push([...path]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            path.push(arr[i]);
            helper(i + 1, path);
            path.pop();
        }
    };
    helper(0, []);
    return result;
}

function solveSecret(filePath) {
    const { k, shares } = parseInput(filePath);
    const combos = combinations(shares, k);

    let secretsMap = new Map();

    for (let combo of combos) {
        try {
            const secret = lagrangeInterpolation(combo);
            if (!secretsMap.has(secret)) {
                secretsMap.set(secret, []);
            }
            secretsMap.get(secret).push(combo);
        } catch (err) {
            console.error("Error in interpolation:", err);
        }
    }

    let finalSecret = null;
    let maxCount = 0;

    for (let [secret, occur] of secretsMap.entries()) {
        if (occur.length > maxCount) {
            maxCount = occur.length;
            finalSecret = secret;
        }
    }

    return finalSecret;
}

// Run for both test cases
const secret1 = solveSecret('test1.json');
const secret2 = solveSecret('test2.json');

console.log("Secret from Testcase 1:", secret1);
console.log("Secret from Testcase 2:", secret2);
