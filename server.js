const express = require("express");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit"); // 1. IMPORT FONTKIT
const fs = require("fs").promises;

const app = express();
const port = process.env.PORT || 3000;

app.get("/download-ticket", async (req, res) => {
  try {
    const { name, qty, block } = req.query;
    const templateBytes = await fs.readFile("./template.pdf");

    const pdfDoc = await PDFDocument.load(templateBytes);

    // 2. REGISTER FONTKIT BEFORE DOING ANYTHING ELSE
    pdfDoc.registerFontkit(fontkit);

    // 3. LOAD THE PHYSICAL NOTO SERIF FILE
    // Make sure this matches the exact file name in your folder!
    const fontBytes = await fs.readFile("./ibm.ttf");

    // 4. EMBED IT INTO THE PDF
    const notoFont = await pdfDoc.embedFont(fontBytes);

    const form = pdfDoc.getForm();

    if (name) {
      const nameField = form.getTextField("name");
      nameField.setText(name);
      nameField.setFontSize(20); // Set a hardcoded size here
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
    nudgeFieldUp("qty", 2.5);
    nudgeFieldUp("block", 2.5);

    // 5. FORCE ALL FIELDS TO USE NOTO SERIF
    // Good line (no curly braces!):
    form.updateFieldAppearances(notoFont);

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

app.listen(port, () => {
  console.log(`Server is running!`);
});
