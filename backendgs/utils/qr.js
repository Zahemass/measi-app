const QRCode = require("qrcode");

async function generateQRCode(data) {
  return await QRCode.toDataURL(data);
}

module.exports = generateQRCode;
