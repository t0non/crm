const tls = require('node:tls');
if (tls && 'DEFAULT_ECDH_CURVE' in tls) {
  tls.DEFAULT_ECDH_CURVE = 'prime256v1:X25519';
}
