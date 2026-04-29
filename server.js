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

    // 3. LOAD THE PHYSICAL FONT FILES
    // Make sure these match the exact file names in your folder!
    const bodyFontBytes = await fs.readFile("./ibm.ttf");
    const nameFontBytes = await fs.readFile("./NotoSerif-BoldItalic.ttf");

    // 4. EMBED THEM INTO THE PDF
    const bodyFont = await pdfDoc.embedFont(bodyFontBytes);
    const nameFont = await pdfDoc.embedFont(nameFontBytes);

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
