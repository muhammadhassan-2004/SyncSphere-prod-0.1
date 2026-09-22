const fs = require('fs');
const { createCanvas } = require('canvas');

try {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');

  // Draw vibrant gradient background
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, '#06b6d4');
  grad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Draw avatar graphic symbol
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(200, 160, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(200, 360, 130, 0, Math.PI * 2);
  ctx.fill();

  const buffer = canvas.toBuffer('image/jpeg');
  fs.writeFileSync('test_avatar.jpg', buffer);
  console.log('Created test_avatar.jpg successfully, size:', buffer.length);
} catch (e) {
  console.log('Canvas module not found, creating raw PPM/JPG or writing test image buffer');
}
