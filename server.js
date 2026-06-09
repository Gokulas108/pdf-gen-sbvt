const express = require("express");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit"); // 1. IMPORT FONTKIT
const fs = require("fs").promises;

const app = express();
const port = process.env.PORT || 3000;

app.get("/download-ticket", async (req, res) => {
  try {
    const { name, qty, block, serial } = req.query;
    const templateBytes = await fs.readFile("./template.pdf");

    const pdfDoc = await PDFDocument.load(templateBytes);

    // 2. REGISTER FONTKIT BEFORE DOING ANYTHING ELSE
    pdfDoc.registerFontkit(fontkit);

    // 3. LOAD THE PHYSICAL FONT FILES
    // Make sure these match the exact file names in your folder!
    const bodyFontBytes = await fs.readFile("./ibm.ttf");
    const nameFontBytes = await fs.readFile("./NotoSerif-BoldItalic.ttf");
    const serialFontBytes = await fs.readFile(
      "./NotoSerif-VariableFont_wdth,wght.ttf",
    );

    // 4. EMBED THEM INTO THE PDF
    const bodyFont = await pdfDoc.embedFont(bodyFontBytes);
    const nameFont = await pdfDoc.embedFont(nameFontBytes);
    const serialFont = await pdfDoc.embedFont(serialFontBytes);

    const form = pdfDoc.getForm();

    if (name) {
      const nameField = form.getTextField("name");
      nameField.setText(name);
      nameField.setFontSize(28);
    }

    if (qty) {
      const qtyField = form.getTextField("qty");
      qtyField.setText(qty);
      qtyField.setFontSize(21);
    }

    if (block) {
      const blockField = form.getTextField("block");
      blockField.setText(block);
      blockField.setFontSize(21);
    }

    if (serial) {
      const serialField = form.getTextField("serial");
      serialField.setText(serial);
      serialField.setFontSize(10);
    }

    const nudgeFieldUp = (fieldName, pixels) => {
      try {
        const field = form.getTextField(fieldName);
        // Get the physical rectangle drawn on the page
        const widget = field.acroField.getWidgets()[0];
        const rect = widget.getRectangle();

        // Redraw the rectangle slightly higher (y + pixels)
        widget.setRectangle({
          x: rect.x,
          y: rect.y + pixels,
          width: rect.width,
          height: rect.height,
        });
      } catch (e) {
        // Ignore if field doesn't exist
      }
    };

    // Nudge qty and block UP by 1.5 pixels (adjust this number until it's perfect!)
    nudgeFieldUp("qty", 0.8);
    nudgeFieldUp("block", 2.5);

    // 5. FORCE ALL FIELDS TO USE NOTO SERIF
    // Good line (no curly braces!):
    form.updateFieldAppearances(bodyFont);

    // Apply Noto Bold Italic to name, qty, and block
    if (name) {
      form.getTextField("name").updateAppearances(nameFont);
    }
    if (qty) {
      form.getTextField("qty").updateAppearances(nameFont);
    }
    if (block) {
      form.getTextField("block").updateAppearances(nameFont);
    }
    if (serial) {
      form.getTextField("serial").updateAppearances(serialFont);
    }

    // Now flatten!
    form.flatten();

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    // Change "attachment" to "inline"
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="WoL-Certificate.pdf"',
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    // If it crashes, this will print the EXACT reason in your terminal
    console.error("PDF GENERATION FAILED:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

app.get("/generate-reciept", async (req, res) => {
  try {
    const {
      receipt_no,
      receipt_date,
      legal_name,
      address,
      pincode,
      phone_no,
      email,
      payment_reference,
      pan_no,
      payment_date,
      amount,
      amount_in_words,
      mode_of_payment,
      notes,
    } = req.query;

    const templateBytes = await fs.readFile("./receipt.pdf");
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    const bodyFontBytes = await fs.readFile("./ibm.ttf");
    const legalNameFontBytes = await fs.readFile("./NotoSerif-BoldItalic.ttf");
    const bodyFont = await pdfDoc.embedFont(bodyFontBytes);
    const legalNameFont = await pdfDoc.embedFont(legalNameFontBytes);

    const form = pdfDoc.getForm();

    if (receipt_no) form.getTextField("receipt_no").setText(receipt_no);
    if (receipt_date) form.getTextField("receipt_date").setText(receipt_date);
    if (legal_name) form.getTextField("legal_name").setText(legal_name);
    if (address) form.getTextField("address").setText(address);
    if (pincode) form.getTextField("pincode").setText(pincode);
    if (phone_no) form.getTextField("phone_no").setText(phone_no);
    if (email) form.getTextField("email").setText(email);
    if (payment_reference)
      form.getTextField("payment_reference").setText(payment_reference);
    if (pan_no) form.getTextField("pan_no").setText(pan_no);
    if (payment_date) form.getTextField("payment_date").setText(payment_date);
    if (amount) form.getTextField("amount").setText(`₹${amount}/-`);
    if (amount_in_words) {
      const amountInWordsField = form.getTextField("amount_in_words");
      amountInWordsField.setText(amount_in_words);
      amountInWordsField.setFontSize(14);
    }
    if (mode_of_payment)
      form.getTextField("mode_of_payment").setText(mode_of_payment);
    form.getTextField("notes").setText(notes || "Wall Of Legacy Campaign");

    const nudgeFieldUp = (fieldName, pixels) => {
      try {
        const field = form.getTextField(fieldName);
        const widget = field.acroField.getWidgets()[0];
        const rect = widget.getRectangle();

        widget.setRectangle({
          x: rect.x,
          y: rect.y + pixels,
          width: rect.width,
          height: rect.height,
        });
      } catch (e) {
        // Ignore if field doesn't exist
      }
    };

    const nudgeFields = [
      "receipt_no",
      "receipt_date",
      "legal_name",
      "address",
      "pincode",
      "phone_no",
      "email",
      "payment_reference",
      "pan_no",
      "payment_date",
      "amount",
      "amount_in_words",
      "mode_of_payment",
      "notes",
    ];
    nudgeFields.forEach((fieldName) => {
      let pixels = -2;
      if (fieldName === "amount") pixels = 2;
      else if (fieldName === "amount_in_words") pixels = 1;
      else if (fieldName === "address") pixels = 0;
      nudgeFieldUp(fieldName, pixels);
    });

    form.updateFieldAppearances(bodyFont);
    if (legal_name) {
      form.getTextField("legal_name").updateAppearances(legalNameFont);
    }
    form.flatten();

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="WoL-Receipt.pdf"',
    );
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("RECEIPT GENERATION FAILED:", error);
    res.status(500).json({ error: "Failed to generate receipt PDF" });
  }
});

app.listen(port, () => {
  console.log(`Server is running!`);
});
