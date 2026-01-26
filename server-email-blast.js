require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));

app.post('/send-blast', upload.fields([
  { name: 'csv' }, { name: 'logo' }, { name: 'product' }
]), async (req, res) => {
  try {
    const emails = [];
    const csvFilePath = req.files['csv'][0].path;

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', row => {
          const email = row[Object.keys(row)[0]];
          const receiveMarketing = row[Object.keys(row)[1]];
          if (email && receiveMarketing === '1' && email.includes('@')) {
            emails.push(email.trim());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (!emails.length) return res.send('No valid emails found.');

    const messageText = req.body.message || '';
    const logoPath = req.files['logo'][0].path;
    const productPath = req.files['product'][0].path;
    const productLink = req.body.productLink || null;




    const productFilename = path.basename(productPath);
    const productImageUrl = `${req.protocol}://${req.get('host')}/uploads/${productFilename}`;

    const productImageHtml = productLink
      ? `<a href="${productLink}" target="_blank"><img src="${productImageUrl}" style="max-width:100%;margin-top:10px;" /></a>`
      : `<img src="${productImageUrl}" style="max-width:100%;margin-top:10px;" />`;

  const html = `
<div style="text-align:center;max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">

  <p>
    <a href="https://hatteras-island.com/apparel/">APPAREL</a> |
    <a href="https://hatteras-island.com/rods/">RODS</a> |
    <a href="https://hatteras-island.com/reels/">REELS</a> |
    <a href="https://hatteras-island.com/tools/">TOOLS</a> |
    <a href="https://hatteras-island.com/gear/">GEAR</a>
  </p>

  <img src="cid:logo" style="max-width:200px;" />

  <h2 style="color:#0078a0;">${messageText}</h2>

  ${productImageHtml}

  <p>
    <a href="https://hatteras-island.com/apparel/">APPAREL</a> |
    <a href="https://hatteras-island.com/rods/">RODS</a> |
    <a href="https://hatteras-island.com/reels/">REELS</a> |
    <a href="https://hatteras-island.com/tools/">TOOLS</a> |
    <a href="https://hatteras-island.com/gear/">GEAR</a>
  </p>


  <p style="font-size:12px;color:#777;margin-top:20px;">
    You're receiving this because you opted in at Frank & Fran's.<br>
    <a href="https://hatteras-island.com/fresh-bait-alert-sign-up/">Unsubscribe</a>
  </p>
</div>
`;


    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

   const useCurrentSubject = req.body.useCurrentSubject === 'on';
const customSubject = (req.body.customSubject || '').trim();

const subjectLine = useCurrentSubject || !customSubject
  ? "Frank & Fran's Fresh Bait Alert"
  : customSubject;

await transporter.sendMail({
  from: process.env.MAIL_FROM,
  bcc: emails,
  subject: subjectLine,
  html,
  attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logo' }]
});


    res.send(`Email sent to ${emails.length} recipients`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed');
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
