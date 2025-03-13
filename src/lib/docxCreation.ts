import { UserData } from "@/store/authStore";
import { Customer } from "@/store/customerStore";
import { Enquiry } from "@/store/enquiryStore";

import {
  Document,
  Paragraph,
  ImageRun,
  Packer,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  PageBreak,
  SectionType,
  IBordersOptions,
} from "docx";

function convertRichTextToDocx(htmlString: string, indent = 0) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const elements = doc.body.childNodes;
  const paragraphs: Paragraph[] = [];

  elements.forEach((element) => {
    if (element.nodeName === "P") {
      paragraphs.push(
        new Paragraph({
          indent: {
            left: indent,
          },
          children: [new TextRun({ text: element.textContent?.trim() ?? "" })],
          spacing: {
            after: 100,
          },
        })
      );
    } else if (element.nodeName === "UL" || element.nodeName === "OL") {
      element.childNodes.forEach((li) => {
        if (li.nodeName === "LI") {
          paragraphs.push(
            new Paragraph({
              indent: {
                left: indent,
              },
              text: `• ${li.textContent?.trim() ?? ""}`,
              spacing: {
                after: 100,
              },
            })
          );
        }
      });
    }
  });

  return paragraphs;
}

function breakLineBy(text: string, delimiter: string) {
  return text.split(delimiter).map((line) => line.trim());
}

function tableCell(text: string, bold: boolean = false) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });
}

function titleAndValue(title: string, value: string | string[], indent = 0) {
  const isValueArray = Array.isArray(value);

  return [
    new Paragraph({
      indent: {
        left: indent,
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          underline: { color: "000000" },
        }),
      ],
      spacing: {
        after: 100,
      },
    }),
    ...(isValueArray
      ? value.map(
          (item) =>
            new Paragraph({
              indent: {
                left: indent,
              },
              children: [new TextRun({ text: "• " + item, bold: false })],
              spacing: {
                after: 100,
              },
            })
        )
      : [
          new Paragraph({
            indent: {
              left: indent,
            },
            children: [new TextRun({ text: value, bold: false })],
            spacing: {
              after: 100,
            },
          }),
        ]),
  ];
}

