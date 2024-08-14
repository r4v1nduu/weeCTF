const base64 = require('base64-js');

function encode(username) {
  const encodedUsername = base64.fromByteArray(Buffer.from(username));
  return encodedUsername;
}

function decode(encodedUsername) {
  const decodedUsername = Buffer.from(base64.toByteArray(encodedUsername)).toString('utf-8');
  return decodedUsername;
}

module.exports = { encode, decode };
