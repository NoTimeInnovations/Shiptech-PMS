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
            left: indent + indent,
          },
          children: [
            new TextRun({ text: element.textContent?.trim() ?? "", size: 24 }),
          ],
          spacing: {
            after: 200,
            before: 200,
          },
        })
      );
    } else if (element.nodeName === "UL" || element.nodeName === "OL") {
      element.childNodes.forEach((li) => {
        if (li.nodeName === "LI") {
          paragraphs.push(
            new Paragraph({
              indent: {
                left: indent + indent,
              },
              children: [
                new TextRun({
                  text: `○ ${li.textContent?.trim() ?? ""}`,
                  size: 24,
                }),
              ],
              spacing: {
                after: 200,
                before: 200,
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

function tableCell(
  text: string,
  bold: boolean = false,
  isHeader: boolean = false,
  fontSize: number = 22
) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: fontSize })],
        spacing: {
          before: 100,
          after: 100,
        },
        alignment: "center",
      }),
    ],
    shading: isHeader
      ? {
          fill: "9ACCFF", // Set your desired background color here (e.g., light green)
        }
      : undefined, // No shading for non-header cells
  });
}

function addSpace(space: number) {
  return new Paragraph({
    spacing: {
      before: space,
      after: space,
    },
  });
}

function Text(text: string, bold = false, size = 24, indext = 600) {
  return new Paragraph({
    indent: {
      left: indext,
    },
    children: [
      new TextRun({
        text,
        bold,
        size,
      }),
    ],
    spacing: {
      after: 100,
      before: 200,
    },
  });
}

function Title(title: string, indent = 400) {
  return new Paragraph({
    indent: {
      left: indent,
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        underline: { color: "000000" },
        size: 24,
      }),
    ],
    spacing: {
      after: 100,
      before: 200,
    },
  });
}

