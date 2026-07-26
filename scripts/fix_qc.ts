import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const factories = await prisma.factory.findMany();
  console.log(`Found ${factories.length} factories`);

  for (const factory of factories) {
    const existingTemplates = await prisma.qCTemplate.findMany({
      where: { factoryId: factory.id }
    });

    for (const temp of existingTemplates) {
      await prisma.qCTemplate.delete({ where: { id: temp.id } });
      console.log(`Deleted existing template ${temp.name} for ${factory.name}`);
    }

    console.log(`Creating comprehensive template for ${factory.name}...`);
    await prisma.qCTemplate.create({
      data: {
        factoryId: factory.id,
        name: "Standard Seat Cover Inspection",
        version: "1.0",
        isLatest: true,
        status: "active",
        sections: {
          create: [
            {
              factoryId: factory.id,
              title: "Order Verification",
              titleHi: "ऑर्डर सत्यापन (Order Verification)",
              sortOrder: 1,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Order Number Match", nameHi: "Order Number Match", instructions: "Does the order number match the production sheet?", instructionsHi: "Kya order number production sheet se match karta hai?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Vehicle Details", nameHi: "Vehicle Details", instructions: "Is the vehicle make, model, and year correct?", instructionsHi: "Kya vehicle ka make, model aur year sahi hai?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "Design Name", nameHi: "Design Name", instructions: "Is the design name correct?", instructionsHi: "Kya design name sahi hai?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "Color Combination", nameHi: "Color Combination", instructions: "Is the color combination correct?", instructionsHi: "Kya color combination sahi hai?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "Material Type", nameHi: "Material Type", instructions: "Is the material/leather type correct?", instructionsHi: "Kya material/leather type sahi hai?", requireImage: false, sortOrder: 5 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Product Quality",
              titleHi: "उत्पाद गुणवत्ता (Product Quality)",
              sortOrder: 2,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Stitching Straight", nameHi: "Stitching Straight", instructions: "Is the stitching straight?", instructionsHi: "Kya stitching seedhi hai?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Stitch Length Uniform", nameHi: "Stitch Length Uniform", instructions: "Is the stitch length uniform?", instructionsHi: "Kya stitch length barabar hai?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "Skipped Stitches", nameHi: "Skipped Stitches", instructions: "Are there any skipped stitches?", instructionsHi: "Kya koi stitch skip hui hai?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "Loose/Broken Threads", nameHi: "Loose/Broken Threads", instructions: "Are there any loose or broken threads?", instructionsHi: "Kya koi loose ya toota hua dhaga hai?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "Backstitching", nameHi: "Backstitching", instructions: "Is backstitching present?", instructionsHi: "Kya back stitch ki gayi hai?", requireImage: false, sortOrder: 5 },
                  { factoryId: factory.id, name: "Left/Right Symmetry", nameHi: "Left/Right Symmetry", instructions: "Are the left and right pieces symmetrical?", instructionsHi: "Kya left aur right piece same hain?", requireImage: false, sortOrder: 6 },
                  { factoryId: factory.id, name: "Material Scratches", nameHi: "Material Scratches", instructions: "Is the material free from scratches?", instructionsHi: "Kya material par scratch nahi hai?", requireImage: false, sortOrder: 7 },
                  { factoryId: factory.id, name: "Cuts or Holes", nameHi: "Cuts or Holes", instructions: "Is it free from cuts or holes?", instructionsHi: "Kya cut ya hole nahi hai?", requireImage: false, sortOrder: 8 },
                  { factoryId: factory.id, name: "Wrinkles", nameHi: "Wrinkles", instructions: "Is it free from wrinkles?", instructionsHi: "Kya wrinkles nahi hain?", requireImage: false, sortOrder: 9 },
                  { factoryId: factory.id, name: "Glue/Oil Marks", nameHi: "Glue/Oil Marks", instructions: "Is it free from glue or oil stains?", instructionsHi: "Kya glue ya oil ke marks nahi hain?", requireImage: false, sortOrder: 10 },
                  { factoryId: factory.id, name: "Color Consistency", nameHi: "Color Consistency", instructions: "Is the material color consistent?", instructionsHi: "Kya material ka color same hai?", requireImage: false, sortOrder: 11 },
                  { factoryId: factory.id, name: "Lamination Bubbles", nameHi: "Lamination Bubbles", instructions: "Is the lamination free from bubbles?", instructionsHi: "Kya lamination mein bubble nahi hai?", requireImage: false, sortOrder: 12 },
                  { factoryId: factory.id, name: "Lamination Peeling", nameHi: "Lamination Peeling", instructions: "Is there any peeling?", instructionsHi: "Kya lamination peel nahi ho rahi?", requireImage: false, sortOrder: 13 },
                  { factoryId: factory.id, name: "Required Padding", nameHi: "Required Padding", instructions: "Is all required padding present?", instructionsHi: "Kya saari required padding lagi hui hai?", requireImage: false, sortOrder: 14 },
                  { factoryId: factory.id, name: "Orthopedic Padding", nameHi: "Orthopedic Padding", instructions: "Is orthopedic padding correctly placed?", instructionsHi: "Kya orthopedic padding sahi jagah lagi hai?", requireImage: false, sortOrder: 15 },
                  { factoryId: factory.id, name: "Hard Lumps", nameHi: "Hard Lumps", instructions: "Are there any hard lumps?", instructionsHi: "Kya koi hard lump nahi hai?", requireImage: false, sortOrder: 16 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Pattern & Fit",
              titleHi: "पैटर्न और फिट (Pattern & Fit)",
              sortOrder: 3,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Panel Alignment", nameHi: "Panel Alignment", instructions: "Are all panels properly aligned?", instructionsHi: "Kya saare panels sahi align hain?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Perforation Centered", nameHi: "Perforation Centered", instructions: "Is the perforation centered?", instructionsHi: "Kya perforation center mein hai?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "Quilting Centered", nameHi: "Quilting Centered", instructions: "Is the quilting centered?", instructionsHi: "Kya quilting center mein hai?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "Left/Right Match", nameHi: "Left/Right Match", instructions: "Are the left and right pieces correctly matched?", instructionsHi: "Kya left aur right piece sahi match ho rahe hain?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "Headrest Openings", nameHi: "Headrest Openings", instructions: "Are the headrest openings correct?", instructionsHi: "Kya headrest openings sahi hain?", requireImage: false, sortOrder: 5 },
                  { factoryId: factory.id, name: "Seat Belt Openings", nameHi: "Seat Belt Openings", instructions: "Are the seat belt openings correct?", instructionsHi: "Kya seat belt openings sahi hain?", requireImage: false, sortOrder: 6 },
                  { factoryId: factory.id, name: "Airbag Stitch", nameHi: "Airbag Stitch", instructions: "Is the airbag stitch correct (if applicable)?", instructionsHi: "Kya airbag stitch sahi hai? (Agar applicable ho)", requireImage: false, sortOrder: 7 },
                  { factoryId: factory.id, name: "Bucket Wires", nameHi: "Bucket Wires", instructions: "Are all bucket wires attached securely and in the correct position?", instructionsHi: "Kya saare bucket wires sahi tarike se lage hue hain?", requireImage: false, sortOrder: 8 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Accessories & Branding",
              titleHi: "सहायक उपकरण और ब्रांडिंग (Accessories & Branding)",
              sortOrder: 4,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Headrests Present", nameHi: "Headrests Present", instructions: "Are all headrests included?", instructionsHi: "Kya saare headrests hain?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Armrest Cover", nameHi: "Armrest Cover", instructions: "Is the armrest cover included?", instructionsHi: "Kya armrest cover hai?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "Console Cover", nameHi: "Console Cover", instructions: "Is the console cover included?", instructionsHi: "Kya console cover hai?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "Hooks Included", nameHi: "Hooks Included", instructions: "Are all hooks included?", instructionsHi: "Kya saare hooks hain?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "Elastic Straps", nameHi: "Elastic Straps", instructions: "Are all elastic straps included?", instructionsHi: "Kya saare elastic straps hain?", requireImage: false, sortOrder: 5 },
                  { factoryId: factory.id, name: "Velcro Present", nameHi: "Velcro Present", instructions: "Is Velcro present?", instructionsHi: "Kya velcro laga hua hai?", requireImage: false, sortOrder: 6 },
                  { factoryId: factory.id, name: "Installation Kit", nameHi: "Installation Kit", instructions: "Is the installation kit complete?", instructionsHi: "Kya installation kit complete hai?", requireImage: false, sortOrder: 7 },
                  { factoryId: factory.id, name: "Carxen Label", nameHi: "Carxen Label", instructions: "Is the Carxen label stitched correctly?", instructionsHi: "Kya Carxen label sahi stitch hua hai?", requireImage: false, sortOrder: 8 },
                  { factoryId: factory.id, name: "Brand Tag", nameHi: "Brand Tag", instructions: "Is the brand tag straight?", instructionsHi: "Kya brand tag seedha hai?", requireImage: false, sortOrder: 9 },
                  { factoryId: factory.id, name: "QR Code", nameHi: "QR Code", instructions: "Is the QR code attached?", instructionsHi: "Kya QR code laga hua hai?", requireImage: false, sortOrder: 10 },
                  { factoryId: factory.id, name: "Warranty Card", nameHi: "Warranty Card", instructions: "Is the warranty card included?", instructionsHi: "Kya warranty card hai?", requireImage: false, sortOrder: 11 },
                  { factoryId: factory.id, name: "Installation Guide", nameHi: "Installation Guide", instructions: "Is the installation guide included?", instructionsHi: "Kya installation guide hai?", requireImage: false, sortOrder: 12 },
                  { factoryId: factory.id, name: "Brand Leaflet", nameHi: "Brand Leaflet", instructions: "Is the brand leaflet included?", instructionsHi: "Kya brand leaflet hai?", requireImage: false, sortOrder: 13 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Cleaning & Packing",
              titleHi: "सफाई और पैकिंग (Cleaning & Packing)",
              sortOrder: 5,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Extra Thread Trimmed", nameHi: "Extra Thread Trimmed", instructions: "Has thread trimming been completed?", instructionsHi: "Kya extra dhage kaat diye gaye hain?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Dust Free", nameHi: "Dust Free", instructions: "Is the product free from dust?", instructionsHi: "Kya product dust free hai?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "Fingerprints", nameHi: "Fingerprints", instructions: "Is it free from fingerprints?", instructionsHi: "Kya fingerprints nahi hain?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "Vacuum Cleaned", nameHi: "Vacuum Cleaned", instructions: "Has the product been vacuum cleaned?", instructionsHi: "Kya product vacuum clean kiya gaya hai?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "Surface Clean", nameHi: "Surface Clean", instructions: "Has the surface been wiped clean?", instructionsHi: "Kya surface clean hai?", requireImage: false, sortOrder: 5 },
                  { factoryId: factory.id, name: "Folded Correctly", nameHi: "Folded Correctly", instructions: "Is the product folded correctly?", instructionsHi: "Kya product sahi fold kiya gaya hai?", requireImage: false, sortOrder: 6 },
                  { factoryId: factory.id, name: "Excessive Creases", nameHi: "Excessive Creases", instructions: "Are there no excessive creases?", instructionsHi: "Kya zyada creases nahi hain?", requireImage: false, sortOrder: 7 },
                  { factoryId: factory.id, name: "Barcode Sticker", nameHi: "Barcode Sticker", instructions: "Is the barcode sticker correct?", instructionsHi: "Kya barcode sticker sahi hai?", requireImage: false, sortOrder: 8 },
                  { factoryId: factory.id, name: "Order Label", nameHi: "Order Label", instructions: "Is the order label correct?", instructionsHi: "Kya order label sahi hai?", requireImage: false, sortOrder: 9 },
                  { factoryId: factory.id, name: "Dispatch Label", nameHi: "Dispatch Label", instructions: "Is the dispatch label correct?", instructionsHi: "Kya dispatch label sahi hai?", requireImage: false, sortOrder: 10 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Camera Verification",
              titleHi: "कैमरा सत्यापन (Camera Verification)",
              sortOrder: 6,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Order Label", nameHi: "Order Label", instructions: "Order label shown", instructionsHi: "Order label camera ko dikhayein", requireImage: true, sortOrder: 1 },
                  { factoryId: factory.id, name: "Front Seat Pieces", nameHi: "Front Seat Pieces", instructions: "Front seat pieces shown", instructionsHi: "Front seat pieces dikhayein", requireImage: true, sortOrder: 2 },
                  { factoryId: factory.id, name: "Rear Seat Pieces", nameHi: "Rear Seat Pieces", instructions: "Rear seat pieces shown", instructionsHi: "Rear seat pieces dikhayein", requireImage: true, sortOrder: 3 },
                  { factoryId: factory.id, name: "Headrests", nameHi: "Headrests", instructions: "Headrests shown", instructionsHi: "Headrests dikhayein", requireImage: true, sortOrder: 4 },
                  { factoryId: factory.id, name: "Armrest Cover", nameHi: "Armrest Cover", instructions: "Armrest cover shown", instructionsHi: "Armrest cover dikhayein", requireImage: true, sortOrder: 5 },
                  { factoryId: factory.id, name: "Accessories Kit", nameHi: "Accessories Kit", instructions: "Accessories kit shown", instructionsHi: "Accessories kit dikhayein", requireImage: true, sortOrder: 6 },
                  { factoryId: factory.id, name: "Warranty Card", nameHi: "Warranty Card", instructions: "Warranty card shown", instructionsHi: "Warranty card dikhayein", requireImage: true, sortOrder: 7 },
                  { factoryId: factory.id, name: "QR Sticker", nameHi: "QR Sticker", instructions: "QR sticker shown", instructionsHi: "QR sticker dikhayein", requireImage: true, sortOrder: 8 },
                  { factoryId: factory.id, name: "Folded Product", nameHi: "Folded Product", instructions: "Folded packed product shown", instructionsHi: "Fold kiya hua product dikhayein", requireImage: true, sortOrder: 9 },
                  { factoryId: factory.id, name: "Final Sealed Package", nameHi: "Final Sealed Package", instructions: "Final sealed package shown", instructionsHi: "Final sealed package dikhayein", requireImage: true, sortOrder: 10 },
                ]
              }
            },
            {
              factoryId: factory.id,
              title: "Final Approval",
              titleHi: "अंतिम स्वीकृति (Final Approval)",
              sortOrder: 7,
              checkpoints: {
                create: [
                  { factoryId: factory.id, name: "Quantity", nameHi: "Quantity", instructions: "Is the quantity correct?", instructionsHi: "Kya quantity sahi hai?", requireImage: false, sortOrder: 1 },
                  { factoryId: factory.id, name: "Photos Captured", nameHi: "Photos Captured", instructions: "Have product photos been captured?", instructionsHi: "Kya product ki photos le li gayi hain?", requireImage: false, sortOrder: 2 },
                  { factoryId: factory.id, name: "QC Pass", nameHi: "QC Pass", instructions: "Has the product passed QC?", instructionsHi: "Kya QC pass hua?", requireImage: false, sortOrder: 3 },
                  { factoryId: factory.id, name: "QR Generated", nameHi: "QR Generated", instructions: "Has the QR code been generated?", instructionsHi: "Kya QR generate ho gaya?", requireImage: false, sortOrder: 4 },
                  { factoryId: factory.id, name: "QC Sticker", nameHi: "QC Sticker", instructions: "Has the QC sticker been applied?", instructionsHi: "Kya QC sticker lag gaya?", requireImage: false, sortOrder: 5 },
                  { factoryId: factory.id, name: "Packer Signed", nameHi: "Packer Signed", instructions: "Has the packer signed?", instructionsHi: "Kya packer ne sign kiya?", requireImage: false, sortOrder: 6 },
                  { factoryId: factory.id, name: "Inspector Signed", nameHi: "Inspector Signed", instructions: "Has the QC inspector signed?", instructionsHi: "Kya QC inspector ne sign kiya?", requireImage: false, sortOrder: 7 },
                  { factoryId: factory.id, name: "Date & Time Recorded", nameHi: "Date & Time Recorded", instructions: "Have the date and time been recorded?", instructionsHi: "Kya date aur time record ho gaya?", requireImage: false, sortOrder: 8 },
                ]
              }
            }
          ]
        }
      }
    });
    console.log(`Created comprehensive template for ${factory.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