export const createQuotation = async (
  enquiry: Enquiry,
  userData: UserData,
  customer: Customer
) => {
  try {
    // Load image dynamically from public folder
    const imageUrl = "/images/doc/doc-header.png";
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer(); // Convert image to ArrayBuffer
    const formatedDate = new Date(enquiry.createdAt).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
    const address = breakLineBy(customer.address, ",");
    const totalDuration = enquiry.deliverables.reduce(
      (acc, deliverable) => acc + (deliverable.hours ?? 0),
      0
    );
    const totalAmount = enquiry.deliverables.reduce(
      (acc, deliverable) =>
        acc + (deliverable.costPerHour ?? 0) * (deliverable.hours ?? 0),
      0
    );

    const borderHidden: IBordersOptions = {
      top: {
        size: 0,
        style: "none",
      },
      bottom: {
        size: 0,
        style: "none",
      },
      left: {
        size: 0,
        style: "none",
      },
      right: {
        size: 0,
        style: "none",
      },
    };

    // Create document with header image
    const doc = new Document({
      sections: [
        {
          properties: {
            type: SectionType.CONTINUOUS,
            page: {
              margin: {
                top: 720, // 1 inch
                right: 720, // 1 inch
                bottom: 720, // 1 inch
                left: 720, // 1 inch
              },
            },
          },
          children: [
            // header image
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  type: "png",
                  transformation: {
                    width: 700,
                    height: 150,
                  },
                }),
              ],
              spacing: {
                after: 120,
              },
            }),

            // address and data
            new Table({
              width: { size: "100%", type: WidthType.PERCENTAGE },
              layout: "autofit",
              columnWidths: [50, 50],
              borders: borderHidden,
              rows: [
                new TableRow({
                  height: { value: "4cm", rule: "exact" },
                  cantSplit: true,
                  children: [
                    new TableCell({
                      borders: borderHidden,
                      children: [
                        new Paragraph({
                          text: "ShipTech-ICON,",
                          alignment: "left",
                        }),
                        new Paragraph({
                          text: "CITTIC, CUSAT TBI",
                          alignment: "left",
                        }),
                        new Paragraph({
                          text: "CUSAT, Kochi-22",
                          alignment: "left",
                        }),
                      ],
                    }),
                    new TableCell({
                      borders: borderHidden,
                      children: [
                        new Paragraph({
                          text: `Ref: No: E513/QT/0124/01`,
                          alignment: "right",
                        }),
                        new Paragraph({
                          alignment: "right",
                          children: [
                            new TextRun({
                              text: `Date: ${formatedDate}`,
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // to
            new Paragraph({
              spacing: {
                before: 200,
              },
              children: [
                new TextRun({
                  text: "To,",
                  bold: true,
                }),
              ],
            }),

            // address lines
            ...address.map(
              (line) =>
                new Paragraph({
                  indent: {
                    left: 600,
                  },
                  children: [
                    new TextRun({
                      text: line,
                      bold: true,
                    }),
                  ],
                  spacing: {
                    after: 30,
                  },
                })
            ),

            //customer name
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: `Kind Attn: ${customer.name}`,
                }),
              ],
              spacing: {
                before: 400,
                after: 400,
              },
            }),

            // dear sir
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: "Dear Sir,",
                }),
              ],
              spacing: {
                before: 400,
                after: 400,
              },
            }),

            // subject
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: `Sub : ${enquiry.name}`,
                  bold: true,
                  underline: {
                    color: "000000",
                  },
                }),
              ],
              spacing: {
                before: 400,
              },
            }),

            // reference
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: `Ref : Enquiry through email dt 19/01/2024`,
                  bold: true,
                  underline: {
                    color: "000000",
                  },
                }),
              ],
              spacing: {
                after: 200,
              },
            }),

            // first table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [5, 50, 10, 10, 10, 15],
              rows: [
                new TableRow({
                  children: [
                    tableCell("No.", true),
                    tableCell("Description of Services", true),
                    tableCell("Rate", true),
                    tableCell("Qty", true),
                    tableCell(`Amount${" "}(${enquiry.currency?.name})`, true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("1", false),
                    tableCell(`${enquiry.name}`, false),
                    tableCell("", false),
                    tableCell("", false),
                    tableCell(
                      `${enquiry.currency?.symbol}${totalAmount}/-`,
                      false
                    ),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("", false),
                    tableCell(
                      `Total:- ${enquiry.currency?.symbol}${totalAmount} ${enquiry.currency?.name} only`,
                      true
                    ),
                    tableCell("", false),
                    tableCell("", false),
                    tableCell(
                      `${enquiry.currency?.symbol}${totalAmount}/-`,
                      true
                    ),
                  ],
                }),
              ],
            }),

            // terms and conditions
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: "TERMS & CONDITIONS",
                  bold: true,
                  underline: {
                    color: "000000",
                  },
                }),
              ],
              spacing: {
                after: 150,
                before : 150
              },
            }),

            ...titleAndValue("Charges Included", enquiry.charges, 600),
            ...titleAndValue(
              "Tax",
              "GST will be applicable extra as per existing rules (if any). ",
              600
            ),
            ...titleAndValue(
              "Payment Mode",
              "Direct transfer within Ten Working days from the date of invoice, in favor of SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY as mentioned below",
              600
            ),

            new Paragraph({
              spacing : {
                after : 100,
                before : 100
              }
            }),
            
            // bank details
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    tableCell("A/c name: ", true),
                    tableCell("SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY", true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("Branch:  ", true),
                    tableCell("SBI CUSAT", true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("A/c no: ", true),
                    tableCell("36215018475", true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("IFSC: ", true),
                    tableCell("SBIN0070235", true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("SWIFT Code: ", true),
                    tableCell("SBININBBT30", true),
                  ],
                }),
                new TableRow({
                  children: [
                    tableCell("GST: ", true),
                    tableCell("32ADBFS1296G1Z8", true),
                  ],
                }),
              ],
            }),

            //deliverables
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: "Deliverables",
                  bold: true,
                  underline: { color: "000000" },
                }),
              ],
              spacing: {
                after: 100,
                before : 100
              },
            }),
            ...convertRichTextToDocx(enquiry.scopeOfWork, 600), //scoper of work is deliverables

            //scope of work
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: "Scope of work",
                  bold: true,
                  underline: { color: "000000" },
                }),
              ],
              spacing: {
                after: 100,
              },
            }),
            ...enquiry.deliverables
              .map((d) => [
                new Paragraph({
                  indent: {
                    left: 600,
                  },
                  children: [
                    new TextRun({
                      text: `○ ${d.name}`,
                    }),
                  ],
                }),
                ...convertRichTextToDocx(d.description as string, 1000),
              ])
              .flat(),

            ...titleAndValue(
              "Modifications",
              "Slight modifications if any can be incorporated without any additional charges.  However major modifications or design changes if any will be charged extra. ",
              600
            ),
            ...titleAndValue(
              "Force Majeure",
              "Will apply, especially with respect to the current pandemic situation.",
              600
            ),
            ...titleAndValue(
              "Validity",
              "This offer is valid for a period of 5 days from today.",
              600
            ),

            // tankyou
            new Paragraph({
              spacing : {
                before : 250
              },
              text: "Thanking you,",
            }),

            // fullname
            new Paragraph({
              children: [
                new TextRun({
                  text: `${userData.fullName}`,
                  bold: true,
                }),
              ],
            }),

            //use designation
            new Paragraph({
              children: [
                new TextRun({
                  text: `${userData.designation ?? "User"}`,
                  bold: true,
                }),
              ],
            }),

            // company info
            new Paragraph({
              children: [
                new TextRun({
                  text: "ShipTech-ICON",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "CITTIC, CUSAT TBI",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "CUSAT, Kochi-22",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Email: stl@shiptech-icon.com",
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Web: http://www.shiptech-icon.com ",
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Generate DOCX file as a Blob (not nodebuffer)
    const blob = await Packer.toBlob(doc);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${enquiry.name} quotation.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error creating DOCX file:", error);
    throw error;
  }
};