function titleAndValue(title: string, value: string | string[], indent = 400) {
  const isValueArray = Array.isArray(value);
  // console.log(`value of ${title}`,value)

  return [
    Title(title, indent),
    ...(isValueArray
      ? value.map(
          (item) =>
            new Paragraph({
              indent: {
                left: indent + indent,
              },
              children: [
                new TextRun({ text: "• " + item, bold: false, size: 24 }),
              ],
              spacing: {
                after: 100,
                before: 200,
              },
            })
        )
      : [
          new Paragraph({
            indent: {
              left: indent + indent,
            },
            children: [new TextRun({ text: value, bold: false, size: 24 })],
            spacing: {
              after: 100,
              before: 200,
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
                          children: [
                            new TextRun({
                              text: "ShipTech-ICON,",
                              size: 24, // Increase font size
                            }),
                          ],
                          alignment: "left",
                          spacing: { after: 0 }, // Remove spacing after to avoid vertical line
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "CITTIC, CUSAT TBI",
                              size: 24, // Increase font size
                            }),
                          ],
                          alignment: "left",
                          spacing: { after: 0 }, // Remove spacing after to avoid vertical line
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "CUSAT, Kochi-22",
                              size: 24, // Increase font size
                            }),
                          ],
                          alignment: "left",
                          spacing: { after: 0 }, // Remove spacing after to avoid vertical line
                        }),
                        new Paragraph({
                          spacing: {
                            before: 200,
                          },
                          children: [
                            new TextRun({
                              text: `Ref: No: E-${enquiry.enquiryNumber}`,
                              size: 24, // Increase font size
                            }),
                          ],
                          alignment: "left",
                        }),
                        new Paragraph({
                          alignment: "left",
                          children: [
                            new TextRun({
                              text: `Date: ${formatedDate}`,
                              bold: true,
                              size: 24, // Increase font size
                            }),
                          ],
                          spacing: { after: 0 }, // Remove spacing after to avoid vertical line
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
                  size: 24,
                }),
              ],
            }),

            // address lines

            new Paragraph({
              indent: {
                left: 600,
              },
              spacing: {
                before: 200,
              },
              children: [
                new TextRun({
                  text: `${customer.name},`,
                  bold: true,
                  size: 24,
                }),
              ],
            }),

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
                      size: 24,
                    }),
                  ],
                  spacing: {
                    after: 30,
                  },
                })
            ),


    new Paragraph({
              indent: {
                left: 600,
              },
              spacing: {
                before: 200,
              },
              children: [
                new TextRun({
                  text: customer.gstNumber ? `GST: ${customer.gstNumber}` : "",
                  bold: true,
                  size: 24,
                }),
              ],
            }),


            //customer name
            new Paragraph({
              indent: {
                left: 600,
              },
              children: [
                new TextRun({
                  text: `Kind Attn: ${customer.contactPersons[0].name}`,
                  size: 24,
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
                  size: 24,
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
                  size: 24,
                }),
              ],
              spacing: {
                before: 400,
                after: 100,
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
                  size: 24,
                }),
              ],
              spacing: {
                after: 500,
              },
            }),

            // first table
            new Table({
              width: {
                size: "100%",
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [5, 50, 10, 10, 10, 15],
              rows: [
                new TableRow({
                  children: [
                    tableCell("No.", true, true),
                    tableCell("Description of Services", true, true),
                    tableCell("Rate", true, true),
                    tableCell("Qty", true, true),
                    tableCell(
                      `Amount${" "}(${enquiry.currency?.name})`,
                      true,
                      true
                    ),
                  ],
                }),
                ...enquiry.deliverables
                  .map((deliverable) => [
                    new TableRow({
                      children: [
                        tableCell(
                          `${enquiry.deliverables.indexOf(deliverable) + 1}`,
                          false
                        ),
                        tableCell(deliverable.name, false),
                        tableCell(
                          `${enquiry.currency?.symbol}${deliverable.costPerHour}/-`,
                          false
                        ),
                        tableCell(`${deliverable.hours}`, false),
                        tableCell(
                          `${enquiry.currency?.symbol}${
                            (deliverable.costPerHour ?? 0) *
                            (deliverable.hours ?? 0)
                          }/-`,
                          false
                        ),
                      ],
                    }),
                  ])
                  .flat(),
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

            addSpace(200),

            // terms and conditions
            Title("Terms and Conditions"),

            //inputs required
            ...titleAndValue("Inputs Required", enquiry.inputsRequired),

            addSpace(200),

            //deliverables
            Title("Deliverables"),
            ...convertRichTextToDocx(enquiry.scopeOfWork, 600),

            addSpace(200),

            //scope of work
            Title("Scope of Work"),
            ...enquiry.deliverables.flatMap((d) => [
              new Paragraph({
                indent: {
                  left: 900,
                },
                children: [
                  new TextRun({
                    text: `• ${d.name}`,
                    size: 24,
                  }),
                ],
                spacing: {
                  after: 0,
                  before: 200,
                },
              }),
              ...convertRichTextToDocx(d.description as string, 600),
            ]),

            addSpace(200),

            //exclusions
            ...titleAndValue("Exclusions", enquiry.exclusions),

            addSpace(200),

            // DELIVERY SCHEDULE
            Title("Delivery Schedule"),
            addSpace(200),
            // delivery schedule table
            new Table({
              width: {
                size: "100%",
                type: WidthType.PERCENTAGE,
              },
              columnWidths: [5, 50, 10, 10, 10, 15],
              rows: [
                new TableRow({
                  children: [
                    tableCell("SL.NO.", true, true),
                    tableCell("SCOPE OF WORK", true, true),
                    tableCell("DURATION", true, true),
                  ],
                }),

                ...enquiry.deliverables.flatMap((deliverable, index) => [
                  new TableRow({
                    children: [
                      tableCell(`${index + 1}`, false),
                      tableCell(deliverable.name, false),
                      tableCell(`${deliverable.hours} hours`, false),
                    ],
                  }),
                ]),

                new TableRow({
                  children: [
                    tableCell("", false),
                    tableCell("Total Duration", true),
                    tableCell(`${totalDuration} hours`, true),
                  ],
                }),
              ],
            }),

            addSpace(200),

            ...titleAndValue("Charges Included", enquiry.charges),

            addSpace(200),

            ...titleAndValue(
              "Tax",
              "GST will be applicable extra as per existing rules (if any). "
            ),

            addSpace(200),

            ...titleAndValue(
              "Payment Mode",
              "Direct transfer within Ten Working days from the date of invoice, in favor of SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY as mentioned below"
            ),
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


            addSpace(200),

            ...titleAndValue(
              "Modifications",
              "Slight modifications if any can be incorporated without any additional charges.  However major modifications or design changes if any will be charged extra. "
            ),

            addSpace(200),

            ...titleAndValue(
              "Force Majeure",
              "Will apply, especially with respect to the current pandemic situation."
            ),

            addSpace(200),

            ...titleAndValue(
              "Validity",
              "This offer is valid for a period of 5 days from today."
            ),

            addSpace(400),

            // tankyou
            Text("Thanking you,"),
            Text(userData.fullName ?? "User", true),
            Text(userData.designation??'USER'),
            Text("SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY", true),
            Text("CITTIC, CUSAT TBI", true),
            Text("CUSAT, Kochi-22", true),
            Text(`Email: ${userData.email} `),
            Text("Web: http://www.shiptech-icon.com"),
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
