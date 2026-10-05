// Genera el par de llaves RSA para firmar los JWT (RS256) y las imprime en base64,
// listas para pegarse en el archivo .env.
//   auth-service: JWT_PRIVATE_KEY y JWT_PUBLIC_KEY
//   demás servicios: solo JWT_PUBLIC_KEY
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const b64 = (pem) => Buffer.from(pem).toString('base64');

console.log(`JWT_PRIVATE_KEY=${b64(privateKey)}`);
console.log(`JWT_PUBLIC_KEY=${b64(publicKey)}`);
